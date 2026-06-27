import sys
import types
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_previous_core = sys.modules.get("core")
_previous_llm_client = sys.modules.get("core.llm_client")
_previous_httpx = sys.modules.get("httpx")

core_pkg = types.ModuleType("core")
core_pkg.__path__ = []
llm_client_module = types.ModuleType("core.llm_client")
httpx_module = types.ModuleType("httpx")


class LLMClient:
    pass


llm_client_module.LLMClient = LLMClient
sys.modules["core"] = core_pkg
sys.modules["core.llm_client"] = llm_client_module
sys.modules["httpx"] = httpx_module

from ingestion.citation_detector import detect_citations
from ingestion.claim_classifier import classify_page_claims

if _previous_core is None:
    sys.modules.pop("core", None)
else:
    sys.modules["core"] = _previous_core

if _previous_llm_client is None:
    sys.modules.pop("core.llm_client", None)
else:
    sys.modules["core.llm_client"] = _previous_llm_client

if _previous_httpx is None:
    sys.modules.pop("httpx", None)
else:
    sys.modules["httpx"] = _previous_httpx


class FakeLLM:
    def __init__(self, output):
        self.output = output

    def generate(self, **_kwargs):
        return self.output


class CitationDetectorTests(unittest.TestCase):
    def test_no_citations_returns_empty_list(self):
        self.assertEqual(detect_citations("This page has no citation markers."), [])

    def test_apa_citation_is_detected(self):
        citations = detect_citations("Prior work found the same pattern (Smith, 2020).")

        self.assertGreaterEqual(len(citations), 1)
        self.assertEqual(citations[0]["type"], "apa")
        self.assertEqual(citations[0]["value"], "Smith, 2020")

    def test_numbered_and_doi_citations_are_detected(self):
        citations = detect_citations("See [12] and doi:10.1000/xyz123 for details.")
        citation_types = {citation["type"] for citation in citations}

        self.assertIn("numbered", citation_types)
        self.assertIn("doi", citation_types)


class ClaimClassifierTests(unittest.TestCase):
    def test_null_claims_payload_returns_empty_list(self):
        claims = classify_page_claims(
            "A study reports an empirical finding.",
            llm_client=FakeLLM('{"claims": null}'),
        )

        self.assertEqual(claims, [])

    def test_malformed_claim_payload_returns_empty_list(self):
        claims = classify_page_claims(
            "A study reports an empirical finding.",
            llm_client=FakeLLM('{"claims": {"text": "not a list"}}'),
        )

        self.assertEqual(claims, [])

    def test_malformed_claim_items_return_empty_list(self):
        claims = classify_page_claims(
            "A study reports an empirical finding.",
            llm_client=FakeLLM('{"claims": [null, 42, {"text": ""}]}'),
        )

        self.assertEqual(claims, [])


if __name__ == "__main__":
    unittest.main()
