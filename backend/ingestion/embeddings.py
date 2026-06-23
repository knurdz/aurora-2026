from typing import List, Dict
from sentence_transformers import SentenceTransformer
from chromadb import HttpClient
from chromadb.config import Settings

from core.config import settings

_model = None
_client = None

COLLECTION_NAME = "shadow_citations"


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _get_chroma_client():
    global _client
    if _client is None:
        _client = HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def embed_uncited_claims(doc_id: str, uncited_claims: List[Dict]) -> int:
    """Embed scientific claims with no nearby citation into ChromaDB.
    Each item: {"text": str, "page_number": int}. Returns count embedded."""
    if not uncited_claims:
        return 0

    model = _get_model()
    client = _get_chroma_client()
    collection = client.get_or_create_collection(COLLECTION_NAME)

    texts = [c["text"] for c in uncited_claims]
    embeddings = model.encode(texts).tolist()
    ids = [f"{doc_id}-p{c['page_number']}-{i}" for i, c in enumerate(uncited_claims)]
    metadatas = [{"doc_id": doc_id, "page_number": c["page_number"]} for c in uncited_claims]

    collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    return len(ids)