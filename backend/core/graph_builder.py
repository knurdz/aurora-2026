from neo4j import GraphDatabase
from core.config import settings
from core.crossref_client import resolve_doi, search_by_query
from core.semantic_scholar_client import enrich_paper
from typing import List, Dict, Any, Optional


def build_citation_graph(citations: List[dict]) -> Dict[str, Any]:
    """
    Flow:
      citations → resolve DOIs via CrossRef
                → enrich with Semantic Scholar
                → MERGE into Neo4j graph
                → write CITES edges between resolved papers

    Returns graph_results dict that lands in DocumentState.
    """
    resolved: List[dict] = []
    failed: List[dict] = []

    for citation in citations:
        paper = _resolve_citation(citation)
        if paper:
            resolved.append(paper)
        else:
            failed.append(citation)

    # Enrich every resolved paper with Semantic Scholar metadata
    enriched = [enrich_paper(p) for p in resolved]

    # Write to Neo4j
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    try:
        with driver.session() as session:
            for paper in enriched:
                _write_paper(session, paper)

            # Only write CITES edges between papers present in this document —
            # avoids polluting the graph with unresolved external DOIs
            doi_set = {p["doi"] for p in enriched if p.get("doi")}
            for paper in enriched:
                for ref_doi in paper.get("references", []):
                    if ref_doi in doi_set:
                        _write_cites_edge(session, paper["doi"], ref_doi)
    finally:
        driver.close()

    return {
        "resolved_count": len(enriched),
        "failed_count": len(failed),
        "failed_citations": failed,
        "papers": enriched,
    }


def _resolve_citation(citation: dict) -> Optional[dict]:
    """
    Resolution order:
      1. DOI-type citations: value field holds the DOI directly
      2. Explicit doi field (future-proofing)
      3. APA/numbered citations: fuzzy CrossRef title/author search
    """
    # DOI citations carry the DOI in the value field
    if citation.get("type") == "doi":
        doi = citation.get("value", "")
        if doi:
            paper = resolve_doi(doi)
            if paper:
                return paper

    # Explicit doi field (never set by current detector, kept for safety)
    doi = citation.get("doi")
    if doi:
        paper = resolve_doi(doi)
        if paper:
            return paper

    # APA / narrative / numbered → CrossRef text search
    # Prefer "raw" (full original string), fall back to "value", then legacy keys
    raw = (
        citation.get("raw")
        or citation.get("value")
        or citation.get("raw_text")
        or citation.get("text", "")
    )
    if raw:
        results = search_by_query(raw, limit=1)
        if results:
            return results[0]

    return None


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
