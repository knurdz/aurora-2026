import re
import json
import httpx
from typing import List, Dict

_BOILERPLATE_PATTERNS = [
    r"^\s*WHEREAS\b",
    r"^\s*(SEC(TION)?|ARTICLE)\.?\s+\d+",
    r"^\s*Pursuant to\b",
    r"^\s*Be it enacted\b",
    r"\bU\.S\.C\.\b",
    r"^\s*Public Law\b",
]
_BOILERPLATE_RE = re.compile("|".join(_BOILERPLATE_PATTERNS), re.IGNORECASE | re.MULTILINE)


def is_boilerplate(text: str) -> bool:
    """Heuristic fast path — skip the LLM call for obvious legal/admin text.
    KNOWN LIMITATION: runs per-page, so a page mixing legislative boilerplate
    with real scientific claims can get skipped entirely. Revisit with
    paragraph-level LangChain text splitting if testing shows false negatives."""
    return bool(_BOILERPLATE_RE.search(text))


_CLASSIFY_PROMPT = """You are classifying text from a government policy document.

Read the page below and return ONLY valid JSON (no markdown, no commentary) matching this schema:
{{
  "claims": [
    {{"text": "<exact scientific assertion, verbatim or lightly trimmed>", "type": "scientific_claim"}}
  ]
}}

A "scientific_claim" is a factual, empirical, or statistical assertion about the world (e.g. health
effects, environmental data, study findings) — NOT political opinion, legal/administrative boilerplate,
or rhetoric. If there are no scientific claims, return {{"claims": []}}.

Page text:
\"\"\"{page_text}\"\"\"
"""


def _normalize_claim(item) -> Dict:
    """Smaller models sometimes ignore the schema and return plain strings
    instead of {"text": ..., "type": ...} objects. Handle both."""
    if isinstance(item, dict):
        return {"text": str(item.get("text") or "").strip()}
    if isinstance(item, str):
        return {"text": item.strip()}
    return {"text": ""}


from core.llm_client import LLMClient

def classify_page_claims(page_text: str, llm_client: LLMClient, timeout: float = 300.0) -> List[Dict]:
    """Uses the unified LLMClient to extract claims."""
    if is_boilerplate(page_text):
        return []

    raw_output = llm_client.generate(
        prompt=_CLASSIFY_PROMPT.format(page_text=page_text),
        temperature=0.1,
        max_tokens=2048,
        json_mode=True,
        timeout=timeout,
    )

    try:
        payload = json.loads(raw_output)
    except json.JSONDecodeError:
        return []

    if not isinstance(payload, dict):
        return []

    raw_claims = payload.get("claims") or []
    if not isinstance(raw_claims, list):
        return []

    return [c for c in (_normalize_claim(item) for item in raw_claims) if c["text"]]


def claim_has_nearby_citation(claim_text: str, page_text: str, citations: List[Dict], window: int = 300) -> bool:
    """Proximity check: is there a detected citation within `window` chars
    of where this claim appears on the page? Identifies 'shadow citations'."""
    idx = page_text.find(claim_text[:60])
    if idx == -1:
        return False
    nearby = page_text[max(0, idx - window): idx + len(claim_text) + window]
    nearby_normalized = " ".join(nearby.split())
    return any(
        (raw := " ".join(c.get("raw", "").split())) and raw in nearby_normalized
        for c in citations
    )
