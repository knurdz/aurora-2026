"""
audit_reporter.py
Phase 5 — Structured Markdown audit report generator.

Consumes the scored integrity result alongside raw agent outputs to produce
a human-readable report for government analysts. Stored in
DocumentState.audit_report as a Markdown string.

Sections:
  1. Executive Summary
  2. Citation Integrity
  3. Statistical Integrity
  4. Funding & Conflicts
  5. Uncited Scientific Claims
  6. Methodology Notes
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_audit_report(
    score_result: Dict[str, Any],
    claims: List[Dict],
    graph_results: Optional[Dict],
    fraud_results: Optional[Dict],
    filename: str,
) -> str:
    """
    Generate a full Markdown audit report.

    Args:
        score_result:  output of integrity_scorer.compute_integrity_score()
        claims:        DocumentState.claims
        graph_results: DocumentState.graph_results
        fraud_results: DocumentState.fraud_results
        filename:      original uploaded filename

    Returns:
        Markdown string → stored in DocumentState.audit_report
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    score = score_result["score"]
    verdict = score_result["verdict"]
    breakdown = score_result.get("breakdown", {})

    sections = [
        _header(filename, now),
        _executive_summary(score, verdict, breakdown, graph_results, fraud_results, claims),
        _citation_integrity(graph_results),
        _statistical_integrity(fraud_results),
        _funding_conflicts(fraud_results),
        _uncited_claims(claims),
        _methodology_notes(fraud_results, graph_results, claims),
    ]

    return "\n\n---\n\n".join(s for s in sections if s.strip())


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------

def _header(filename: str, timestamp: str) -> str:
    return (
        f"# Integrity Audit Report\n\n"
        f"**Document:** `{filename}`  \n"
        f"**Generated:** {timestamp}  \n"
        f"**System:** VeriScholar Aurora 2026 / Phase 5"
    )


def _executive_summary(
    score: float,
    verdict: str,
    breakdown: Dict,
    graph_results: Optional[Dict],
    fraud_results: Optional[Dict],
    claims: List[Dict],
) -> str:
    integrity_emoji = {
        "HIGH": "🟢", "MEDIUM": "🟡", "LOW": "🔴", "CRITICAL": "⛔"
    }.get(verdict, "⚪")
    risk_verdict = _risk_verdict_from_integrity(verdict)
    risk_emoji = {
        "LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🔴", "CRITICAL": "⛔"
    }.get(risk_verdict, "⚪")

    # Build a prose summary of the most significant findings
    findings = []

    if graph_results:
        retracted = graph_results.get("community_analysis", {}).get("retracted_papers", [])
        if retracted:
            findings.append(
                f"{len(retracted)} retracted paper(s) cited within this document"
            )
        cartels = graph_results.get("community_analysis", {}).get("suspicious_clusters", [])
        if cartels:
            findings.append(
                f"{len(cartels)} citation cluster(s) flagged for potential cartel behaviour"
            )

    if fraud_results:
        grim_fails = fraud_results.get("grim", {}).get("failure_count", 0)
        if grim_fails:
            findings.append(
                f"{grim_fails} statistically impossible mean(s) detected (GRIM test)"
            )
        p_verdict = fraud_results.get("p_curve", {}).get("verdict", "")
        if p_verdict == "suspicious":
            findings.append("p-value distribution is consistent with p-hacking")
        funding_n = fraud_results.get("funding_conflicts", {}).get("conflict_count", 0)
        if funding_n:
            findings.append(
                f"{funding_n} funding source(s) with documented bias associations"
            )

    uncited_n = sum(1 for c in claims if not c.get("has_citation", True))
    if uncited_n:
        findings.append(f"{uncited_n} scientific claim(s) lack nearby citations")

    if findings:
        findings_text = (
            "Key findings:\n" + "\n".join(f"- {f}" for f in findings)
        )
    else:
        findings_text = "No significant integrity issues detected."

    return (
        f"## Executive Summary\n\n"
        f"**Integrity Score:** `{score:.4f} / 1.0000`  \n"
        f"**Integrity Rating:** {integrity_emoji} **{verdict}**  \n"
        f"**Risk Verdict:** {risk_emoji} **{risk_verdict}**\n\n"
        f"{findings_text}\n\n"
        f"### Score Breakdown\n\n"
        f"| Signal | Deduction |\n"
        f"|--------|-----------|\n"
        + "\n".join(
            f"| {_label(k)} | `{v:+.4f}` |"
            for k, v in breakdown.items()
            if v != 0.0
        )
        + (
            f"\n| **Final Score** | **`{score:.4f}`** |"
        )
    )


def _risk_verdict_from_integrity(verdict: str) -> str:
    return {
        "HIGH": "LOW",
        "MEDIUM": "MEDIUM",
        "LOW": "HIGH",
        "CRITICAL": "CRITICAL",
    }.get(verdict, "UNKNOWN")


def _citation_integrity(graph_results: Optional[Dict]) -> str:
    if not graph_results:
        return "## Citation Integrity\n\n_No graph data available._"

    lines = ["## Citation Integrity"]

    resolved = graph_results.get("resolved_count", 0)
    failed = graph_results.get("failed_count", 0)
    lines.append(
        f"\n**Reference entries resolved:** {resolved}  \n"
        f"**Reference entries unresolvable:** {failed}"
    )

    community = graph_results.get("community_analysis", {})

    # Retracted papers
    retracted = community.get("retracted_papers", [])
    if retracted:
        lines.append("\n### ⚠️ Retracted Papers Cited\n")
        for p in retracted:
            lines.append(f"- **{p.get('title', 'Unknown title')}**  \n  DOI: `{p.get('doi', 'N/A')}`")
    else:
        lines.append("\n✅ No retracted papers detected in citation set.")

    # Cartel clusters
    cartels = community.get("suspicious_clusters", [])
    if cartels:
        lines.append("\n### 🔴 Suspicious Citation Clusters\n")
        for c in cartels:
            lines.append(
                f"- **Community {c['community_id']}** — {len(c['members'])} papers  \n"
                f"  Internal density: `{c['density']}` | Risk: **{c['risk_level'].upper()}**  \n"
                f"  Internal edges: {c['internal_edges']}"
            )
    else:
        lines.append("\n✅ No citation cartel clusters detected.")

    mod = community.get("modularity_score", 0.0)
    lines.append(f"\n**Community modularity score:** `{mod}`")

    return "\n".join(lines)


def _statistical_integrity(fraud_results: Optional[Dict]) -> str:
    if not fraud_results:
        return "## Statistical Integrity\n\n_No fraud detection data available._"

    lines = ["## Statistical Integrity"]

    stats = fraud_results.get("stats_extracted", {})
    lines.append(
        f"\n**Statistics extracted:** "
        f"{stats.get('p_value_count', 0)} p-values, "
        f"{stats.get('sample_size_count', 0)} sample sizes, "
        f"{stats.get('mean_count', 0)} means, "
        f"{stats.get('effect_size_count', 0)} effect sizes"
    )

    # GRIM
    grim = fraud_results.get("grim", {})
    lines.append(f"\n### GRIM Test\n")
    lines.append(
        f"Tested: {grim.get('total_tested', 0)} mean/n pairs | "
        f"Failures: {grim.get('failure_count', 0)} | "
        f"Risk: **{grim.get('risk', 'none').upper()}**"
    )
    for f in grim.get("failures", []):
        snippet = f.get("claim_snippet") or ""
        lines.append(
            f"\n- Mean `{f['mean']}`, n=`{f['n']}` — expected sum `{f['expected_sum']}`, "
            f"nearest integer `{f['nearest_integer']}`, deviation `{f['deviation']}`"
            + (f"\n  > _{snippet}_" if snippet else "")
        )

    # p-curve
    pc = fraud_results.get("p_curve", {})
    lines.append(f"\n### p-Curve Analysis\n")
    verdict_map = {
        "evidential": "✅ Evidential — distribution consistent with genuine effects",
        "suspicious": "🔴 Suspicious — distribution consistent with p-hacking",
        "inconclusive": "🟡 Inconclusive",
        "insufficient_data": "⚪ Insufficient data",
    }
    pc_verdict = pc.get("verdict", "insufficient_data")
    lines.append(verdict_map.get(pc_verdict, pc_verdict))
    if pc.get("binomial_p") is not None:
        lines.append(
            f"\nSignificant p-values analysed: {len(pc.get('p_values_analysed', []))}  \n"
            f"Below 0.025: {pc.get('count_below_025', 0)} | "
            f"0.025–0.05: {pc.get('count_025_to_05', 0)}  \n"
            f"Proportion right: `{pc.get('proportion_right')}` | "
            f"Binomial p: `{pc.get('binomial_p')}`"
        )
    elif pc.get("note"):
        lines.append(f"\n_{pc['note']}_")

    # Small-sample
    sf = fraud_results.get("sample_size_flags", {})
    lines.append(f"\n### Small-Sample Flags\n")
    flags = sf.get("flags", [])
    if flags:
        for f in flags:
            lines.append(f"- n=`{f['n']}` — {f['reason']} (**{f['risk'].upper()}**)")
    else:
        lines.append("✅ No underpowered studies detected.")

    return "\n".join(lines)


def _funding_conflicts(fraud_results: Optional[Dict]) -> str:
    if not fraud_results:
        return "## Funding & Conflicts\n\n_No data available._"

    lines = ["## Funding & Conflicts"]

    fc = fraud_results.get("funding_conflicts", {})
    all_funders = fc.get("funders_checked", [])
    conflicts = fc.get("conflicts", [])

    lines.append(
        f"\n**Funders checked:** {len(all_funders)}  \n"
        f"**Conflicts detected:** {len(conflicts)}  \n"
        f"**Risk:** **{fc.get('risk', 'none').upper()}**"
    )

    if conflicts:
        lines.append("\n### Flagged Funders\n")
        for c in conflicts:
            lines.append(
                f"- **{c['funder']}**  \n"
                f"  Matched keyword: `{c['matched_keyword']}` | "
                f"Risk: **{c['risk'].upper()}**"
            )
    else:
        lines.append("\n✅ No industry funding conflicts detected.")

    return "\n".join(lines)


def _uncited_claims(claims: List[Dict]) -> str:
    uncited = [c for c in claims if not c.get("has_citation", True)]
    lines = ["## Uncited Scientific Claims"]

    lines.append(
        f"\n**Total scientific claims:** {len(claims)}  \n"
        f"**Claims lacking nearby citation:** {len(uncited)}"
    )

    if uncited:
        lines.append("\n### Sample Uncited Claims (first 10)\n")
        for c in uncited[:10]:
            text = c.get("text", "").strip()
            page = c.get("page_number", "?")
            lines.append(f"- _(Page {page})_ {text[:200]}" + ("…" if len(text) > 200 else ""))
    else:
        lines.append("\n✅ All extracted scientific claims have nearby citations.")

    return "\n".join(lines)


def _methodology_notes(
    fraud_results: Optional[Dict],
    graph_results: Optional[Dict],
    claims: List[Dict],
) -> str:
    lines = ["## Methodology Notes"]

    checks_run = []
    checks_skipped = []

    if graph_results:
        checks_run.append("CrossRef DOI resolution")
        checks_run.append("Semantic Scholar enrichment")
        checks_run.append("Neo4j citation graph construction")
        checks_run.append("Louvain community detection (cartel analysis)")
        checks_run.append("Retraction status check (CrossRef update-to field)")
    else:
        checks_skipped.append("Citation graph — no citations detected in document")

    if fraud_results:
        checks_run.append("Statistical value extraction (regex + LLM fallback)")
        checks_run.append("Funding conflict detection")

        grim_tested = fraud_results.get("grim", {}).get("total_tested", 0)
        if grim_tested > 0:
            checks_run.append(f"GRIM test ({grim_tested} mean/n pairs)")
        else:
            checks_skipped.append("GRIM test — no co-located mean + sample size pairs found")

        pc_verdict = fraud_results.get("p_curve", {}).get("verdict", "")
        if pc_verdict == "insufficient_data":
            note = fraud_results.get("p_curve", {}).get("note", "")
            checks_skipped.append(f"p-curve analysis — {note}")
        else:
            checks_run.append("p-curve analysis (Simonsohn et al. 2014 pp-value method)")

        sf_flags = fraud_results.get("sample_size_flags", {}).get("flags", [])
        if sf_flags:
            checks_run.append(f"Small-sample flagging ({len(sf_flags)} instance(s) flagged)")
        else:
            checks_run.append("Small-sample flagging (no underpowered studies detected)")
    else:
        checks_skipped.append("All fraud detection checks — fraud_results unavailable")

    if claims:
        checks_run.append(f"Shadow citation detection ({len(claims)} claims classified)")

    lines.append("\n**Checks completed:**")
    for c in checks_run:
        lines.append(f"- {c}")

    if checks_skipped:
        lines.append("\n**Checks skipped / insufficient data:**")
        for c in checks_skipped:
            lines.append(f"- {c}")

    lines.append(
        "\n_All scores are computed deterministically from extracted document signals. "
        "This report is intended as analyst decision support, not a final legal determination._"
    )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _label(key: str) -> str:
    return {
        "retracted_papers":  "Retracted papers cited",
        "citation_cartels":  "Citation cartel clusters",
        "grim_failures":     "GRIM test failures",
        "p_curve":           "p-curve signal",
        "small_sample":      "Underpowered studies",
        "funding_conflicts":  "Funding conflicts",
        "uncited_claims":    "Uncited scientific claims",
    }.get(key, key.replace("_", " ").title())
