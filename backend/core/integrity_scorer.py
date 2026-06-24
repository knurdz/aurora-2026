"""
integrity_scorer.py
Phase 5 — Weighted integrity score computation.

Starts at 1.0, applies deductions from each risk signal found across
graph_results and fraud_results. Score is clamped to [0.0, 1.0].

Deduction table:
  Retracted paper cited          -0.25 each  (cap -0.50)
  GRIM failure                   -0.15 each  (cap -0.30)
  p-curve suspicious             -0.20 flat
  p-curve inconclusive           -0.08 flat
  Small-sample high risk (n<10)  -0.10 each  (cap -0.20)
  Small-sample medium (n<30)     -0.04 each  (cap -0.12)
  Funding conflict high risk     -0.15 each  (cap -0.30)
  Funding conflict medium risk   -0.07 each  (cap -0.14)
  Citation cartel cluster        -0.10 each  (cap -0.20)
  Uncited scientific claims      -0.03 each  (cap -0.18)
"""

from typing import List, Dict, Any, Optional


# ---------------------------------------------------------------------------
# Score bands → human-readable verdict
# ---------------------------------------------------------------------------

def _verdict(score: float) -> str:
    if score >= 0.80:
        return "LOW"
    elif score >= 0.55:
        return "MEDIUM"
    elif score >= 0.30:
        return "HIGH"
    return "CRITICAL"


def _deduct(score: float, amount: float) -> float:
    return max(0.0, score - amount)


def _capped_deduction(items: list, per_item: float, cap: float) -> float:
    return min(cap, len(items) * per_item)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_integrity_score(
    claims: List[Dict],
    graph_results: Optional[Dict],
    fraud_results: Optional[Dict],
) -> Dict[str, Any]:
    """
    Compute a weighted integrity score over all Phase 3 + Phase 4 signals.

    Returns a dict (not a bare float) so the audit reporter and API
    response can surface per-signal deductions alongside the final score.
    """
    score = 1.0
    breakdown: Dict[str, float] = {}

    # ------------------------------------------------------------------
    # Graph signals (Phase 3)
    # ------------------------------------------------------------------
    if graph_results:
        community = graph_results.get("community_analysis", {})

        retracted = community.get("retracted_papers", [])
        d = _capped_deduction(retracted, 0.25, 0.50)
        score = _deduct(score, d)
        breakdown["retracted_papers"] = round(-d, 4)

        cartels = community.get("suspicious_clusters", [])
        d = _capped_deduction(cartels, 0.10, 0.20)
        score = _deduct(score, d)
        breakdown["citation_cartels"] = round(-d, 4)

    # ------------------------------------------------------------------
    # Fraud signals (Phase 4)
    # ------------------------------------------------------------------
    if fraud_results:
        # GRIM
        grim_failures = fraud_results.get("grim", {}).get("failures", [])
        d = _capped_deduction(grim_failures, 0.15, 0.30)
        score = _deduct(score, d)
        breakdown["grim_failures"] = round(-d, 4)

        # p-curve
        p_verdict = fraud_results.get("p_curve", {}).get("verdict", "")
        if p_verdict == "suspicious":
            score = _deduct(score, 0.20)
            breakdown["p_curve"] = -0.20
        elif p_verdict == "inconclusive":
            score = _deduct(score, 0.08)
            breakdown["p_curve"] = -0.08
        else:
            breakdown["p_curve"] = 0.0

        # Small-sample flags
        flags = fraud_results.get("sample_size_flags", {}).get("flags", [])
        high_flags = [f for f in flags if f["risk"] == "high"]
        med_flags  = [f for f in flags if f["risk"] == "medium"]
        d = _capped_deduction(high_flags, 0.10, 0.20) + \
            _capped_deduction(med_flags,  0.04, 0.12)
        score = _deduct(score, d)
        breakdown["small_sample"] = round(-d, 4)

        # Funding conflicts
        conflicts = fraud_results.get("funding_conflicts", {}).get("conflicts", [])
        high_conf = [c for c in conflicts if c["risk"] == "high"]
        med_conf  = [c for c in conflicts if c["risk"] == "medium"]
        d = _capped_deduction(high_conf, 0.15, 0.30) + \
            _capped_deduction(med_conf,  0.07, 0.14)
        score = _deduct(score, d)
        breakdown["funding_conflicts"] = round(-d, 4)

    # ------------------------------------------------------------------
    # Claim signals (Phase 2)
    # ------------------------------------------------------------------
    uncited = [c for c in claims if not c.get("has_citation", True)]
    d = _capped_deduction(uncited, 0.03, 0.18)
    score = _deduct(score, d)
    breakdown["uncited_claims"] = round(-d, 4)

    final_score = round(score, 4)
    return {
        "score": final_score,
        "verdict": _verdict(final_score),
        "breakdown": breakdown,
        "total_deductions": round(sum(breakdown.values()), 4),
    }
