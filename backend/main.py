from fastapi import FastAPI, UploadFile, File
from contextlib import asynccontextmanager
from core.config import settings
from core.langgraph_app import verischolar_graph, DocumentState
from neo4j import GraphDatabase
import chromadb

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
        port=settings.chroma_port
    )
    yield
    neo4j_driver.close()

app = FastAPI(title="VeriScholar API", version="0.1.0", lifespan=lifespan)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "neo4j": "connected" if neo4j_driver else "disconnected",
        "chroma": "connected" if chroma_client else "disconnected",
        "ollama_model": settings.ollama_model,
    }

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    # Placeholder — Phase 2 will populate this
    content = await file.read()
    initial_state: DocumentState = {
        "document_text": content.decode("utf-8", errors="replace"),
        "claims": [],
        "citations": [],
        "graph_results": None,
        "fraud_results": None,
        "integrity_score": None,
        "audit_report": None,
    }
    result = verischolar_graph.invoke(initial_state)
    return {"status": "processed", "claims_found": len(result["claims"])}