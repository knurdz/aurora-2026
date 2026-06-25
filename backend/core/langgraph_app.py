from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional, Callable
from ingestion.parser import parse_document
from ingestion.citation_detector import detect_citations
from ingestion.claim_classifier import classify_page_claims, claim_has_nearby_citation
from ingestion.embeddings import embed_uncited_claims
from core.config import settings
from core.llm_client import get_llm_client

_llm = get_llm_client()

# Progress callbacks: doc_id -> callable(message: str)
_progress_callbacks: dict[str, Callable] = {}

def register_progress_callback(doc_id: str, callback: Callable):
    _progress_callbacks[doc_id] = callback

def unregister_progress_callback(doc_id: str):
    _progress_callbacks.pop(doc_id, None)

def _emit(doc_id: str, message: str):
    cb = _progress_callbacks.get(doc_id)
    if cb:
        cb(message)

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
    integrity_score: Optional[dict]
    audit_report: Optional[str]

def claim_isolation_agent(state: DocumentState) -> DocumentState:
    doc_id = state["doc_id"]
    _emit(doc_id, "📄 Parsing document pages...")
    pages = parse_document(state["filename"], state["file_bytes"])
    _emit(doc_id, f"✅ Parsed {len(pages)} pages")

    all_claims: List[dict] = []
    all_citations: List[dict] = []
    uncited_for_embedding: List[dict] = []

    _emit(doc_id, f"🧠 Extracting claims with LLM ({len(pages)} pages to process)...")
    for page in pages:
        page_num = page["page_number"]
        page_text = page["text"]

        page_citations = detect_citations(page_text)
        for c in page_citations:
            c["page_number"] = page_num
        all_citations.extend(page_citations)

        extracted = classify_page_claims(page_text, llm_client=_llm)
        for claim in extracted:
            has_citation = claim_has_nearby_citation(claim["text"], page_text, page_citations)
            claim["page_number"] = page_num
            claim["has_citation"] = has_citation
            all_claims.append(claim)
            if not has_citation:
                uncited_for_embedding.append({"text": claim["text"], "page_number": page_num})

        _emit(doc_id, f"  → Page {page_num}: {len(extracted)} claims, {len(page_citations)} citations detected")

    _emit(doc_id, f"💾 Embedding {len(uncited_for_embedding)} uncited claims into vector store...")
    embed_uncited_claims(state["doc_id"], uncited_for_embedding)

    _emit(doc_id, f"✅ Phase 1 complete — {len(all_claims)} total claims, {len(all_citations)} citations found")

    state["pages"] = pages
    state["document_text"] = "\n\n".join(p["text"] for p in pages)
    state["claims"] = all_claims
    state["citations"] = all_citations
    return state

def citation_graph_agent(state: DocumentState) -> DocumentState:
    from core.graph_builder import build_citation_graph
    from core.community_detector import detect_citation_communities

    doc_id = state["doc_id"]
    citations = state.get("citations", [])

    if not citations:
        _emit(doc_id, "⚠️  No citations found — skipping citation graph phase")
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

    _emit(doc_id, f"🔗 Resolving {len(citations)} citations via CrossRef & Semantic Scholar...")
    graph_data = build_citation_graph(citations)
    _emit(doc_id, f"  → Resolved {graph_data.get('resolved_count', 0)}, failed {graph_data.get('failed_count', 0)}")

    doi_list = [p["doi"] for p in graph_data.get("papers", []) if p.get("doi")]
    _emit(doc_id, f"🕸️  Running Louvain community detection on {len(doi_list)} papers...")
    community_data = detect_citation_communities(doi_list)

    retracted = community_data.get("retracted_papers", [])
    cartels = community_data.get("suspicious_clusters", [])
    if retracted:
        _emit(doc_id, f"  ⚠️  {len(retracted)} retracted paper(s) detected in citations!")
    if cartels:
        _emit(doc_id, f"  ⚠️  {len(cartels)} suspicious citation cluster(s) found")

    _emit(doc_id, f"✅ Phase 2 complete — citation graph built, cartel risk: {community_data.get('cartel_risk', 'none')}")

    state["graph_results"] = {**graph_data, "community_analysis": community_data}
    return state

def fraud_detection_agent(state: DocumentState) -> DocumentState:
    """Phase 4: Statistical fraud detection."""
    from core.stats_extractor import extract_stats_from_claims
    from core.fraud_detector import run_fraud_detection

    doc_id = state["doc_id"]
    claims = state.get("claims", [])
    document_text = state.get("document_text", "")
    graph_results = state.get("graph_results")

    _emit(doc_id, "📊 Extracting statistical values (p-values, means, sample sizes)...")
    stats = extract_stats_from_claims(
        claims=claims,
        page_text=document_text,
        llm_client=_llm,
    )
    _emit(doc_id, f"  → Found {len(stats.get('p_values', []))} p-values, "
                  f"{len(stats.get('sample_sizes', []))} sample sizes, "
                  f"{len(stats.get('means', []))} means")

    _emit(doc_id, "🔬 Running GRIM test on reported means...")
    _emit(doc_id, "📉 Analysing p-curve for p-hacking signals...")
    _emit(doc_id, "👥 Checking sample sizes for underpowered studies...")
    _emit(doc_id, "💰 Scanning funders for conflict-of-interest keywords...")

    fraud_results = run_fraud_detection(
        stats=stats,
        graph_results=graph_results,
        claims=claims,
    )

    risk = fraud_results.get("overall_fraud_risk", "unknown")
    _emit(doc_id, f"✅ Phase 3 complete — overall fraud risk: {risk.upper()}")

    state["fraud_results"] = fraud_results
    return state

def consensus_agent(state: DocumentState) -> DocumentState:
    """Phase 5: Integrity scoring + audit report generation."""
    from core.integrity_scorer import compute_integrity_score
    from core.audit_reporter import generate_audit_report

    doc_id = state["doc_id"]
    _emit(doc_id, "🏆 Computing weighted integrity score...")

    claims = state.get("claims", [])
    graph_results = state.get("graph_results")
    fraud_results = state.get("fraud_results")

    score_result = compute_integrity_score(
        claims=claims,
        graph_results=graph_results,
        fraud_results=fraud_results,
    )

    score = score_result.get("score", 0)
    verdict = score_result.get("verdict", "unknown")
    _emit(doc_id, f"  → Score: {score:.2f}/1.00 — Verdict: {verdict}")

    _emit(doc_id, "📝 Generating Markdown audit report...")
    audit_report = generate_audit_report(
        score_result=score_result,
        claims=claims,
        graph_results=graph_results,
        fraud_results=fraud_results,
        filename=state.get("filename", "unknown"),
    )

    _emit(doc_id, "✅ Phase 4 complete — audit report ready")

    state["integrity_score"] = score_result
    state["audit_report"] = audit_report
    return state

def build_graph() -> StateGraph:
    graph = StateGraph(DocumentState)

    graph.add_node("claim_isolation", claim_isolation_agent)
    graph.add_node("citation_graph", citation_graph_agent)
    graph.add_node("fraud_detection", fraud_detection_agent)
    graph.add_node("consensus", consensus_agent)

    graph.set_entry_point("claim_isolation")

    graph.add_edge("claim_isolation", "citation_graph")
    graph.add_edge("citation_graph", "fraud_detection")
    graph.add_edge("fraud_detection", "consensus")
    graph.add_edge("consensus", END)

    return graph.compile()

verischolar_graph = build_graph()
