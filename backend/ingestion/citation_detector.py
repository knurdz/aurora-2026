import re
import unicodedata
from typing import List, Dict

_PARTICLE = r"(?:[Vv]an\s[Dd]er\s|[Dd]e\s|[Ll]e\s)?"

_APA_UNIT = (
    _PARTICLE
    + r"[A-Z][A-Za-z\-']+"
    + r"(?:\s[A-Z][A-Za-z\-']+)?"
    + r"(?:\set al\."
    + r"|\s(?:&|and)\s[A-Za-z\-']+)?"
    + r",?\s\d{4}[a-z]?"
    + r"(?:,\s\d{4}[a-z]?)?"
)

_APA_RE = re.compile(
    r"\((" + _APA_UNIT + r"(?:;\s*" + _APA_UNIT + r")*)\)"
)

_APA_NARRATIVE_UNIT = (
    _PARTICLE
    + r"[A-Z][A-Za-z\-']+"
    + r"(?:\s[A-Z][A-Za-z\-']+)?"
    + r"(?:\set al\.|\s(?:&|and)\s[A-Za-z\-']+)?"
)
_APA_NARRATIVE_RE = re.compile(
    _APA_NARRATIVE_UNIT + r"\s\(\d{4}[a-z]?\)"
)

_NUMBERED_RE = re.compile(r"\[(\d{1,3}(?:\s*[-,]\s*\d{1,3})*)\]")
_DOI_RE = re.compile(
    r"(?:doi:\s*|https?://doi\.org/)?(10\.\d{4,9}/[^\s,;)\]]+)",
    re.IGNORECASE,
)

# Latin-1 / modifier glyphs PDF extractors insert mid-word.
# Captured as a group so we can detect when they precede a newline.
_STRAY_GLYPHS = r'[\xa8\xb4\x60\u02cb\u02ca\u00b8\u02d9]'

_SENT_END_RE = re.compile(r'(?<=[.!?])\s+')


def _normalise(text: str) -> str:
    """
    Clean PDF-extracted text for citation regex matching.

    Order matters:
      1. Remove stray glyph + newline pairs ('M\xa8\nuller' → 'Muller').
         The glyph and newline together represent a single diacritic that was
         split across a line — strip both as a unit so no space is introduced.
      2. Remove any remaining isolated stray glyphs mid-word.
      3. Join hyphenated line breaks ('Ma-\nlina' → 'Malina').
      4. Replace remaining newlines with spaces.
      5. NFD decomposition + combining mark removal for proper Unicode accents.
    """
    # Step 1: glyph immediately followed by newline → delete both
    text = re.sub(_STRAY_GLYPHS + r'\n', '', text)

    # Step 2: remaining isolated stray glyphs
    text = re.sub(_STRAY_GLYPHS, '', text)

    # Step 3: dehyphenate
    text = re.sub(r'-\s*\n\s*', '', text)

    # Step 4: flatten remaining newlines to spaces
    text = re.sub(r'\n', ' ', text)

    # Step 5: NFD strip combining marks
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')

    return text


def _get_context(text: str, start: int, end: int, window: int = 200) -> str:
    left = max(0, start - window)
    right = min(len(text), end + window)
    snippet = text[left:right].strip()

    sentences = _SENT_END_RE.split(snippet)
    if len(sentences) > 1:
        rebuilt = []
        pos = left
        for sent in sentences:
            sent_end = pos + len(sent)
            if pos <= end and sent_end >= start:
                rebuilt.append(sent.strip())
            pos = sent_end + 1
        if rebuilt:
            return " ".join(rebuilt)

    return snippet


def detect_citations(text: str) -> List[Dict]:
    norm = _normalise(text)
    citations = []
    seen = set()

    def _add(raw: str, ctype: str, value: str, match_start: int, match_end: int) -> None:
        key = (ctype, value)
        if key not in seen:
            seen.add(key)
            context = _get_context(norm, match_start, match_end)
            citations.append({
                "raw": raw,
                "type": ctype,
                "value": value,
                "context": context,
            })

    for m in _APA_RE.finditer(norm):
        for unit in re.split(r";\s*", m.group(1)):
            unit = unit.strip()
            if unit:
                _add(unit, "apa", unit, m.start(), m.end())

    for m in _APA_NARRATIVE_RE.finditer(norm):
        _add(m.group(0), "apa_narrative", m.group(0), m.start(), m.end())

    for m in _NUMBERED_RE.finditer(norm):
        _add(m.group(0), "numbered", m.group(1), m.start(), m.end())

    for m in _DOI_RE.finditer(norm):
        _add(m.group(0), "doi", m.group(1), m.start(), m.end())

    return citations

def _normalize_match(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()
