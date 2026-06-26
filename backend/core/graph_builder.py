import asyncio
import re
import httpx
from neo4j import GraphDatabase
from core.config import settings
from core.crossref_client import (
    resolve_doi,
    resolve_doi_async,
    search_by_query,
    search_by_query_async,
)
from core.semantic_scholar_client import enrich_paper, enrich_paper_async
from typing import List, Dict, Any, Optional, Tuple


def build_citation_graph(citations: List[dict]) -> Dict[str, Any]:
    """
    Flow:
      citations → resolve DOIs via CrossRef
                → enrich with Semantic Scholar
                → MERGE into Neo4j graph
                → write CITES edges between resolved papers

    Returns graph_results dict that lands in DocumentState.
    """
    resolved, failed = asyncio.run(_resolve_and_enrich_citations(citations))

    # Write to Neo4j
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    try:
        with driver.session() as session:
            for paper in resolved:
                _write_paper(session, paper)

            # Only write CITES edges between papers present in this document —
            # avoids polluting the graph with unresolved external DOIs
            doi_set = {p["doi"] for p in resolved if p.get("doi")}
            for paper in resolved:
                for ref_doi in paper.get("references", []):
                    if ref_doi in doi_set:
                        _write_cites_edge(session, paper["doi"], ref_doi)
    finally:
        driver.close()

    return {
        "resolved_count": len(resolved),
        "failed_count": len(failed),
        "failed_citations": failed,
        "papers": resolved,
    }


async def _resolve_and_enrich_citations(
    citations: List[dict],
) -> Tuple[List[dict], List[dict]]:
    resolved, failed = await _resolve_citations_async(citations)
    enriched = await _enrich_resolved_papers_async(resolved)
    return enriched, failed


async def _resolve_citations_async(
    citations: List[dict],
) -> Tuple[List[dict], List[dict]]:
    grouped: Dict[Tuple[str, str], List[dict]] = {}
    unresolvable: List[dict] = []

    for citation in citations:
        key = _citation_key(citation)
        if key:
            grouped.setdefault(key, []).append(citation)
        else:
            unresolvable.append(citation)

    if not grouped:
        return [], unresolvable

    semaphore = asyncio.Semaphore(max(1, settings.citation_crossref_concurrency))
    results: Dict[Tuple[str, str], Optional[dict]] = {}

    async with httpx.AsyncClient() as client:
        async def resolve_group(key: Tuple[str, str], sample: dict) -> None:
            async with semaphore:
                results[key] = await _resolve_citation_async(sample, client)

        await asyncio.gather(
            *(resolve_group(key, group[0]) for key, group in grouped.items())
        )

    resolved: List[dict] = []
    failed: List[dict] = list(unresolvable)
    for citation in citations:
        key = _citation_key(citation)
        if not key:
            continue
        paper = results.get(key)
        if paper:
            resolved.append(dict(paper))
        else:
            failed.append(citation)

    return resolved, failed


async def _enrich_resolved_papers_async(resolved: List[dict]) -> List[dict]:
    if not resolved:
        return []

    unique_by_doi: Dict[str, dict] = {}
    for paper in resolved:
        doi = _normalize_doi(paper.get("doi", ""))
        if doi and doi not in unique_by_doi:
            unique_by_doi[doi] = paper

    if not unique_by_doi:
        return [dict(paper) for paper in resolved]

    semaphore = asyncio.Semaphore(max(1, settings.citation_semantic_scholar_concurrency))
    enriched_by_doi: Dict[str, dict] = {}

    async with httpx.AsyncClient() as client:
        async def enrich_one(doi: str, paper: dict) -> None:
            async with semaphore:
                enriched_by_doi[doi] = await enrich_paper_async(paper, client)

        await asyncio.gather(
            *(enrich_one(doi, paper) for doi, paper in unique_by_doi.items())
        )

    enriched: List[dict] = []
    for paper in resolved:
        doi = _normalize_doi(paper.get("doi", ""))
        enriched.append(dict(enriched_by_doi.get(doi, paper)))

    return enriched


async def _resolve_citation_async(
    citation: dict,
    client: httpx.AsyncClient,
) -> Optional[dict]:
    doi = _normalize_doi(_citation_doi(citation))
    if doi:
        paper = await resolve_doi_async(doi, client)
        if paper:
            return paper

    query = _citation_query(citation)
    if query:
        results = await search_by_query_async(query, client, limit=1)
        if results:
            return results[0]

    return None


def _resolve_citation(citation: dict) -> Optional[dict]:
    """
    Resolution order:
      1. DOI-type citations: resolve directly via CrossRef /works/{doi}
      2. Explicit doi field (future-proofing)
      3. APA/numbered: fuzzy CrossRef search using context window first,
         falling back to raw citation string if context is unavailable.

    Using the surrounding sentence as the search query gives CrossRef
    title/keyword signal that a bare "Author et al., Year" string lacks,
    dramatically improving match quality for APA citations.
    """
    # DOI citations — direct resolution, no fuzzy search needed
    if citation.get("type") == "doi":
        doi = citation.get("value", "")
        if doi:
            paper = resolve_doi(doi)
            if paper:
                return paper

    # Explicit doi field (kept for forward compatibility)
    doi = citation.get("doi")
    if doi:
        paper = resolve_doi(doi)
        if paper:
            return paper

    # APA / narrative / numbered — fuzzy search
    # Prefer context (surrounding sentence) over raw citation string:
    # "Physical activity helps people live longer (Ludlow and Roth, 2011)"
    # gives CrossRef far more signal than just "Ludlow and Roth, 2011"
    query = (
        citation.get("context")
        or citation.get("raw")
        or citation.get("value")
        or citation.get("raw_text")
        or citation.get("text", "")
    )
    if query:
        results = search_by_query(query, limit=1)
        if results:
            return results[0]

    return None


def _citation_key(citation: dict) -> Optional[Tuple[str, str]]:
    doi = _citation_doi(citation)
    if doi:
        return ("doi", _normalize_doi(doi))

    query = _citation_query(citation)
    if query:
        return ("query", _normalize_query(query))

    return None


def _citation_doi(citation: dict) -> str:
    if citation.get("type") == "doi":
        return citation.get("value", "").strip()
    return citation.get("doi", "").strip()


def _citation_query(citation: dict) -> str:
    return (
        citation.get("context")
        or citation.get("raw")
        or citation.get("value")
        or citation.get("raw_text")
        or citation.get("text", "")
    ).strip()


def _normalize_doi(doi: str) -> str:
    doi = doi.strip().lower()
    doi = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", doi)
    doi = re.sub(r"^doi:\s*", "", doi)
    return doi


def _normalize_query(query: str) -> str:
    return re.sub(r"\s+", " ", query.strip().lower())


def _write_paper(session, paper: dict) -> None:
    """
    MERGE a Paper node and all related nodes.
    MERGE is idempotent — safe to re-run on the same DOI.
    """
    doi = paper.get("doi", "")

    session.run(
        """
        MERGE (p:Paper {doi: $doi})
        SET p.title          = $title,
            p.year           = $year,
            p.doi_hash       = $doi_hash,
            p.is_retracted   = $is_retracted,
            p.citation_count = $citation_count,
            p.open_access    = $open_access,
            p.pub_type       = $pub_type
        """,
        doi=doi,
        title=paper.get("title", "Unknown"),
        year=paper.get("year"),
        doi_hash=paper.get("doi_hash"),
        is_retracted=paper.get("is_retracted", False),
        citation_count=paper.get("citation_count", 0),
        open_access=paper.get("open_access", False),
        pub_type=paper.get("type", "unknown"),
    )

    # Author nodes + AUTHORED_BY edges
    for author in paper.get("authors", []):
        session.run(
            """
            MERGE (a:Author {name: $name})
            WITH a
            MATCH (p:Paper {doi: $doi})
            MERGE (p)-[:AUTHORED_BY]->(a)
            """,
            name=author,
            doi=doi,
        )

    # Journal node + PUBLISHED_IN edge
    journal = paper.get("journal")
    if journal and journal != "Unknown":
        session.run(
            """
            MERGE (j:Journal {name: $journal})
            WITH j
            MATCH (p:Paper {doi: $doi})
            MERGE (p)-[:PUBLISHED_IN]->(j)
            """,
            journal=journal,
            doi=doi,
        )

    # Funder nodes + FUNDED_BY edges
    for funder in paper.get("funders", []):
        session.run(
            """
            MERGE (f:Funder {name: $funder})
            WITH f
            MATCH (p:Paper {doi: $doi})
            MERGE (p)-[:FUNDED_BY]->(f)
            """,
            funder=funder,
            doi=doi,
        )


def _write_cites_edge(session, citing_doi: str, cited_doi: str) -> None:
    session.run(
        """
        MATCH (a:Paper {doi: $citing}), (b:Paper {doi: $cited})
        MERGE (a)-[:CITES]->(b)
        """,
        citing=citing_doi,
        cited=cited_doi,
    )
