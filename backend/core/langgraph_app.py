from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from ingestion.parser import parse_document
from ingestion.citation_detector import detect_citations
from ingestion.reference_extractor import extract_reference_entries
from ingestion.claim_classifier import classify_page_claims, claim_has_nearby_citation
from ingestion.embeddings import embed_uncited_claims
from core.config import settings
from core.llm_client import LLMClient, get_llm_client

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
    citation_mentions: List[dict]
    reference_entries: List[dict]
    graph_results: Optional[dict]
    fraud_results: Optional[dict]
    integrity_score: Optional[dict]
    audit_report: Optional[str]
    llm_client: LLMClient

def claim_isolation_agent(state: DocumentState) -> DocumentState:
    doc_id = state["doc_id"]
    llm_client = state.get("llm_client") or get_llm_client()
    _emit(doc_id, "📄 Parsing document pages...")
    pages = parse_document(state["filename"], state["file_bytes"])
    _emit(doc_id, f"✅ Parsed {len(pages)} pages")

    all_claims: List[dict] = []
    all_citation_mentions: List[dict] = []
    uncited_for_embedding: List[dict] = []

    worker_count = min(max(1, settings.claim_page_concurrency), max(1, len(pages)))
    _emit(doc_id, f"🧠 Extracting claims with LLM ({len(pages)} pages, {worker_count} workers)...")
    page_results = _process_claim_pages(pages, doc_id, llm_client)

    for result in page_results:
        all_claims.extend(result["claims"])
        all_citation_mentions.extend(result["citations"])
        uncited_for_embedding.extend(result["uncited_for_embedding"])

    reference_entries = extract_reference_entries(pages)
    _emit(doc_id, f"📚 Extracted {len(reference_entries)} reference-list entries")

    _emit(doc_id, f"💾 Embedding {len(uncited_for_embedding)} uncited claims into vector store...")
    embed_uncited_claims(state["doc_id"], uncited_for_embedding)

    _emit(
        doc_id,
        f"✅ Phase 1 complete — {len(all_claims)} total claims, "
        f"{len(reference_entries)} cited works, "
        f"{len(all_citation_mentions)} citation mentions",
    )

    state["pages"] = pages
    state["document_text"] = "\n\n".join(p["text"] for p in pages)
    state["claims"] = all_claims
    state["citation_mentions"] = all_citation_mentions
    state["reference_entries"] = reference_entries
    state["citations"] = reference_entries or all_citation_mentions
    return state


def _process_claim_pages(pages: List[dict], doc_id: str, llm_client: LLMClient) -> List[dict]:
    if not pages:
        return []

    worker_count = min(max(1, settings.claim_page_concurrency), len(pages))
    results: List[dict] = []

    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        future_to_page = {
            executor.submit(_process_claim_page, page, llm_client): page
            for page in pages
        }

        for future in as_completed(future_to_page):
            result = future.result()
            results.append(result)
            _emit(
                doc_id,
                f"  → Page {result['page_number']}: "
                f"{len(result['claims'])} claims, "
                f"{len(result['citations'])} citations detected",
            )

    return sorted(results, key=lambda r: r["page_number"])


def _process_claim_page(page: dict, llm_client: LLMClient) -> dict:
    page_num = page["page_number"]
    page_text = page["text"]

    page_citations = detect_citations(page_text) or []
    for citation in page_citations:
        citation["page_number"] = page_num

    extracted = classify_page_claims(
        page_text,
        llm_client=llm_client,
        timeout=settings.claim_page_timeout,
    )

    claims: List[dict] = []
    uncited_for_embedding: List[dict] = []
    for claim in extracted:
        has_citation = claim_has_nearby_citation(claim["text"], page_text, page_citations)
        enriched_claim = {
            **claim,
            "page_number": page_num,
            "has_citation": has_citation,
        }
        claims.append(enriched_claim)
        if not has_citation:
            uncited_for_embedding.append({"text": claim["text"], "page_number": page_num})

    return {
        "page_number": page_num,
        "claims": claims,
        "citations": page_citations,
        "uncited_for_embedding": uncited_for_embedding,
    }

def citation_graph_agent(state: DocumentState) -> DocumentState:
    from core.graph_builder import build_citation_graph
    from core.community_detector import detect_citation_communities

    doc_id = state["doc_id"]
    citations = state.get("reference_entries") or []
    if not citations:
        citations = state.get("citation_mentions", [])
        if citations:
            _emit(doc_id, "⚠️  No reference list found — falling back to citation mentions for graph phase")

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
    llm_client = state.get("llm_client") or get_llm_client()
    claims = state.get("claims", [])
    document_text = state.get("document_text", "")
    graph_results = state.get("graph_results")

    _emit(doc_id, "📊 Extracting statistical values (p-values, means, sample sizes)...")
    stats = extract_stats_from_claims(
        claims=claims,
        page_text=document_text,
        llm_client=llm_client,
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
