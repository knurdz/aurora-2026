"""
fraud_detector.py
Phase 4 — Statistical fraud detection pipeline.

Four independent checks, each producing a flagged list + risk verdict:

  1. GRIM Test (Granularity-Related Inconsistency of Means)
     Verify that reported means are arithmetically possible given the sample
     size.  For a mean M reported to d decimal places with n participants,
     M × n must round to a whole number within the rounding tolerance
     (0.5 / 10^d).  If not → the paper contains an impossible mean.

  2. p-Curve Analysis
     Collects all p-values < 0.05 and tests whether the distribution is
     right-skewed (consistent with genuine effects) or flat / left-skewed
     (consistent with p-hacking).  Uses the pp-value approach:
       - Under genuine effects, more than half of significant p-values
         should be < 0.025 (right of the uniform line).
       - A binomial test against p=0.5 determines statistical significance.

  3. Small-Sample Flagging
     Any study with n < 30 is flagged as underpowered.  n < 10 is high risk.

  4. Funding Conflict Detection
     Cross-references funders found in graph_results against a curated list
     of industry categories known to correlate with biased reporting.
     Only flags explicit name matches — no inference.

All four results are merged into a single fraud_results dict that lands in
DocumentState.fraud_results.
"""

import math
from typing import List, Dict, Any, Optional
from scipy import stats as scipy_stats

# ---------------------------------------------------------------------------
# Funding conflict reference list
# Industry categories with documented publication-bias associations.
# Expand as needed from conflict-of-interest disclosure research.
# ---------------------------------------------------------------------------

_INDUSTRY_CONFLICT_KEYWORDS = [
    # Tobacco
    "tobacco", "philip morris", "reynolds", "altria", "british american tobacco",
    "imperial tobacco", "japan tobacco",
    # Fossil fuels
    "exxon", "chevron", "shell", "bp ", "coal", "petroleum", "fossil",
    # Sugar / ultra-processed food
    "coca-cola", "pepsico", "nestle", "mondelez", "mars ", "kellogg",
    "sugar research", "corn refiners",
    # Pharma (selective — only those with major retraction history)
    "purdue pharma", "insys",
    # Agrochemical
    "monsanto", "bayer ag", "syngenta", "dow agroscienc",
    # Alcohol
    "anheuser", "diageo", "heineken", "international spirits",
]

# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------

SMALL_SAMPLE_WARN = 30    # n < 30: flagged (underpowered)
SMALL_SAMPLE_HIGH = 10    # n < 10: high risk
GRIM_TOLERANCE_MULTIPLIER = 0.5   # tolerance = 0.5 / 10^decimal_places
P_CURVE_MIN_VALUES = 5    # need at least 5 significant p-values for p-curve


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_fraud_detection(
    stats: Dict[str, Any],
    graph_results: Optional[Dict],
    claims: List[Dict],
) -> Dict[str, Any]:
    """
    Main Phase 4 entry point.

    Args:
        stats:         output of stats_extractor.extract_stats_from_claims()
        graph_results: DocumentState.graph_results (for funder data)
        claims:        DocumentState.claims (for context in report)

    Returns:
        fraud_results dict → stored in DocumentState.fraud_results
    """
    grim_results = _run_grim(stats)
    p_curve_results = _run_p_curve(stats.get("p_values", []))
    sample_flag_results = _run_sample_size_check(stats.get("sample_sizes", []))
    funding_results = _run_funding_conflict(graph_results)

    overall_risk = _compute_overall_risk(
        grim_results, p_curve_results, sample_flag_results, funding_results
    )

    return {
        "grim": grim_results,
        "p_curve": p_curve_results,
        "sample_size_flags": sample_flag_results,
        "funding_conflicts": funding_results,
        "stats_extracted": {
            "p_value_count": len(stats.get("p_values", [])),
            "sample_size_count": len(stats.get("sample_sizes", [])),
            "mean_count": len(stats.get("means", [])),
            "effect_size_count": len(stats.get("effect_sizes", [])),
        },
        "overall_fraud_risk": overall_risk,
    }


# ---------------------------------------------------------------------------
# 1. GRIM Test
# ---------------------------------------------------------------------------

def _run_grim(stats: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run GRIM on every (mean, n) pair found in the document.

    Uses claim_stat_pairs first (precise proximity), then falls back to
    all_means × all_ns cross-product for single-mean / single-n documents.
    """
    failures: List[Dict] = []
    passed: List[Dict] = []

    pairs = stats.get("claim_stat_pairs", [])
    tested_pairs = [
        (p["mean"], p["n"], p.get("claim", ""))
        for p in pairs
        if p.get("mean") is not None and p.get("n") is not None
    ]

    # If proximity pairing found nothing, try all means × first n
    if not tested_pairs:
        all_means = stats.get("means", [])
        all_ns = stats.get("sample_sizes", [])
        if all_means and all_ns:
            for mean_obj in all_means:
                for n in all_ns:
                    tested_pairs.append((mean_obj, n, ""))

    for mean_obj, n, claim_text in tested_pairs:
        if isinstance(mean_obj, dict):
            value = mean_obj.get("value")
            decimal_places = mean_obj.get("decimal_places", 2)
        else:
            value = float(mean_obj)
            decimal_places = 2

        if value is None or n is None or n <= 0:
            continue

        result = _grim_check(value, n, decimal_places)
        record = {
            "mean": value,
            "n": n,
            "decimal_places": decimal_places,
            "claim_snippet": claim_text[:120] if claim_text else None,
            **result,
        }
        if result["verdict"] == "FAIL":
            failures.append(record)
        else:
            passed.append(record)

    grim_risk = "none"
    if failures:
        grim_risk = "high" if len(failures) >= 2 else "medium"

    return {
        "failures": failures,
        "passed": passed,
        "total_tested": len(tested_pairs),
        "failure_count": len(failures),
        "risk": grim_risk,
    }


def _grim_check(mean: float, n: int, decimal_places: int) -> Dict:
    """
    GRIM formula:
        expected_sum = mean × n
        If expected_sum rounds to an integer within tolerance → PASS
        Otherwise → FAIL

    Tolerance = 0.5 / 10^decimal_places  (half a unit in last place, both sides)
    """
    expected_sum = mean * n
    nearest_int = round(expected_sum)
    tolerance = GRIM_TOLERANCE_MULTIPLIER / (10 ** decimal_places)
    deviation = abs(expected_sum - nearest_int)

    verdict = "PASS" if deviation <= tolerance else "FAIL"
    return {
        "verdict": verdict,
        "expected_sum": round(expected_sum, 6),
        "nearest_integer": nearest_int,
        "deviation": round(deviation, 6),
        "tolerance": round(tolerance, 6),
    }


# ---------------------------------------------------------------------------
# 2. p-Curve Analysis
# ---------------------------------------------------------------------------

def _run_p_curve(p_values: List[float]) -> Dict[str, Any]:
    """
    p-Curve using the pp-value approach (Simonsohn et al. 2014).

    Among p-values that are significant (< 0.05):
      - Under genuine effects, the distribution should be right-skewed
        → more values in [0, 0.025) than [0.025, 0.05)
      - Under p-hacking, values cluster near 0.05
        → roughly equal or reversed proportions

    Statistical test: one-sided binomial test.
      H0: prob of p < 0.025 given p < 0.05 = 0.5 (uniform / no effects)
      H1: prob > 0.5 (right-skewed / genuine effects)

    Verdict:
      right_skewed + binom p < 0.05  → "evidential"
      insufficient data               → "insufficient_data"
      flat / left-skewed              → "suspicious" (possible p-hacking)
    """
    sig_p = [p for p in p_values if 0 < p < 0.05]

    if len(sig_p) < P_CURVE_MIN_VALUES:
        return {
            "p_values_analysed": sig_p,
            "count_below_025": 0,
            "count_025_to_05": 0,
            "proportion_right": None,
            "binomial_p": None,
            "verdict": "insufficient_data",
            "note": f"Need ≥{P_CURVE_MIN_VALUES} significant p-values; found {len(sig_p)}.",
        }

    below_025 = [p for p in sig_p if p < 0.025]
    above_025 = [p for p in sig_p if p >= 0.025]
    proportion_right = len(below_025) / len(sig_p)

    # One-sided binomial test: H0 = 0.5
    binom_result = scipy_stats.binomtest(
        k=len(below_025), n=len(sig_p), p=0.5, alternative="greater"
    )
    binom_p = round(binom_result.pvalue, 4)

    if proportion_right > 0.5 and binom_p < 0.05:
        verdict = "evidential"
    elif proportion_right <= 0.5:
        verdict = "suspicious"
    else:
        verdict = "inconclusive"

    return {
        "p_values_analysed": sig_p,
        "count_below_025": len(below_025),
        "count_025_to_05": len(above_025),
        "proportion_right": round(proportion_right, 3),
        "binomial_p": binom_p,
        "verdict": verdict,
    }


# ---------------------------------------------------------------------------
# 3. Small-Sample Flagging
# ---------------------------------------------------------------------------

def _run_sample_size_check(sample_sizes: List[int]) -> Dict[str, Any]:
    high_risk = [n for n in sample_sizes if n < SMALL_SAMPLE_HIGH]
    medium_risk = [n for n in sample_sizes if SMALL_SAMPLE_HIGH <= n < SMALL_SAMPLE_WARN]

    flags = []
    for n in high_risk:
        flags.append({"n": n, "risk": "high", "reason": f"n={n} is critically underpowered (<{SMALL_SAMPLE_HIGH})"})
    for n in medium_risk:
        flags.append({"n": n, "risk": "medium", "reason": f"n={n} may be underpowered (<{SMALL_SAMPLE_WARN})"})

    overall = "none"
    if high_risk:
        overall = "high"
    elif medium_risk:
        overall = "medium"

    return {
        "flags": flags,
        "high_risk_count": len(high_risk),
        "medium_risk_count": len(medium_risk),
        "risk": overall,
    }


# ---------------------------------------------------------------------------
# 4. Funding Conflict Detection
# ---------------------------------------------------------------------------

def _run_funding_conflict(graph_results: Optional[Dict]) -> Dict[str, Any]:
    """
    Check funders found in the citation graph against known conflict keywords.
    graph_results.papers[*].funders is the source (set in Phase 3 via CrossRef).
    """
    if not graph_results:
        return {"conflicts": [], "risk": "no_data"}

    all_funders: List[str] = []
    for paper in graph_results.get("papers", []):
        all_funders.extend(paper.get("funders", []))

    conflicts: List[Dict] = []
    seen = set()

    for funder in all_funders:
        funder_lower = funder.lower()
        for keyword in _INDUSTRY_CONFLICT_KEYWORDS:
            if keyword in funder_lower and funder not in seen:
                conflicts.append({
                    "funder": funder,
                    "matched_keyword": keyword,
                    "risk": "high" if any(
                        k in funder_lower for k in ["tobacco", "purdue", "insys"]
                    ) else "medium",
                })
                seen.add(funder)
                break

    risk = "none"
    if conflicts:
        high = [c for c in conflicts if c["risk"] == "high"]
        risk = "high" if high else "medium"

    return {
        "conflicts": conflicts,
        "funders_checked": list(set(all_funders)),
        "conflict_count": len(conflicts),
        "risk": risk,
    }


# ---------------------------------------------------------------------------
# Overall risk aggregation
# ---------------------------------------------------------------------------

def _compute_overall_risk(
    grim: Dict, p_curve: Dict, sample_flags: Dict, funding: Dict
) -> str:
    """
    Aggregate four sub-scores into a single fraud risk level.

    Scoring:
      high sub-score   → 3 points
      medium           → 1 point
      suspicious p-curve → 2 points
      none/low/no_data → 0 points

    Total:
      ≥ 4 → high
      1-3 → medium
      0   → low
    """
    score = 0

    risk_map = {"high": 3, "medium": 1, "none": 0, "no_data": 0,
                "low": 0, "insufficient_data": 0}

    score += risk_map.get(grim.get("risk", "none"), 0)
    score += risk_map.get(sample_flags.get("risk", "none"), 0)
    score += risk_map.get(funding.get("risk", "none"), 0)

    p_verdict = p_curve.get("verdict", "")
    if p_verdict == "suspicious":
        score += 2
    elif p_verdict == "inconclusive":
        score += 1

    if score >= 4:
        return "high"
    elif score >= 1:
        return "medium"
    return "low"
