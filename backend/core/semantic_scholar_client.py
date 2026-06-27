import httpx
from typing import Optional, Dict, Any, List
from core.config import settings

SS_BASE = "https://api.semanticscholar.org/graph/v1"
# Request only fields we actually use — keeps response size small
PAPER_FIELDS = (
    "title,authors,year,citationCount,"
    "references.externalIds,openAccessPdf,publicationTypes"
)


def get_paper_by_doi(doi: str) -> Optional[Dict[str, Any]]:
    """Fetch a single paper from Semantic Scholar by DOI."""
    url = f"{SS_BASE}/paper/DOI:{doi}"
    params = {"fields": PAPER_FIELDS}
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.get(url, params=params)
            if r.status_code == 200:
                return _parse_paper(r.json())
    except Exception:
        pass
    return None


async def get_paper_by_doi_async(
    doi: str,
    client: httpx.AsyncClient,
) -> Optional[Dict[str, Any]]:
    """Fetch a single paper from Semantic Scholar using a shared async client."""
    url = f"{SS_BASE}/paper/DOI:{doi}"
    params = {"fields": PAPER_FIELDS}
    try:
        r = await client.get(url, params=params, timeout=settings.citation_request_timeout)
        if r.status_code == 200:
            return _parse_paper(r.json())
    except Exception:
        pass
    return None


def _parse_paper(paper: dict) -> dict:
    authors = [a.get("name", "") for a in paper.get("authors", [])]

    # Extract DOIs from reference list
    refs: List[str] = []
    for ref in paper.get("references", []):
        ext = ref.get("externalIds") or {}
        doi = ext.get("DOI")
        if doi:
            refs.append(doi)

    return {
        "ss_paper_id": paper.get("paperId"),
        "title": paper.get("title"),
        "authors": authors,
        "year": paper.get("year"),
        "citation_count": paper.get("citationCount", 0),
        "references": refs,
        "open_access": paper.get("openAccessPdf") is not None,
        "publication_types": paper.get("publicationTypes", []),
    }


def enrich_paper(crossref_data: dict) -> dict:
    """
    Merge Semantic Scholar fields into an existing CrossRef record.

    Strategy:
    - Citation count: take whichever is higher (SS is more up-to-date)
    - References: union of both sets (SS often resolves more)
    - open_access, publication_types, ss_paper_id: added from SS
    CrossRef fields (doi_hash, is_retracted, funders) are authoritative and never overwritten.
    """
    doi = crossref_data.get("doi")
    if not doi:
        return crossref_data

    ss = get_paper_by_doi(doi)
    if not ss:
        return crossref_data

    if ss["citation_count"] > crossref_data.get("citation_count", 0):
        crossref_data["citation_count"] = ss["citation_count"]

    crossref_data["ss_paper_id"] = ss.get("ss_paper_id")
    crossref_data["open_access"] = ss.get("open_access", False)
    crossref_data["publication_types"] = ss.get("publication_types", [])

    existing_refs = set(crossref_data.get("references", []))
    ss_refs = set(ss.get("references", []))
    crossref_data["references"] = list(existing_refs | ss_refs)

    return crossref_data


async def enrich_paper_async(
    crossref_data: dict,
    client: httpx.AsyncClient,
) -> dict:
    """
    Async Semantic Scholar enrichment with the same merge strategy as enrich_paper.
    The input dict is copied so one resolved paper can safely back repeated citations.
    """
    enriched = dict(crossref_data)
    doi = enriched.get("doi")
    if not doi:
        return enriched

    ss = await get_paper_by_doi_async(doi, client)
    if not ss:
        return enriched

    if ss["citation_count"] > enriched.get("citation_count", 0):
        enriched["citation_count"] = ss["citation_count"]

    enriched["ss_paper_id"] = ss.get("ss_paper_id")
    enriched["open_access"] = ss.get("open_access", False)
    enriched["publication_types"] = ss.get("publication_types", [])

    existing_refs = set(enriched.get("references", []))
    ss_refs = set(ss.get("references", []))
    enriched["references"] = list(existing_refs | ss_refs)

    return enriched
