from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional
from ingestion.parser import parse_document
from ingestion.citation_detector import detect_citations
from ingestion.claim_classifier import classify_page_claims, claim_has_nearby_citation
from ingestion.embeddings import embed_uncited_claims
from core.config import settings

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
    from core.graph_builder import build_citation_graph
    from core.community_detector import detect_citation_communities

    citations = state.get("citations", [])

    if not citations:
        state["graph_results"] = {
            "resolved_count": 0,
            "failed_count": 0,
            "failed_citations": [],
            "papers": [],
            "community_analysis": {
                "communities": [],
                "suspicious_clusters": [],
                "retracted_papers": [],
                "cartel_risk": "no_citations",
                "modularity_score": 0.0,
            },
        }
        return state

    graph_data = build_citation_graph(citations)

    doi_list = [p["doi"] for p in graph_data.get("papers", []) if p.get("doi")]
    community_data = detect_citation_communities(doi_list)

    state["graph_results"] = {
        **graph_data,
        "community_analysis": community_data,
    }
    return state

def fraud_detection_agent(state: DocumentState) -> DocumentState:
    """
    Phase 4: Statistical fraud detection.

    Runs over document_text + claims to extract statistical values, then
    applies four checks: GRIM, p-curve, small-sample, funding conflict.
    Results stored in DocumentState.fraud_results.
    """
    from core.stats_extractor import extract_stats_from_claims
    from core.fraud_detector import run_fraud_detection

    claims = state.get("claims", [])
    document_text = state.get("document_text", "")
    graph_results = state.get("graph_results")

    # Extract all statistical values from the document
    stats = extract_stats_from_claims(
        claims=claims,
        page_text=document_text,
        ollama_host=settings.ollama_host,
        ollama_model=settings.ollama_model,
    )

    # Run the four fraud detection checks
    fraud_results = run_fraud_detection(
        stats=stats,
        graph_results=graph_results,
        claims=claims,
    )

    state["fraud_results"] = fraud_results
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
