"""
stats_extractor.py
Phase 4 — Statistical value extraction from claims and raw page text.

Extraction strategy (two-pass):
  Pass 1 — Regex: fast, high-precision capture of well-formed statistical
            notation (p = 0.03, n = 120, M = 4.52, r = 0.34, etc.)
  Pass 2 — LLM fallback: catches prose-embedded stats that evade regex
            ("a mean of 4.52 among 120 participants")

Output fed directly into fraud_detector.py.
"""

import re
import json
import httpx
from typing import List, Dict, Any
from core.llm_client import LLMClient

# ---------------------------------------------------------------------------
# Compiled regex patterns
# ---------------------------------------------------------------------------

# p-values: p < 0.001, p = 0.043, p=.05, p ≤ 0.01
_P_VALUE_RE = re.compile(
    r"\bp\s*(?P<operator><=|>=|[<=>≤≥])\s*"
    r"(?P<value>(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)",
    re.IGNORECASE,
)

# Sample sizes: n = 120, N = 3,400
_SAMPLE_SIZE_RE = re.compile(
    r"\bn\s*=\s*([\d,]+)",
    re.IGNORECASE,
)

# Means: M = 4.52, mean = 4.52, m = 4.52
_MEAN_RE = re.compile(
    r"\b(?:M|mean)\s*=\s*([+-]?\d+(?:\.\d+)?)",
    re.IGNORECASE,
)

# Cohen's d, r, η², ω²
_EFFECT_SIZE_RE = re.compile(
    r"\b(?:d|r|eta(?:\s*squared)?|omega(?:\s*squared)?|η²|ω²)\s*=\s*([+-]?\d+(?:\.\d+)?)",
    re.IGNORECASE,
)

# Percentages reported as prevalence / effect claims
_PERCENTAGE_RE = re.compile(
    r"(\d{1,3}(?:\.\d+)?)\s*%",
)

# ---------------------------------------------------------------------------
# LLM extraction prompt (fallback for prose-embedded stats)
# ---------------------------------------------------------------------------

_LLM_EXTRACT_PROMPT = """You are a statistical extraction assistant for an academic integrity tool.

Read the text below and extract ALL numerical statistical values you can find.
Return ONLY valid JSON (no markdown, no commentary) matching this schema:
{{
  "p_values": [<float>],
  "sample_sizes": [<int>],
  "means": [{{"value": <float>, "decimal_places": <int>}}],
  "effect_sizes": [{{"type": "<d|r|eta|omega>", "value": <float>}}]
}}

Rules:
- p_values: only values explicitly stated as p-values (p < 0.05, p = 0.03, etc.)
- sample_sizes: participant/observation counts (n = 120, N = 3400)
- means: reported mean values — count decimal places carefully for GRIM testing
- effect_sizes: Cohen's d, Pearson r, eta-squared, omega-squared
- If nothing found for a category, return an empty list.

Text:
\"\"\"{text}\"\"\"
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_stats_from_claims(
    claims: List[Dict],
    page_text: str,
    llm_client: LLMClient,
) -> Dict[str, Any]:
    """
    Two-pass extraction over both the structured claims list and the raw
    page text.  Returns a unified dict consumed by fraud_detector.py.

    Structure:
      {
        "p_values": [{"value": float, "operator": str, "raw": str, "source": str}],
        "sample_sizes": [int],
        "means": [{"value": float, "decimal_places": int, "source": str}],
        "effect_sizes": [{"type": str, "value": float}],
        "claim_stat_pairs": [{"claim": str, "p_value": dict|None, "n": int|None}],
      }
    """
    full_text = page_text + "\n" + "\n".join(c.get("text", "") for c in claims)

    # Pass 1 — regex
    p_values = _extract_p_values(full_text)
    sample_sizes = _extract_sample_sizes(full_text)
    means = _extract_means(full_text)
    effect_sizes = _extract_effect_sizes(full_text)

    # Pass 2 — LLM fallback (only if regex found very little)
    if len(p_values) == 0 and len(sample_sizes) == 0:
        llm_stats = _llm_extract(full_text, llm_client)
        p_values = p_values or _normalise_llm_p_values(llm_stats.get("p_values", []))
        sample_sizes = sample_sizes or llm_stats.get("sample_sizes", [])
        means = means or [
            {"value": m["value"], "decimal_places": m.get("decimal_places", 2), "source": "llm"}
            for m in llm_stats.get("means", [])
        ]
        effect_sizes = effect_sizes or llm_stats.get("effect_sizes", [])

    # Build per-claim stat pairs for targeted GRIM checks
    claim_stat_pairs = _pair_claims_with_stats(claims, page_text)

    return {
        "p_values": p_values,
        "sample_sizes": sample_sizes,
        "means": means,
        "effect_sizes": effect_sizes,
        "claim_stat_pairs": claim_stat_pairs,
    }


# ---------------------------------------------------------------------------
# Regex extractors
# ---------------------------------------------------------------------------

def _normalise_p_operator(operator: str) -> str:
    return {"≤": "<=", "≥": ">="}.get(operator, operator)


def _extract_p_values(text: str) -> List[Dict]:
    results = []
    for m in _P_VALUE_RE.finditer(text):
        raw = m.group(0)
        try:
            val = float(m.group("value"))
        except ValueError:
            continue
        if 0 < val <= 1:
            results.append({
                "value": round(val, 6),
                "operator": _normalise_p_operator(m.group("operator")),
                "raw": raw,
                "source": "regex",
            })
    return results


def _normalise_llm_p_values(p_values: List[Any]) -> List[Dict]:
    results = []
    for p in p_values:
        try:
            if isinstance(p, dict):
                value = float(p.get("value"))
                operator = _normalise_p_operator(str(p.get("operator", "=")))
                raw = str(p.get("raw", f"p {operator} {value}"))
            else:
                value = float(p)
                operator = "="
                raw = f"p = {value}"
        except (TypeError, ValueError):
            continue
        if 0 < value <= 1:
            results.append({
                "value": round(value, 6),
                "operator": operator,
                "raw": raw,
                "source": "llm",
            })
    return results


def _extract_sample_sizes(text: str) -> List[int]:
    results = []
    for m in _SAMPLE_SIZE_RE.finditer(text):
        try:
            val = int(m.group(1).replace(",", ""))
            if 2 <= val <= 10_000_000:
                results.append(val)
        except ValueError:
            pass
    return list(dict.fromkeys(results))


def _extract_means(text: str) -> List[Dict]:
    results = []
    for m in _MEAN_RE.finditer(text):
        raw = m.group(1)
        try:
            val = float(raw)
            decimal_places = len(raw.split(".")[-1]) if "." in raw else 0
            results.append({"value": val, "decimal_places": decimal_places, "source": "regex"})
        except ValueError:
            pass
    return results


def _extract_effect_sizes(text: str) -> List[Dict]:
    results = []
    for m in _EFFECT_SIZE_RE.finditer(text):
        try:
            results.append({
                "type": m.group(0).split("=")[0].strip().lower(),
                "value": float(m.group(1)),
            })
        except ValueError:
            pass
    return results


# ---------------------------------------------------------------------------
# LLM fallback
# ---------------------------------------------------------------------------

def _llm_extract(text: str, llm_client: LLMClient, timeout: float = 120.0) -> Dict:
    try:
        raw_output = llm_client.generate(
            prompt=_LLM_EXTRACT_PROMPT.format(text=text[:4000]),
            temperature=0.1,
            max_tokens=2048,
            json_mode=True,
            timeout=timeout,
        )
        return json.loads(raw_output)
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# Per-claim stat pairing (for targeted GRIM / p-value proximity)
# ---------------------------------------------------------------------------

def _pair_claims_with_stats(claims: List[Dict], page_text: str) -> List[Dict]:
    """
    For each claim, look in the surrounding 400 chars for a p-value and
    sample size — used by fraud_detector to run GRIM on claims that have
    all three values (mean, p, n) in close proximity.
    """
    pairs = []
    for claim in claims:
        snippet = claim.get("text", "")
        idx = page_text.find(snippet[:60])
        window = page_text[max(0, idx - 400): idx + len(snippet) + 400] if idx != -1 else snippet

        pair = _pair_stats_in_text(window, anchor=snippet[:60])

        pairs.append({
            "claim": snippet,
            **pair,
        })
    return pairs


def _pair_stats_in_text(text: str, anchor: str = "") -> Dict[str, Any]:
    """
    Prefer same-sentence mean/n pairs. Broad-window pairing is only used when
    there is exactly one candidate of each type, avoiding false GRIM failures
    from crossing unrelated statistics.
    """
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    anchor = anchor.strip()
    if anchor:
        anchored_sentences = [s for s in sentences if anchor in s]
        candidate_sentences = anchored_sentences or sentences
    else:
        candidate_sentences = sentences

    for sentence in candidate_sentences:
        p_vals = _extract_p_values(sentence)
        ns = _extract_sample_sizes(sentence)
        ms = _extract_means(sentence)
        if len(ns) == 1 and len(ms) == 1:
            return {
                "p_value": p_vals[0] if p_vals else None,
                "n": ns[0],
                "mean": ms[0],
                "pair_confidence": "high",
            }

    p_vals = _extract_p_values(text)
    ns = _extract_sample_sizes(text)
    ms = _extract_means(text)
    if len(ns) == 1 and len(ms) == 1:
        return {
            "p_value": p_vals[0] if p_vals else None,
            "n": ns[0],
            "mean": ms[0],
            "pair_confidence": "medium",
        }

    return {
        "p_value": p_vals[0] if len(p_vals) == 1 else None,
        "n": None,
        "mean": None,
        "pair_confidence": "ambiguous" if ns or ms else "none",
    }
