from contextlib import AsyncExitStack, asynccontextmanager
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse

from chromadb.config import Settings as ChromaSettings
from neo4j import GraphDatabase
import chromadb

from core.auth import (
    assert_safe_origin,
    clear_session_cookie,
    create_login_session,
    exchange_google_code,
    frontend_redirect_url,
    generate_api_key,
    get_optional_user,
    get_store,
    hash_api_key,
    hash_oauth_state,
    hash_session_token,
    oauth_authorization_url,
    public_user,
    require_api_key,
    require_user,
    set_store,
    split_csv,
    validate_security_configuration,
    verify_google_id_token,
)
from core.analysis_service import (
    analysis_payload,
    analysis_summary,
    background_task_scheduler,
    create_analysis_job_from_upload,
    enforce_read_limit,
    get_analysis_payload_for_user,
    list_analysis_summaries_for_user,
    submission_limit_specs,
)
from core.config import settings
from core.llm_client import llm_config_summary
from core.mcp_server import mcp_asgi_app, verischolar_mcp
from core.progress_manager import progress_manager
from core.storage import SQLiteStore


neo4j_driver = None
chroma_client = None
store = SQLiteStore(settings.app_db_path)


def docs_url() -> Optional[str]:
    if settings.enable_api_docs or settings.fastapi_env.lower() != "production":
        return "/docs"
    return None


def redoc_url() -> Optional[str]:
    if settings.enable_api_docs or settings.fastapi_env.lower() != "production":
        return "/redoc"
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_driver, chroma_client
    import asyncio

    validate_security_configuration()
    store.connect()
    set_store(store)
    store.mark_stale_processing_failed()
    store.cleanup_old_rate_limits()

    progress_manager.set_loop(asyncio.get_running_loop())
    neo4j_driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    chroma_client = chromadb.HttpClient(
        host=settings.chroma_host,
        port=settings.chroma_port,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    async with AsyncExitStack() as stack:
        if verischolar_mcp is not None:
            await stack.enter_async_context(verischolar_mcp.session_manager.run())
        yield
    if neo4j_driver:
        neo4j_driver.close()
    store.close()


app = FastAPI(
    title="VeriScholar API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=docs_url(),
    redoc_url=redoc_url(),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=split_csv(settings.allowed_cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "MCP-Protocol-Version", "Mcp-Session-Id"],
    expose_headers=["Mcp-Session-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

if mcp_asgi_app is not None:
    app.mount("/mcp", mcp_asgi_app)


def apply_headers(response: Response, headers: Dict[str, str]) -> None:
    for key, value in headers.items():
        response.headers[key] = value


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "neo4j": "connected" if neo4j_driver else "disconnected",
        "chroma": "connected" if chroma_client else "disconnected",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.openai_model if settings.llm_provider == "openai" else settings.ollama_model,
    }


@app.get("/config")
async def get_config(user: Dict[str, Any] = Depends(require_user)):
    return llm_config_summary(get_store().get_user_ai_settings(int(user["id"])))


def parse_ai_settings_payload(payload: Dict[str, Any]) -> Dict[str, Optional[str]]:
    endpoint = str(payload.get("endpoint") or "").strip().rstrip("/")
    model_name = str(payload.get("model_name") or "").strip()
    api_key_value = payload.get("api_key")
    api_key = str(api_key_value).strip() if api_key_value is not None else None

    if not endpoint:
        raise HTTPException(status_code=400, detail="Endpoint is required")
    if not model_name:
        raise HTTPException(status_code=400, detail="Model name is required")
    if len(endpoint) > 2000:
        raise HTTPException(status_code=400, detail="Endpoint is too long")
    if len(model_name) > 200:
        raise HTTPException(status_code=400, detail="Model name is too long")
    if api_key is not None and len(api_key) > 4000:
        raise HTTPException(status_code=400, detail="API key is too long")

    parsed = urlparse(endpoint)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Endpoint must be an absolute HTTP(S) URL")

    return {
        "endpoint": endpoint,
        "model_name": model_name,
        "api_key": api_key or None,
    }


@app.get("/settings/ai")
async def get_ai_settings(user: Dict[str, Any] = Depends(require_user)):
    custom_settings = get_store().get_user_ai_settings(int(user["id"]))
    summary = llm_config_summary(custom_settings)
    summary["system_default"] = llm_config_summary(None)
    return summary


@app.put("/settings/ai")
async def update_ai_settings(
    request: Request,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_user),
):
    assert_safe_origin(request)
    parsed = parse_ai_settings_payload(payload)
    saved = get_store().upsert_user_ai_settings(
        user_id=int(user["id"]),
        endpoint=str(parsed["endpoint"]),
        model_name=str(parsed["model_name"]),
        api_key=parsed["api_key"],
    )
    summary = llm_config_summary(saved)
    summary["system_default"] = llm_config_summary(None)
    return summary


@app.delete("/settings/ai")
async def clear_ai_settings(
    request: Request,
    user: Dict[str, Any] = Depends(require_user),
):
    assert_safe_origin(request)
    get_store().clear_user_ai_settings(int(user["id"]))
    summary = llm_config_summary(None)
    summary["system_default"] = llm_config_summary(None)
    return summary


@app.delete("/account")
async def delete_account(
    request: Request,
    response: Response,
    user: Dict[str, Any] = Depends(require_user),
):
    assert_safe_origin(request)
    user_id = int(user["id"])
    active_count = get_store().count_active_analyses(user_id)
    if active_count:
        raise HTTPException(
            status_code=409,
            detail="Wait for active analyses to finish before deleting account data",
        )

    analysis_ids = get_store().list_analysis_ids_for_user(user_id)
    try:
        from ingestion.embeddings import delete_claim_embeddings_for_docs

        vector_documents = delete_claim_embeddings_for_docs(analysis_ids)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not remove vector data. Please try again.",
        ) from exc

    progress_manager.forget_many(analysis_ids)
    deleted = get_store().delete_user_account(user_id)
    deleted["vector_documents"] = vector_documents
    clear_session_cookie(response)
    return {"ok": True, "deleted": deleted}


@app.get("/auth/google/start")
async def google_start(next: str = "/dashboard"):
    return RedirectResponse(oauth_authorization_url(next))


@app.get("/auth/google/callback")
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing Google OAuth code or state")

    oauth_state = get_store().consume_oauth_state(hash_oauth_state(state))
    if not oauth_state:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    token_response = await exchange_google_code(code)
    id_token_value = token_response.get("id_token")
    if not id_token_value:
        raise HTTPException(status_code=401, detail="Google did not return an ID token")

    claims = verify_google_id_token(id_token_value, expected_nonce=oauth_state["nonce"])
    user = get_store().create_or_update_user(claims)

    response = RedirectResponse(frontend_redirect_url(oauth_state["redirect_path"]))
    create_login_session(response, request, int(user["id"]))
    return response


@app.get("/auth/me")
async def auth_me(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    if not user:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": public_user(user)}


@app.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    assert_safe_origin(request)
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        get_store().revoke_session(hash_session_token(token))
    clear_session_cookie(response)
    return {"ok": True}


@app.get("/dashboard/summary")
async def dashboard_summary(user: Dict[str, Any] = Depends(require_user)):
    user_id = int(user["id"])
    analyses = [analysis_summary(row) for row in get_store().list_analyses_for_user(user_id, limit=10)]
    usage = get_store().usage_summary(user_id)
    usage["limits"] = {
        "analysis_per_day": settings.rate_limit_analysis_per_day,
        "analysis_per_hour": settings.rate_limit_analysis_per_hour,
        "reads_per_minute": settings.rate_limit_reads_per_minute,
        "active_analyses": settings.rate_limit_active_analyses_per_user,
        "active_api_keys": settings.max_active_api_keys_per_user,
    }
    usage["quota_windows"] = get_store().limit_status(f"user:{user_id}", submission_limit_specs())
    return {"user": public_user(user), "usage": usage, "recent_analyses": analyses}


@app.get("/dashboard/api-keys")
async def list_dashboard_api_keys(user: Dict[str, Any] = Depends(require_user)):
    return {"api_keys": get_store().list_api_keys(int(user["id"]))}


@app.post("/dashboard/api-keys")
async def create_dashboard_api_key(
    request: Request,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_user),
):
    assert_safe_origin(request)
    user_id = int(user["id"])
    if get_store().count_active_api_keys(user_id) >= settings.max_active_api_keys_per_user:
        raise HTTPException(status_code=429, detail="Maximum active API key limit reached")

    name = str(payload.get("name") or "Default key").strip()[:80] or "Default key"
    raw_key = generate_api_key()
    created = get_store().create_api_key(
        user_id=user_id,
        name=name,
        prefix=raw_key[:18],
        key_hash=hash_api_key(raw_key),
    )
    return {"api_key": created, "secret": raw_key}


@app.delete("/dashboard/api-keys/{key_id}")
async def revoke_dashboard_api_key(
    key_id: int,
    request: Request,
    user: Dict[str, Any] = Depends(require_user),
):
    assert_safe_origin(request)
    revoked = get_store().revoke_api_key(int(user["id"]), key_id)
    if not revoked:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"ok": True}


@app.get("/history")
async def get_history(user: Dict[str, Any] = Depends(require_user)):
    rows = get_store().list_analyses_for_user(int(user["id"]), limit=50)
    return {"history": [analysis_summary(row) for row in rows]}


@app.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str, user: Dict[str, Any] = Depends(require_user)):
    record = get_store().get_analysis_for_user(int(user["id"]), analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_payload(record)


@app.post("/analyze")
async def analyze_document(
    background_tasks: BackgroundTasks,
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(require_user),
):
    assert_safe_origin(request)
    submission = await create_analysis_job_from_upload(
        file=file,
        owner_user_id=int(user["id"]),
        api_key_id=None,
        source="dashboard",
        rate_subject=f"user:{user['id']}",
        schedule_pipeline=background_task_scheduler(background_tasks),
    )
    apply_headers(response, submission.headers)
    return submission.payload


@app.get("/events/{analysis_id}")
async def events_endpoint(analysis_id: str, user: Dict[str, Any] = Depends(require_user)):
    record = get_store().get_analysis_for_user(int(user["id"]), analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return StreamingResponse(event_generator(analysis_id), media_type="text/event-stream")


@app.post("/v1/analyses")
async def v1_create_analysis(
    background_tasks: BackgroundTasks,
    response: Response,
    file: UploadFile = File(...),
    api_context: Dict[str, Any] = Depends(require_api_key),
):
    submission = await create_analysis_job_from_upload(
        file=file,
        owner_user_id=int(api_context["user_id"]),
        api_key_id=int(api_context["api_key_id"]),
        source="api",
        rate_subject=f"api_key:{api_context['api_key_id']}",
        schedule_pipeline=background_task_scheduler(background_tasks),
    )
    apply_headers(response, submission.headers)
    return JSONResponse(content=submission.payload, status_code=202, headers=dict(response.headers))


@app.get("/v1/analyses")
async def v1_list_analyses(
    response: Response,
    api_context: Dict[str, Any] = Depends(require_api_key),
):
    headers = enforce_read_limit(int(api_context["api_key_id"]))
    apply_headers(response, headers)
    return {"analyses": list_analysis_summaries_for_user(int(api_context["user_id"]), limit=50)}


@app.get("/v1/analyses/{analysis_id}/events")
async def v1_events_endpoint(
    analysis_id: str,
    response: Response,
    api_context: Dict[str, Any] = Depends(require_api_key),
):
    headers = enforce_read_limit(int(api_context["api_key_id"]))
    apply_headers(response, headers)
    record = get_store().get_analysis_for_user(int(api_context["user_id"]), analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return StreamingResponse(event_generator(analysis_id), media_type="text/event-stream", headers=headers)


@app.get("/v1/analyses/{analysis_id}")
async def v1_get_analysis(
    analysis_id: str,
    response: Response,
    api_context: Dict[str, Any] = Depends(require_api_key),
):
    headers = enforce_read_limit(int(api_context["api_key_id"]))
    apply_headers(response, headers)
    return get_analysis_payload_for_user(int(api_context["user_id"]), analysis_id)


async def event_generator(analysis_id: str):
    import asyncio

    logs = get_store().list_analysis_logs(analysis_id)
    for log in logs:
        yield f"data: {log}\n\n"

    record = get_store().get_analysis(analysis_id)
    status_value = record.get("status", "processing") if record else "failed"

    if status_value == "processing":
        q = progress_manager.register_queue(analysis_id)
        try:
            while True:
                msg = await q.get()
                yield f"data: {msg}\n\n"
                if "Complete!" in msg or "Error during analysis" in msg:
                    break
        except asyncio.CancelledError:
            pass
        finally:
            progress_manager.unregister_queue(analysis_id, q)
    elif status_value == "failed":
        error = record.get("error", "Unknown error") if record else "Unknown error"
        if not any("Error during analysis" in log for log in logs):
            yield f"data: ❌ Error during analysis: {error}\n\n"
    elif not any("Complete!" in log for log in logs):
        yield "data: 🏁 Complete!\n\n"
