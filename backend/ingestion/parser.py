import io
import fitz  # PyMuPDF
from docx import Document
from typing import List, Dict

PSEUDO_PAGE_CHARS = 3000


def parse_document(filename: str, content: bytes) -> List[Dict]:
    """Parse PDF or DOCX bytes into page-level text blocks.
    Returns: [{"page_number": int, "text": str}, ...]
    """
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        return _parse_pdf(content)
    elif ext == "docx":
        return _parse_docx(content)
    else:
        raise ValueError(f"Unsupported file type: .{ext} (expected .pdf or .docx)")


def _parse_pdf(content: bytes) -> List[Dict]:
    pages = []
    with fitz.open(stream=content, filetype="pdf") as doc:
        for i, page in enumerate(doc):
            text = page.get_text("text").strip()
            if text:
                pages.append({"page_number": i + 1, "text": text})
    return pages


def _parse_docx(content: bytes) -> List[Dict]:
    # DOCX has no real page boundaries until rendered — chunk into
    # pseudo-pages by character count so downstream logic stays uniform.
    doc = Document(io.BytesIO(content))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    pages = []
    page_number = 1
    for start in range(0, len(full_text), PSEUDO_PAGE_CHARS):
        chunk = full_text[start:start + PSEUDO_PAGE_CHARS].strip()
        if chunk:
            pages.append({"page_number": page_number, "text": chunk})
            page_number += 1
    return pages