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

# ---------------------------------------------------------------------------
# Compiled regex patterns
# ---------------------------------------------------------------------------

# p-values: p < 0.001, p = 0.043, p=.05, p ≤ 0.01
_P_VALUE_RE = re.compile(
    r"p\s*[<=>≤≥]\s*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?",
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
    ollama_host: str,
    ollama_model: str,
) -> Dict[str, Any]:
    """
    Two-pass extraction over both the structured claims list and the raw
    page text.  Returns a unified dict consumed by fraud_detector.py.

    Structure:
      {
        "p_values": [float],
        "sample_sizes": [int],
        "means": [{"value": float, "decimal_places": int, "source": str}],
        "effect_sizes": [{"type": str, "value": float}],
        "claim_stat_pairs": [{"claim": str, "p_value": float|None, "n": int|None}],
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
        llm_stats = _llm_extract(full_text, ollama_host, ollama_model)
        p_values = p_values or llm_stats.get("p_values", [])
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

def _extract_p_values(text: str) -> List[float]:
    results = []
    for m in _P_VALUE_RE.finditer(text):
        raw = m.group(0)
        # Pull the numeric part after the operator
        num_match = re.search(r"[<=>≤≥]\s*\.?(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)", raw)
        if num_match:
            try:
                val = float(num_match.group(1) if "." in num_match.group(1) else "0." + num_match.group(1))
                # Normalise ".05" → 0.05 when no leading digit
                if val > 1:
                    val = val / (10 ** len(num_match.group(1)))
                if 0 < val <= 1:
                    results.append(round(val, 6))
            except ValueError:
                pass
    return list(dict.fromkeys(results))  # deduplicate, preserve order


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

def _llm_extract(text: str, host: str, model: str, timeout: float = 120.0) -> Dict:
    try:
        r = httpx.post(
            f"{host}/api/generate",
            json={
                "model": model,
                "prompt": _LLM_EXTRACT_PROMPT.format(text=text[:4000]),
                "format": "json",
                "stream": False,
            },
            timeout=timeout,
        )
        r.raise_for_status()
        return json.loads(r.json().get("response", "{}"))
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

        p_vals = _extract_p_values(window)
        ns = _extract_sample_sizes(window)
        ms = _extract_means(window)

        pairs.append({
            "claim": snippet,
            "p_value": p_vals[0] if p_vals else None,
            "n": ns[0] if ns else None,
            "mean": ms[0] if ms else None,
        })
    return pairs
