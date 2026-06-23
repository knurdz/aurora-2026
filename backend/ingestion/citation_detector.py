import re
from typing import List, Dict

# Matches one Author-Year unit, e.g. "Caspersen et al., 1985" or "Bauman, 2004"
_APA_UNIT = r"[A-Z][A-Za-z\-']+(?:\s(?:et al\.|&|and)\s[A-Za-z\-']+)?,?\s\d{4}[a-z]?"

# A full parenthetical citation, possibly with multiple semicolon-separated units
_APA_RE = re.compile(r"\((" + _APA_UNIT + r"(?:;\s*" + _APA_UNIT + r")*)\)")

_NUMBERED_RE = re.compile(r"\[(\d{1,3}(?:\s*[-,]\s*\d{1,3})*)\]")
_DOI_RE = re.compile(
    r"(?:doi:\s*|https?://doi\.org/)?(10\.\d{4,9}/[^\s,;)\]]+)", re.IGNORECASE
)

def detect_citations(text: str) -> List[Dict]:
    citations = []

    for m in _APA_RE.finditer(text):
        for unit in re.split(r";\s*", m.group(1)):
            citations.append({"raw": unit.strip(), "type": "apa", "value": unit.strip()})

    for m in _NUMBERED_RE.finditer(text):
        citations.append({"raw": m.group(0), "type": "numbered", "value": m.group(1)})

    for m in _DOI_RE.finditer(text):
        citations.append({"raw": m.group(0), "type": "doi", "value": m.group(1)})

    return citations