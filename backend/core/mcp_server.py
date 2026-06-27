from typing import Any, Dict, Optional

from fastapi import HTTPException

from core.analysis_service import (
    create_analysis_job_from_bytes,
    decode_base64_document,
    enforce_read_limit,
    get_analysis_events_for_user,
    get_analysis_payload_for_user,
    list_analysis_summaries_for_user,
    schedule_pipeline_in_thread,
    wait_for_analysis_events_for_user,
)
from core.auth import api_context_from_access_claims, split_csv, verify_api_key
from core.config import settings

try:
    from mcp.server.auth.middleware.auth_context import get_access_token
    from mcp.server.auth.provider import AccessToken
    from mcp.server.auth.settings import AuthSettings
    from mcp.server.fastmcp import FastMCP
    from mcp.server.transport_security import TransportSecuritySettings
except ImportError as exc:  # pragma: no cover - exercised only when optional dependency is absent.
    MCP_IMPORT_ERROR: Optional[ImportError] = exc
    get_access_token = None  # type: ignore[assignment]
    AccessToken = None  # type: ignore[assignment]
    AuthSettings = None  # type: ignore[assignment]
    FastMCP = None  # type: ignore[assignment]
    TransportSecuritySettings = None  # type: ignore[assignment]
else:
    MCP_IMPORT_ERROR = None


MCP_SCOPE = "verischolar"


class VeriScholarMCPTokenVerifier:
    async def verify_token(self, token: str):
        if AccessToken is None:
            return None

        key_context = verify_api_key(token)
        if not key_context:
            return None

        api_key_id = int(key_context["api_key_id"])
        user_id = int(key_context["user_id"])
        return AccessToken(
            token=token,
            client_id=f"api_key:{api_key_id}",
            scopes=[MCP_SCOPE],
            subject=str(user_id),
            claims={
                "api_key_id": api_key_id,
                "user_id": user_id,
                "email": key_context.get("email"),
                "api_key_name": key_context.get("api_key_name"),
            },
        )


def current_mcp_api_context() -> Dict[str, Any]:
    if get_access_token is None:
        raise RuntimeError("MCP support is not installed")

    access_token = get_access_token()
    if not access_token:
        raise HTTPException(status_code=401, detail="MCP API key required")
    return api_context_from_access_claims(access_token.claims)


async def submit_analysis_for_api_context(
    api_context: Dict[str, Any],
    filename: str,
    content_base64: str,
    mime_type: Optional[str] = None,
    schedule_pipeline=schedule_pipeline_in_thread,
) -> Dict[str, Any]:
    content = decode_base64_document(content_base64)
    submission = create_analysis_job_from_bytes(
        filename=filename,
        content=content,
        owner_user_id=int(api_context["user_id"]),
        api_key_id=int(api_context["api_key_id"]),
        source="mcp",
        rate_subject=f"api_key:{api_context['api_key_id']}",
        schedule_pipeline=schedule_pipeline,
        mime_type=mime_type,
    )
    return submission.payload


def list_analyses_for_api_context(api_context: Dict[str, Any]) -> Dict[str, Any]:
    enforce_read_limit(int(api_context["api_key_id"]))
    return {"analyses": list_analysis_summaries_for_user(int(api_context["user_id"]), limit=50)}


def get_analysis_for_api_context(api_context: Dict[str, Any], analysis_id: str) -> Dict[str, Any]:
    enforce_read_limit(int(api_context["api_key_id"]))
    return get_analysis_payload_for_user(int(api_context["user_id"]), analysis_id)


def get_analysis_events_for_api_context(
    api_context: Dict[str, Any],
    analysis_id: str,
    after_index: int = 0,
) -> Dict[str, Any]:
    enforce_read_limit(int(api_context["api_key_id"]))
    return get_analysis_events_for_user(int(api_context["user_id"]), analysis_id, after_index=after_index)


async def wait_for_analysis_for_api_context(
    api_context: Dict[str, Any],
    analysis_id: str,
    timeout_seconds: float = 30.0,
    after_index: int = 0,
) -> Dict[str, Any]:
    enforce_read_limit(int(api_context["api_key_id"]))
    result = await wait_for_analysis_events_for_user(
        int(api_context["user_id"]),
        analysis_id,
        after_index=after_index,
        timeout_seconds=timeout_seconds,
    )
    if result["status"] != "processing":
        result["analysis"] = get_analysis_payload_for_user(int(api_context["user_id"]), analysis_id)
    return result


def build_mcp_server():
    if FastMCP is None or AuthSettings is None or TransportSecuritySettings is None:
        if settings.fastapi_env.lower() == "production":
            raise RuntimeError("MCP support requires the mcp package to be installed") from MCP_IMPORT_ERROR
        return None, None

    transport_security = TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=split_csv(settings.mcp_allowed_hosts),
        allowed_origins=split_csv(settings.allowed_cors_origins),
    )
    mcp = FastMCP(
        "VeriScholar",
        instructions=(
            "Use these tools to submit PDF or DOCX papers to VeriScholar, monitor progress, "
            "and retrieve integrity audit results. All tools are scoped to the authenticated API key owner."
        ),
        stateless_http=True,
        json_response=True,
        streamable_http_path="/",
        token_verifier=VeriScholarMCPTokenVerifier(),
        auth=AuthSettings(
            issuer_url=settings.frontend_base_url.rstrip("/"),
            resource_server_url=settings.mcp_server_url,
            required_scopes=[MCP_SCOPE],
        ),
        transport_security=transport_security,
    )

    @mcp.tool()
    async def verischolar_submit_analysis(
        filename: str,
        content_base64: str,
        mime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submit a PDF or DOCX document for asynchronous VeriScholar analysis."""
        return await submit_analysis_for_api_context(
            current_mcp_api_context(),
            filename=filename,
            content_base64=content_base64,
            mime_type=mime_type,
        )

    @mcp.tool()
    def verischolar_list_analyses() -> Dict[str, Any]:
        """List recent analyses owned by the authenticated API key user."""
        return list_analyses_for_api_context(current_mcp_api_context())

    @mcp.tool()
    def verischolar_get_analysis(analysis_id: str) -> Dict[str, Any]:
        """Fetch the status, score, and audit report for a single analysis."""
        return get_analysis_for_api_context(current_mcp_api_context(), analysis_id)

    @mcp.tool()
    def verischolar_get_analysis_events(analysis_id: str, after_index: int = 0) -> Dict[str, Any]:
        """Fetch stored progress events for an analysis from a zero-based event offset."""
        return get_analysis_events_for_api_context(current_mcp_api_context(), analysis_id, after_index=after_index)

    @mcp.tool()
    async def verischolar_wait_for_analysis(
        analysis_id: str,
        timeout_seconds: float = 30.0,
        after_index: int = 0,
    ) -> Dict[str, Any]:
        """Wait briefly for new progress events or completion, then return the latest status."""
        return await wait_for_analysis_for_api_context(
            current_mcp_api_context(),
            analysis_id=analysis_id,
            timeout_seconds=timeout_seconds,
            after_index=after_index,
        )

    return mcp, mcp.streamable_http_app()


verischolar_mcp, mcp_asgi_app = build_mcp_server()
