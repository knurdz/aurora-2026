import httpx
import hashlib
from typing import Optional, Dict, Any, List

CROSSREF_BASE = "https://api.crossref.org"
# Polite pool: include mailto for dedicated server + better rate limits (~50 req/sec)
POLITE_MAILTO = "verischolar@analysis.gov"
HEADERS = {"User-Agent": f"VeriScholar/1.0 (mailto:{POLITE_MAILTO})"}


def resolve_doi(doi: str) -> Optional[Dict[str, Any]]:
    """Resolve a single DOI to structured metadata via CrossRef /works/{doi}."""
    url = f"{CROSSREF_BASE}/works/{doi}"
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.get(url, headers=HEADERS)
            if r.status_code == 200:
                return _parse_work(r.json().get("message", {}))
    except Exception:
        pass
    return None


def search_by_query(query: str, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Fallback: search CrossRef by raw citation text (author-year or title string).
    Used when no DOI is available.
    """
    url = f"{CROSSREF_BASE}/works"
    params = {
        "query": query,
        "rows": limit,
        "select": (
            "DOI,title,author,published-print,published-online,"
            "container-title,is-referenced-by-count,funder,update-to,reference,type"
        ),
    }
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.get(url, headers=HEADERS, params=params)
            if r.status_code == 200:
                items = r.json().get("message", {}).get("items", [])
                return [_parse_work(item) for item in items]
    except Exception:
        pass
    return []


def _parse_work(work: dict) -> dict:
    """Extract and normalise fields from a CrossRef work object."""

    # Title
    titles = work.get("title", [])
    title = titles[0] if titles else "Unknown"

    # Authors — "Given Family" format
    authors = []
    for a in work.get("author", []):
        name = f"{a.get('given', '')} {a.get('family', '')}".strip()
        if name:
            authors.append(name)

    # Journal / container title
    container = work.get("container-title", [])
    journal = container[0] if container else "Unknown"

    # Publication year
    published = work.get("published-print") or work.get("published-online") or {}
    date_parts = published.get("date-parts", [[None]])
    year = date_parts[0][0] if date_parts and date_parts[0] else None

    # DOI + SHA-256 hash for audit immutability
    doi = work.get("DOI", "")
    doi_hash = hashlib.sha256(doi.encode()).hexdigest() if doi else None

    # Retraction flag — CrossRef marks these in update-to list
    update_to = work.get("update-to", [])
    is_retracted = any(u.get("type") == "retraction" for u in update_to)

    # DOIs of papers this work directly references
    references = [
        ref["DOI"] for ref in work.get("reference", []) if ref.get("DOI")
    ]

    # Funding sources
    funders = [
        f["name"] for f in work.get("funder", []) if f.get("name")
    ]

    return {
        "doi": doi,
        "doi_hash": doi_hash,
        "title": title,
        "authors": authors,
        "journal": journal,
        "year": year,
        "is_retracted": is_retracted,
        "references": references,
        "funders": funders,
        "citation_count": work.get("is-referenced-by-count", 0),
        "type": work.get("type", "unknown"),
        "open_access": False,   # enriched downstream by Semantic Scholar
    }