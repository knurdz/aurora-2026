from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional

from ingestion.parser import parse_document
from ingestion.citation_detector import detect_citations
from ingestion.claim_classifier import classify_page_claims, claim_has_nearby_citation
from ingestion.embeddings import embed_uncited_claims
from core.config import settings

class DocumentState(TypedDict):
    filename: str
    file_bytes: bytes
    doc_id: str
    document_text: str
    pages: List[dict]
    claims: List[dict]
    citations: List[dict]
    graph_results: Optional[dict]
    fraud_results: Optional[dict]
    integrity_score: Optional[float]
    audit_report: Optional[str]

def claim_isolation_agent(state: DocumentState) -> DocumentState:
    pages = parse_document(state["filename"], state["file_bytes"])

    all_claims: List[dict] = []
    all_citations: List[dict] = []
    uncited_for_embedding: List[dict] = []

    for page in pages:
        page_num = page["page_number"]
        page_text = page["text"]

        page_citations = detect_citations(page_text)
        for c in page_citations:
            c["page_number"] = page_num
        all_citations.extend(page_citations)

        extracted = classify_page_claims(
            page_text, model=settings.ollama_model, host=settings.ollama_host
        )
        for claim in extracted:
            has_citation = claim_has_nearby_citation(claim["text"], page_text, page_citations)
            claim["page_number"] = page_num
            claim["has_citation"] = has_citation
            all_claims.append(claim)
            if not has_citation:
                uncited_for_embedding.append({"text": claim["text"], "page_number": page_num})

    embed_uncited_claims(state["doc_id"], uncited_for_embedding)

    state["pages"] = pages
    state["document_text"] = "\n\n".join(p["text"] for p in pages)
    state["claims"] = all_claims
    state["citations"] = all_citations
    return state

def citation_graph_agent(state: DocumentState) -> DocumentState:
    # Phase 3: build Neo4j citation graph, detect cartels
    return state

def fraud_detection_agent(state: DocumentState) -> DocumentState:
    # Phase 4: p-curve, GRIM, statistical checks
    return state

def consensus_agent(state: DocumentState) -> DocumentState:
    # Phase 5: compute score, generate report
    return state

def build_graph() -> StateGraph:
    graph = StateGraph(DocumentState)

    graph.add_node("claim_isolation", claim_isolation_agent)
    graph.add_node("citation_graph", citation_graph_agent)
    graph.add_node("fraud_detection", fraud_detection_agent)
    graph.add_node("consensus", consensus_agent)

    graph.set_entry_point("claim_isolation")

    # citation_graph and fraud_detection run in parallel after claim isolation
    graph.add_edge("claim_isolation", "citation_graph")
    graph.add_edge("citation_graph", "fraud_detection")
    graph.add_edge("fraud_detection", "consensus")
    graph.add_edge("consensus", END)

    return graph.compile()

verischolar_graph = build_graph()