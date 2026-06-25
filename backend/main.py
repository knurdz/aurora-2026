import hashlib
from fastapi import FastAPI, UploadFile, File, HTTPException
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

_analysis_store = {}
from core.config import settings
from core.langgraph_app import verischolar_graph, DocumentState
from neo4j import GraphDatabase
import chromadb
from chromadb.config import Settings as ChromaSettings

neo4j_driver = None
chroma_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_driver, chroma_client
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
async def analyze_document(file: UploadFile = File(...)):
    content = await file.read()
    doc_id = hashlib.sha256(content).hexdigest()[:16]

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

    import datetime
    
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
    return analysis_result
