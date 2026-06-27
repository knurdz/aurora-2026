import re
from typing import Dict, List, Optional


_REFERENCE_HEADING_RE = re.compile(
    r"^\s*(references|bibliography|literature cited|works cited)\s*$",
    re.IGNORECASE,
)
_REFERENCE_STOP_RE = re.compile(
    r"^\s*(appendix|appendices|supplementary|supporting information|acknowledg|"
    r"author contributions|competing interests|funding|figure legends)\b",
    re.IGNORECASE,
)
_NUMBERED_START_RE = re.compile(r"^\s*\[(\d{1,3})\]\s+")
_DOI_RE = re.compile(
    r"(?:doi:\s*|https?://(?:dx\.)?doi\.org/)?(10\.\d{4,9}/[^\s,;)\]]+)",
    re.IGNORECASE,
)
_YEAR_RE = re.compile(r"\(?\b(?:19|20)\d{2}[a-z]?(?:;\s*forthcoming)?\)?\.")
_PAGE_BREAK_RE = re.compile(r"^\s*\f?\s*$")
_PAGE_COUNT_RE = re.compile(r"^\s*\d+\s+of\s+\d+\s*$", re.IGNORECASE)
_FOOTER_DOI_RE = re.compile(
    r"^\s*.+\b(?:19|20)\d{2};\d+:[A-Za-z0-9.]+\. DOI:\s*10\.",
    re.IGNORECASE,
)


def extract_reference_entries(pages: List[Dict]) -> List[Dict]:
    """Extract bibliography/reference-list entries from parsed document pages."""
    lines = _document_lines(pages)
    start = _find_reference_heading(lines)
    if start is None:
        return []

    ref_lines = _clean_reference_lines(_slice_reference_section(lines, start + 1))
    if not ref_lines:
        return []

    numbered = _extract_numbered_references(ref_lines)
    if len(numbered) >= 3:
        return numbered

    return _extract_author_year_references(ref_lines)


def _document_lines(pages: List[Dict]) -> List[str]:
    lines: List[str] = []
    for page in pages:
        text = page.get("text", "")
        if lines:
            lines.append("")
        lines.extend(text.splitlines())
    return lines


def _find_reference_heading(lines: List[str]) -> Optional[int]:
    matches = [i for i, line in enumerate(lines) if _REFERENCE_HEADING_RE.match(line)]
    return matches[-1] if matches else None


def _slice_reference_section(lines: List[str], start: int) -> List[str]:
    section: List[str] = []
    for line in lines[start:]:
        if section and _REFERENCE_STOP_RE.match(line):
            break
        section.append(line)
    return section


def _clean_reference_lines(lines: List[str]) -> List[str]:
    cleaned: List[str] = []
    for line in lines:
        stripped = line.strip()
        if _PAGE_BREAK_RE.match(stripped):
            cleaned.append("")
            continue
        if stripped.isdigit():
            continue
        if _PAGE_COUNT_RE.match(stripped):
            continue
        if stripped.lower() == "research article":
            continue
        if stripped.lower() == "genomics and evolutionary biology":
            continue
        if _FOOTER_DOI_RE.match(stripped):
            continue
        cleaned.append(stripped)
    return _repair_accent_splits(cleaned)


def _repair_accent_splits(lines: List[str]) -> List[str]:
    repaired: List[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        while line.endswith(("´", "`", "¨")) and i + 1 < len(lines):
            i += 1
            line += lines[i]
        repaired.append(line)
        i += 1
    return repaired


def _extract_numbered_references(lines: List[str]) -> List[Dict]:
    entries: List[str] = []
    current: List[str] = []

    for line in lines:
        if _NUMBERED_START_RE.match(line):
            if current:
                entries.append(_join_lines(current))
            current = [line]
        elif current and line:
            current.append(line)

    if current:
        entries.append(_join_lines(current))

    return [_entry(raw) for raw in entries if raw]


def _extract_author_year_references(lines: List[str]) -> List[Dict]:
    entries: List[str] = []
    current: List[str] = []
    previous_blank = True

    for idx, line in enumerate(lines):
        if not line:
            previous_blank = True
            continue

        is_start = _looks_like_author_year_start_at(lines, idx, previous_blank)
        if current and is_start and _is_author_continuation(current[-1]):
            is_start = False
        if is_start:
            if current:
                entries.append(_join_lines(current))
            current = [line]
        elif current:
            current.append(line)

        previous_blank = False

    if current:
        entries.append(_join_lines(current))

    return [_entry(raw) for raw in entries if raw]


def _looks_like_author_year_start_at(
    lines: List[str],
    idx: int,
    previous_blank: bool,
) -> bool:
    line = lines[idx]
    if not line or not line[0].isupper():
        return False
    if line.startswith(("In ", "Proceedings ", "Journal ", "Conference ")):
        return False

    year_match = _YEAR_RE.search(line[:240])
    if year_match and _looks_like_author_prefix(line[:year_match.start()]):
        return True

    next_line = _next_nonblank(lines, idx + 1)
    if next_line and _YEAR_RE.match(next_line):
        return _looks_like_author_prefix(line)

    if _is_author_continuation(line) and _looks_like_author_prefix(line):
        author_span = line
        for lookahead in lines[idx + 1:idx + 13]:
            if not lookahead:
                break
            author_span = f"{author_span} {lookahead}"
            year_match = _YEAR_RE.search(author_span[:320])
            if year_match:
                return _looks_like_author_prefix(author_span[:year_match.start()])
            if "." in lookahead and not _is_author_continuation(lookahead):
                break

    return False


def _looks_like_author_prefix(prefix: str) -> bool:
    prefix = prefix.strip()
    if not prefix:
        return False
    lowered = prefix.lower()
    if lowered.startswith((
        "advances ",
        "association ",
        "computational ",
        "conference ",
        "journal ",
        "machine ",
        "nature ",
        "neural ",
        "proceedings ",
        "science ",
    )):
        return False
    if "," in prefix or " and " in prefix or " et al" in prefix:
        return True
    if re.match(r"^[A-Z][^,]{1,50}\s+[A-Z]{1,4}\.?$", prefix):
        return True
    if re.match(r"^[A-Z][A-Za-zÀ-ž'´`¨.\-]+(?:\s+[A-Z]\.?)?\s+[A-Z][A-Za-zÀ-ž'´`¨.\-]+\.?$", prefix):
        return True
    return bool(re.match(r"^[A-Z][A-Za-zÀ-ž'´`¨.\-]+(?:\s+[A-Z]{1,4}\.?)+\.?$", prefix))


def _is_author_continuation(line: str) -> bool:
    line = line.strip()
    if not line:
        return False
    if _YEAR_RE.search(line):
        return False
    return not line.endswith(".") or line.endswith(",")


def _next_nonblank(lines: List[str], start: int) -> Optional[str]:
    for line in lines[start:]:
        if line:
            return line
    return None


def _join_lines(lines: List[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def _entry(raw: str) -> Dict:
    doi_match = _DOI_RE.search(raw)
    doi = doi_match.group(1).rstrip(".") if doi_match else ""
    return {
        "raw": raw,
        "type": "reference",
        "value": raw,
        "context": raw,
        "doi": doi,
    }
