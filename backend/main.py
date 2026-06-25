import hashlib
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

_analysis_store = {}
from core.config import settings
from core.langgraph_app import verischolar_graph, DocumentState, register_progress_callback, unregister_progress_callback
from core.progress_manager import progress_manager
from neo4j import GraphDatabase
import chromadb
from chromadb.config import Settings as ChromaSettings

neo4j_driver = None
chroma_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_driver, chroma_client
    import asyncio
    progress_manager.set_loop(asyncio.get_running_loop())
    neo4j_driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password)
    )
    chroma_client = chromadb.HttpClient(
        host=settings.chroma_host,
        port=settings.chroma_port,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    yield
    neo4j_driver.close()

app = FastAPI(title="VeriScholar API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def get_config():
    return {
        "llm_provider": settings.llm_provider,
        "model_name": settings.openai_model if settings.llm_provider == "openai" else settings.ollama_model,
        "endpoint": settings.openai_endpoint if settings.llm_provider == "openai" else settings.ollama_host,
    }

@app.get("/history")
async def get_history():
    history_list = []
    for doc_id, res in _analysis_store.items():
        history_list.append({
            "doc_id": doc_id,
            "filename": res.get("filename", "Unknown"),
            "integrity_score": res.get("integrity_score"),
            "integrity_verdict": res.get("integrity_verdict"),
            "timestamp": res.get("timestamp")
        })
    return {"history": history_list[::-1][:50]}

@app.get("/analysis/{doc_id}")
async def get_analysis(doc_id: str):
    if doc_id not in _analysis_store:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return _analysis_store[doc_id]

@app.post("/analyze")
async def analyze_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    content = await file.read()
    doc_id = hashlib.sha256(content).hexdigest()[:16]

    # If already processed, return immediately
    if doc_id in _analysis_store and _analysis_store[doc_id].get("status") == "processed":
        return {"status": "processed", "doc_id": doc_id}

    # If currently processing, return immediately
    if doc_id in _analysis_store and _analysis_store[doc_id].get("status") == "processing":
        return {"status": "processing", "doc_id": doc_id}

    import datetime

    # Initialize
    _analysis_store[doc_id] = {
        "status": "processing",
        "doc_id": doc_id,
        "filename": file.filename,
        "timestamp": datetime.datetime.now().isoformat(),
    }
    progress_manager.initialize(doc_id)

    # Register callback to forward messages to ProgressManager
    register_progress_callback(doc_id, lambda msg: progress_manager.emit(doc_id, msg))

    # Define background task to run the pipeline
    def run_pipeline():
        try:
            initial_state: DocumentState = {
                "filename": file.filename,
                "file_bytes": content,
                "doc_id": doc_id,
                "document_text": "",
                "pages": [],
                "claims": [],
                "citations": [],
                "graph_results": None,
                "fraud_results": None,
                "integrity_score": None,
                "audit_report": None,
            }
            result = verischolar_graph.invoke(initial_state)

            integrity = result.get("integrity_score") or {}
            graph = result.get("graph_results") or {}
            fraud = result.get("fraud_results") or {}
            community = graph.get("community_analysis", {})

            analysis_result = {
                "status": "processed",
                "doc_id": doc_id,
                "filename": file.filename,
                "timestamp": datetime.datetime.now().isoformat(),

                # Document stats
                "pages_parsed": len(result["pages"]),
                "claims_found": len(result["claims"]),
                "citations_found": len(result["citations"]),

                # integrity scorecard
                "integrity_score": integrity.get("score"),
                "integrity_verdict": integrity.get("verdict"),
                "score_breakdown": integrity.get("breakdown", {}),

                # fraud summary
                "fraud_risk": fraud.get("overall_fraud_risk"),
                "grim_failures": fraud.get("grim", {}).get("failure_count", 0),
                "p_curve_verdict": fraud.get("p_curve", {}).get("verdict"),
                "funding_conflicts": fraud.get("funding_conflicts", {}).get("conflict_count", 0),

                # citation graph summary
                "citations_resolved": graph.get("resolved_count", 0),
                "retracted_papers": community.get("retracted_papers", []),
                "cartel_risk": community.get("cartel_risk"),
                "suspicious_clusters": len(community.get("suspicious_clusters", [])),

                # Full audit report (Markdown)
                "audit_report": result.get("audit_report"),
            }
            
            _analysis_store[doc_id] = analysis_result
            progress_manager.emit(doc_id, "🏁 Complete!")
        except Exception as e:
            import traceback
            traceback.print_exc()
            _analysis_store[doc_id] = {
                "status": "failed",
                "doc_id": doc_id,
                "filename": file.filename,
                "timestamp": datetime.datetime.now().isoformat(),
                "error": str(e)
            }
            progress_manager.emit(doc_id, f"❌ Error during analysis: {str(e)}")
        finally:
            unregister_progress_callback(doc_id)

    background_tasks.add_task(run_pipeline)
    return {"status": "processing", "doc_id": doc_id}

@app.get("/events/{doc_id}")
async def events_endpoint(doc_id: str):
    import asyncio
    async def event_generator():
        # 1. Yield existing log messages
        existing_logs = progress_manager.logs.get(doc_id, [])
        for log in existing_logs:
            yield f"data: {log}\n\n"
            
        # 2. Register queue for new messages if the process is still running
        status = "processing"
        if doc_id in _analysis_store:
            status = _analysis_store[doc_id].get("status", "processing")
            
        if status == "processing":
            q = progress_manager.register_queue(doc_id)
            try:
                while True:
                    msg = await q.get()
                    yield f"data: {msg}\n\n"
                    if "🏁 Complete!" in msg or "❌ Error during analysis" in msg:
                        break
            except asyncio.CancelledError:
                # Client disconnected
                pass
            finally:
                progress_manager.unregister_queue(doc_id, q)
        else:
            # Already complete/failed
            if status == "failed":
                err = _analysis_store[doc_id].get("error", "Unknown error")
                yield f"data: ❌ Error during analysis: {err}\n\n"
            else:
                yield f"data: 🏁 Complete!\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
