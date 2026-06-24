import re
from typing import List, Dict

# ---------------------------------------------------------------------------
# APA unit pattern — matches one author-year reference
#
# Handles:
#   Single author:          Bauman, 2004
#   Two authors (and/&):    Ludlow and Roth, 2011
#   et al.:                 Hyde et al., 2013
#   Compound surnames:      Guha Niyogi et al., 2026b
#                           Mohd Talmizi et al., 2021
#
# Root fix: the original pattern placed "et al." inside a group that
# required a *second author name* to follow — making all "et al." citations
# fail to match. Fixed by separating the two cases:
#   \set al.           — no trailing name needed
#   \s(?:&|and)\sName  — second name required
# ---------------------------------------------------------------------------

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


def detect_citations(text: str) -> List[Dict]:
    citations = []
    seen = set()  # deduplicate within page

    def _add(raw: str, ctype: str, value: str) -> None:
        key = (ctype, value)
        if key not in seen:
            seen.add(key)
            citations.append({"raw": raw, "type": ctype, "value": value})

    # --- Parenthetical APA clusters e.g. (Hyde et al., 2013; Bauman, 2004) ---
    for m in _APA_RE.finditer(text):
        for unit in re.split(r";\s*", m.group(1)):
            unit = unit.strip()
            if unit:
                _add(unit, "apa", unit)

    # --- Narrative APA e.g. Malina (1996), Trost et al. (1996) ---
    for m in _APA_NARRATIVE_RE.finditer(text):
        raw = m.group(0)
        _add(raw, "apa_narrative", raw)

    # --- Numbered e.g. [12], [3-5] ---
    for m in _NUMBERED_RE.finditer(text):
        _add(m.group(0), "numbered", m.group(1))

    # --- DOI e.g. 10.1000/xyz123 ---
    for m in _DOI_RE.finditer(text):
        _add(m.group(0), "doi", m.group(1))

    return citations