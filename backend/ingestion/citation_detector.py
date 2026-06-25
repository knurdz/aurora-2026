import re
from typing import List, Dict

_APA_UNIT = (
    r"[A-Z][A-Za-z\-']+"           # First word of surname (must start uppercase)
    r"(?:\s[A-Z][A-Za-z\-']+)?"    # Optional second surname word (compound names)
    r"(?:\set al\."                 # Either: et al.
    r"|\s(?:&|and)\s[A-Za-z\-']+)?"  # Or: & / and + second author
    r",?\s\d{4}[a-z]?"             # , Year (optional suffix letter e.g. 2026b)
)

# Full parenthetical: (Author, Year) or (A et al., Y; B and C, Y; ...)
_APA_RE = re.compile(
    r"\((" + _APA_UNIT + r"(?:;\s*" + _APA_UNIT + r")*)\)"
)

# Narrative form: Author (Year) or Author et al. (Year)
# e.g. "Malina (1996)", "Trost et al. (1996)", "Chiou and Muller (2009)"
_APA_NARRATIVE_UNIT = (
    r"[A-Z][A-Za-z\-']+"
    r"(?:\s[A-Z][A-Za-z\-']+)?"
    r"(?:\set al\.|\s(?:&|and)\s[A-Za-z\-']+)?"
)
_APA_NARRATIVE_RE = re.compile(
    _APA_NARRATIVE_UNIT + r"\s\(\d{4}[a-z]?\)"
)

_NUMBERED_RE = re.compile(r"\[(\d{1,3}(?:\s*[-,]\s*\d{1,3})*)\]")
_DOI_RE = re.compile(
    r"(?:doi:\s*|https?://doi\.org/)?(10\.\d{4,9}/[^\s,;)\]]+)",
    re.IGNORECASE,
)

# Sentence boundary — used to extract a clean context window
_SENT_END_RE = re.compile(r'(?<=[.!?])\s+')


def _get_context(text: str, start: int, end: int, window: int = 200) -> str:
    """
    Extract the sentence(s) surrounding the match at [start:end].

    Strategy: take a raw character window, then trim to the nearest
    sentence boundaries so CrossRef gets a clean title/keyword-bearing
    phrase rather than a mid-sentence fragment.
    """
    left = max(0, start - window)
    right = min(len(text), end + window)
    snippet = text[left:right].strip()

    # Try to trim to sentence boundaries within the snippet
    sentences = _SENT_END_RE.split(snippet)
    if len(sentences) > 1:
        # Keep only sentences that overlap with the match region
        rebuilt = []
        pos = left
        for sent in sentences:
            sent_end = pos + len(sent)
            if pos <= end and sent_end >= start:
                rebuilt.append(sent.strip())
            pos = sent_end + 1  # +1 for the whitespace consumed by split
        if rebuilt:
            return " ".join(rebuilt)

    return snippet


def detect_citations(text: str) -> List[Dict]:
    citations = []
    seen = set()  # deduplicate within page

    def _add(raw: str, ctype: str, value: str, match_start: int, match_end: int) -> None:
        key = (ctype, value)
        if key not in seen:
            seen.add(key)
            context = _get_context(text, match_start, match_end)
            citations.append({
                "raw": raw,
                "type": ctype,
                "value": value,
                "context": context,
            })

    # --- Parenthetical APA clusters ---
    for m in _APA_RE.finditer(text):
        for unit in re.split(r";\s*", m.group(1)):
            unit = unit.strip()
            if unit:
                _add(unit, "apa", unit, m.start(), m.end())

    # --- Narrative APA ---
    for m in _APA_NARRATIVE_RE.finditer(text):
        raw = m.group(0)
        _add(raw, "apa_narrative", raw, m.start(), m.end())

    # --- Numbered ---
    for m in _NUMBERED_RE.finditer(text):
        _add(m.group(0), "numbered", m.group(1), m.start(), m.end())

    # --- DOI ---
    for m in _DOI_RE.finditer(text):
        _add(m.group(0), "doi", m.group(1), m.start(), m.end())

    return citations
