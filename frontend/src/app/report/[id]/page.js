'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import AuthGate from '../../../components/AuthGate';
import Navbar from '../../../components/Navbar';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleGauge,
  Download,
  FileText,
  ListChecks,
  SearchCheck,
  Settings,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { getAnalysis, getCurrentUser } from '../../../lib/api';

const SCORE_LABELS = {
  retracted_papers: 'Retracted papers cited',
  citation_cartels: 'Citation cartel clusters',
  grim_failures: 'GRIM test failures',
  p_curve: 'p-curve signal',
  small_sample: 'Underpowered studies',
  funding_conflicts: 'Funding conflicts',
  uncited_claims: 'Uncited scientific claims',
};

const VERDICT_CONFIG = {
  LOW: {
    tone: 'critical',
    label: 'Low Integrity',
    title: 'Multiple integrity concerns detected',
    summary: 'The paper has significant audit findings that deserve analyst review.',
    color: 'var(--accent-rose)',
    icon: ShieldAlert,
  },
  MEDIUM: {
    tone: 'warning',
    label: 'Medium Integrity',
    title: 'Some integrity signals need review',
    summary: 'The audit found signals worth checking before relying on this paper.',
    color: 'var(--accent-amber)',
    icon: AlertTriangle,
  },
  HIGH: {
    tone: 'good',
    label: 'High Integrity',
    title: 'Research integrity looks steady',
    summary: 'The audit did not surface major integrity concerns in the available evidence.',
    color: 'var(--accent-emerald)',
    icon: ShieldCheck,
  },
  CRITICAL: {
    tone: 'critical',
    label: 'Critical Risk',
    title: 'Severe integrity concerns detected',
    summary: 'The audit found severe signals that may materially affect trust in this paper.',
    color: 'var(--accent-rose)',
    icon: ShieldAlert,
  },
  UNKNOWN: {
    tone: 'neutral',
    label: 'Unknown Risk',
    title: 'Audit completed with limited scoring data',
    summary: 'The report is available, but the score verdict was not returned by the backend.',
    color: 'var(--text-secondary)',
    icon: CircleGauge,
  },
};

const markdownComponents = {
  h1: ({ children }) => <MarkdownHeading level={1}>{children}</MarkdownHeading>,
  h2: ({ children }) => <MarkdownHeading level={2}>{children}</MarkdownHeading>,
  h3: ({ children }) => <MarkdownHeading level={3}>{children}</MarkdownHeading>,
  table: ({ children }) => <div className="report-table-wrap"><table>{children}</table></div>,
};

export default function ReportPage() {
  return (
    <AuthGate>
      <ReportContent />
    </AuthGate>
  );
}

function ReportContent() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getAnalysis(id);
        setData(res);
        if (res && res.status === 'processing') {
          router.replace(`/analyze/${id}`);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    async function fetchUser() {
      try {
        const userData = await getCurrentUser();
        if (userData.authenticated) {
          setUser(userData.user);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchData();
    fetchUser();
  }, [id, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="report-shell">
          <div className="glass-panel report-empty-state">
            <CircleGauge size={28} />
            <p>Loading report...</p>
          </div>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <main className="report-shell">
          <div className="glass-panel report-empty-state">
            <XCircle size={28} />
            <p>Report not found.</p>
          </div>
        </main>
      </>
    );
  }

  if (data.status === 'processing') {
    return (
      <>
        <Navbar />
        <main className="report-shell">
          <div className="glass-panel report-empty-state">
            <CircleGauge size={28} />
            <p>Analysis in progress. Redirecting...</p>
          </div>
        </main>
      </>
    );
  }

  if (data.status === 'failed') {
    return (
      <>
        <Navbar />
        <main className="report-shell">
          <div className="glass-panel report-empty-state report-empty-state-critical">
            <XCircle size={30} />
            <h1>Analysis failed</h1>
            <p>{data.error || 'The audit pipeline failed before a report could be generated.'}</p>
          </div>
        </main>
      </>
    );
  }

  const score = typeof data.integrity_score === 'number' ? data.integrity_score : 0;
  const verdict = (data.integrity_verdict || getVerdictFromScore(score)).toUpperCase();
  const verdictConfig = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.UNKNOWN;
  const VerdictIcon = verdictConfig.icon;
  const scorePercent = Math.round(score * 100);
  const scoreAngle = Math.max(0, Math.min(score, 1)) * 360;
  const deductions = getDeductions(data.score_breakdown);
  const sectionLinks = getSectionLinks(data.audit_report);
  const retractedCount = Array.isArray(data.retracted_papers) ? data.retracted_papers.length : 0;
  const suspiciousClusters = Number(data.suspicious_clusters || 0);
  const grimFailures = Number(data.grim_failures || 0);
  const fundingConflicts = Number(data.funding_conflicts || 0);
  const pCurveVerdict = formatValue(data.p_curve_verdict);
  const cartelRisk = formatValue(data.cartel_risk);
  const fraudRisk = formatValue(data.fraud_risk);
  const referenceCount = data.reference_count ?? data.citations_found;
  const citationMentionCount = data.citation_mentions_found;
  const citationTone = getPanelTone(data.cartel_risk, retractedCount + suspiciousClusters);
  const statsTone = getPanelTone(data.fraud_risk || data.p_curve_verdict, grimFailures + fundingConflicts);
  const claimTone = deductions.some((item) => item.key === 'uncited_claims') ? 'warning' : 'good';
  const methodologyTone = data.audit_report ? 'good' : 'neutral';

  const claimsVal = data.claims_found ?? 0;
  const citationsVal = referenceCount ?? 0;
  const mentionsVal = typeof citationMentionCount === 'number' ? citationMentionCount : 0;
  const anomaliesVal = retractedCount + suspiciousClusters + grimFailures;
  const pagesVal = data.pages_parsed ?? 0;

  const maxVal = Math.max(1, claimsVal, citationsVal, mentionsVal, anomaliesVal, pagesVal);

  let highlightIndex = 0;
  if (anomaliesVal > 0) {
    highlightIndex = 3; // index of Anomalies
  } else {
    const vals = [claimsVal, citationsVal, mentionsVal, anomaliesVal, pagesVal];
    const maxIdx = vals.indexOf(maxVal);
    highlightIndex = maxIdx !== -1 ? maxIdx : 0;
  }

  const chartColumns = [
    { key: 'claims', label: 'Claims', value: claimsVal, shortLabel: 'CLM', color: '#3b82f6' },
    { key: 'citations', label: 'Citations', value: citationsVal, shortLabel: 'CIT', color: '#10b981' },
    { key: 'mentions', label: 'Mentions', value: mentionsVal, shortLabel: 'MEN', color: '#f59e0b' },
    { key: 'anomalies', label: 'Anomalies', value: anomaliesVal, shortLabel: 'ANM', color: '#ef4444' },
    { key: 'pages', label: 'Pages', value: pagesVal, shortLabel: 'PAG', color: '#6366f1' },
  ];

  return (
    <>
      <Navbar />
      <main className="report-shell">
        {/* Sub-navbar matching the dashboard */}
        <section className="twisty-subnav" style={{ marginBottom: 0 }}>
          <div className="twisty-nav-group">
            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button className="icon-button" style={{ borderRadius: '50%' }} title="System Settings" onClick={() => router.push('/settings')}>
              <Settings size={16} />
            </button>
            {user?.picture_url ? (
              <img 
                src={user.picture_url} 
                alt={user.name || "Profile"} 
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.9rem', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </section>

        <section className={`report-hero tone-${verdictConfig.tone}`}>
          <div className="report-hero-copy">
            <div className="report-eyebrow">
              <VerdictIcon size={18} />
              <span>{verdictConfig.label}</span>
            </div>
            <h1>{verdictConfig.title}</h1>
            <p>{verdictConfig.summary}</p>

            <div className="report-meta-row">
              <span title={data.filename}>
                <FileText size={16} />
                {data.filename || 'Unknown document'}
              </span>
              <span>
                <ListChecks size={16} />
                {formatDate(data.timestamp)}
              </span>
            </div>
          </div>

          <div className="report-score-card" aria-label={`Integrity score ${scorePercent}%`}>
            <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="48" 
                  fill="none" 
                  stroke="rgba(15, 23, 42, 0.05)" 
                  strokeWidth="8" 
                />
                {/* Foreground score circle */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="48" 
                  fill="none" 
                  stroke={verdictConfig.color} 
                  strokeWidth="8" 
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - score)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.35s ease' }}
                />
              </svg>
              <span style={{ position: 'absolute', fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {scorePercent}%
              </span>
            </div>
            <div className="report-score-copy">
              <p>Integrity Score</p>
              <strong>{verdictConfig.label}</strong>
            </div>
            <button className="btn-secondary report-export-button" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '999px', padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}>
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </section>

        <section className="report-signal-grid" aria-label="Audit signals">
          <SignalCard
            icon={BookOpen}
            title="Citation Integrity"
            status={getCitationStatus(retractedCount, suspiciousClusters, cartelRisk)}
            tone={citationTone}
          >
            <MiniStat label="Resolved" value={formatNumber(data.citations_resolved)} />
            <MiniStat label="Clusters" value={formatNumber(suspiciousClusters)} />
            <MiniStat label="Retracted" value={formatNumber(retractedCount)} />
          </SignalCard>

          <SignalCard
            icon={Calculator}
            title="Statistical Integrity"
            status={getStatsStatus(grimFailures, fundingConflicts, fraudRisk, pCurveVerdict)}
            tone={statsTone}
          >
            <MiniStat label="GRIM fails" value={formatNumber(grimFailures)} />
            <MiniStat label="p-curve" value={pCurveVerdict} />
            <MiniStat label="Conflicts" value={formatNumber(fundingConflicts)} />
          </SignalCard>

          <SignalCard
            icon={SearchCheck}
            title="Claim Support"
            status={claimTone === 'warning' ? 'Uncited claim penalties detected' : 'No claim support deduction'}
            tone={claimTone}
          >
            <MiniStat label="Claims" value={formatNumber(data.claims_found)} />
            <MiniStat label="Pages" value={formatNumber(data.pages_parsed)} />
            <MiniStat label="Deduction" value={formatDeduction(data.score_breakdown?.uncited_claims)} />
          </SignalCard>

          <SignalCard
            icon={CheckCircle2}
            title="Audit Coverage"
            status={data.audit_report ? 'Narrative report generated' : 'Narrative report unavailable'}
            tone={methodologyTone}
          >
            <MiniStat label="References" value={formatNumber(referenceCount)} />
            {typeof citationMentionCount === 'number' && (
              <MiniStat label="Mentions" value={formatNumber(citationMentionCount)} />
            )}
            <MiniStat label="Fraud risk" value={fraudRisk} />
          </SignalCard>
        </section>

        {/* Audit Analytics & Metric Distribution Cards */}
        <div className="twisty-layout-grid">
          {/* Card 1: Score Deductions Analysis */}
          <div className="twisty-chart-card">
            <div className="twisty-chart-header" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Score Deductions Analysis
                </h2>
                <p className="twisty-chart-subheader" style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                  Analysis of integrity penalties applied to the manuscript score.
                </p>
              </div>
              <div className="twisty-select-badge" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                <span>Penalties</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
              {deductions.map((item) => {
                const magnitudePercent = Math.round(item.magnitude * 100);
                return (
                  <div key={item.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {item.label}
                      </span>
                      <strong style={{ color: 'var(--accent-rose)' }}>
                        -{magnitudePercent}%
                      </strong>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, magnitudePercent)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #f97316, var(--accent-rose))',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                );
              })}

              {deductions.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.04)', borderRadius: '18px', border: '1px dashed rgba(16, 185, 129, 0.15)', gap: '0.75rem' }}>
                  <ShieldCheck size={36} style={{ color: 'var(--accent-emerald)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Perfect Integrity Alignment</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      No score deductions were applied. 100% of the integrity score was preserved.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Volume Metrics Distribution */}
          <div className="twisty-chart-card">
            <div className="twisty-chart-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Volume Metrics Distribution
                </h2>
                <p className="twisty-chart-subheader" style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                  Distribution of isolated claims, resolved citations, mentions, and anomalies.
                </p>
              </div>
              <div className="twisty-select-badge" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                <span>Scanned Volume</span>
              </div>
            </div>

            <div className="twisty-chart-summary" style={{ marginBottom: '1.5rem' }}>
              <div className="twisty-percentage-grow" style={{ fontSize: '2rem' }}>
                {claimsVal + citationsVal + mentionsVal}
                <span style={{ fontSize: '0.82rem', marginTop: '0.2' }}>Total items isolated and processed in manuscript</span>
              </div>
            </div>

            <div className="twisty-bar-chart" style={{ marginTop: '1rem', height: '170px' }}>
              {chartColumns.map((col, idx) => {
                const isHighlighted = idx === highlightIndex;
                const heightPx = Math.max(15, Math.round((col.value / maxVal) * 100));

                if (isHighlighted) {
                  return (
                    <div className="twisty-bar-col" key={col.key}>
                      <div className="twisty-bar-highlight-pill" style={{ height: '165px' }}>
                        <span className="twisty-tooltip-val" style={{ background: '#0f172a' }}>
                          {col.value} {col.label.toLowerCase()}
                        </span>
                        <div className="twisty-bar-line" style={{ height: `${heightPx}px`, background: 'rgba(255, 255, 255, 0.25)' }}>
                          <div className="twisty-bar-dot" style={{ background: '#ffffff' }} />
                        </div>
                        <div className="twisty-day-badge" style={{ background: '#ffffff', color: '#0f172a' }}>
                          {col.shortLabel}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="twisty-bar-col" key={col.key}>
                      <span style={{ position: 'absolute', top: '-1.5rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {col.value}
                      </span>
                      <div className="twisty-bar-line" style={{ height: `${heightPx}px`, background: 'rgba(15, 23, 42, 0.08)' }}>
                        <div className="twisty-bar-dot" style={{ background: col.color }} />
                      </div>
                      <div className="twisty-day-badge">
                        {col.shortLabel}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>

        <section className="report-workspace">
          <aside className="report-aside" aria-label="Report navigation and score details">
            <div className="report-aside-panel">
              <div className="report-aside-heading">
                <BarChart3 size={18} />
                <h2>Score Deductions</h2>
              </div>
              {deductions.length > 0 ? (
                <div className="deduction-list">
                  {deductions.map((item) => (
                    <DeductionRow key={item.key} item={item} max={deductions[0].magnitude} />
                  ))}
                </div>
              ) : (
                <p className="report-muted">No score deductions were applied.</p>
              )}
            </div>

            <div className="report-aside-panel report-toc">
              <div className="report-aside-heading">
                <ArrowUpRight size={18} />
                <h2>Report Sections</h2>
              </div>
              {sectionLinks.length > 0 ? (
                <nav>
                  {sectionLinks.map((section) => (
                    <a key={section.id} href={`#${section.id}`}>{section.title}</a>
                  ))}
                </nav>
              ) : (
                <p className="report-muted">No section headings found.</p>
              )}
            </div>
          </aside>

          <article className="glass-panel report-content report-document">
            {data.audit_report ? (
              <ReactMarkdown components={markdownComponents}>{data.audit_report}</ReactMarkdown>
            ) : (
              <p>No text report available.</p>
            )}
          </article>
        </section>
      </main>
    </>
  );
}

function SignalCard({ icon: Icon, title, status, tone, children }) {
  return (
    <div className={`report-signal-card tone-${tone}`}>
      <div className="signal-card-header">
        <div className="signal-icon">
          <Icon size={20} />
        </div>
        <div>
          <h2>{title}</h2>
          <p>{status}</p>
        </div>
      </div>
      <div className="signal-stat-row">
        {children}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value ?? 'N/A'}</strong>
    </div>
  );
}

function DeductionRow({ item, max }) {
  const width = max > 0 ? Math.max(8, Math.round((item.magnitude / max) * 100)) : 0;

  return (
    <div className="deduction-row">
      <div className="deduction-row-label">
        <span>{item.label}</span>
        <strong>{item.value.toFixed(2)}</strong>
      </div>
      <div className="deduction-bar">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function MarkdownHeading({ level, children }) {
  const text = getText(children);
  const Tag = `h${level}`;

  return <Tag id={slugify(text)}>{children}</Tag>;
}

function getDeductions(breakdown = {}) {
  const entries = breakdown && typeof breakdown === 'object' ? Object.entries(breakdown) : [];

  return entries
    .map(([key, value]) => ({
      key,
      label: SCORE_LABELS[key] || titleize(key),
      value: Number(value || 0),
      magnitude: Math.abs(Number(value || 0)),
    }))
    .filter((item) => item.value < 0)
    .sort((a, b) => b.magnitude - a.magnitude);
}

function getSectionLinks(markdown = '') {
  const text = typeof markdown === 'string' ? markdown : '';
  const matches = Array.from(text.matchAll(/^##\s+(.+)$/gm));
  return matches.map((match) => {
    const title = stripMarkdown(match[1]);
    return {
      title,
      id: slugify(title),
    };
  });
}

function getVerdictFromScore(score) {
  if (score >= 0.8) return 'HIGH';
  if (score >= 0.55) return 'MEDIUM';
  if (score >= 0.3) return 'LOW';
  return 'CRITICAL';
}

function getPanelTone(risk, issueCount = 0) {
  const normalized = String(risk || '').toLowerCase();
  if (issueCount > 0 || normalized.includes('high') || normalized.includes('critical') || normalized.includes('suspicious')) {
    return 'critical';
  }
  if (normalized.includes('medium') || normalized.includes('inconclusive')) {
    return 'warning';
  }
  if (normalized.includes('low') || normalized.includes('none') || normalized.includes('evidential')) {
    return 'good';
  }
  return 'neutral';
}

function getCitationStatus(retractedCount, suspiciousClusters, cartelRisk) {
  if (retractedCount > 0) return `${retractedCount} retracted cited paper${retractedCount === 1 ? '' : 's'}`;
  if (suspiciousClusters > 0) return `${suspiciousClusters} suspicious citation cluster${suspiciousClusters === 1 ? '' : 's'}`;
  if (cartelRisk !== 'Unknown') return `Cartel risk: ${cartelRisk}`;
  return 'No major citation alerts';
}

function getStatsStatus(grimFailures, fundingConflicts, fraudRisk, pCurveVerdict) {
  if (grimFailures > 0) return `${grimFailures} GRIM failure${grimFailures === 1 ? '' : 's'} detected`;
  if (fundingConflicts > 0) return `${fundingConflicts} funding conflict${fundingConflicts === 1 ? '' : 's'} detected`;
  if (pCurveVerdict !== 'Unknown') return `p-curve: ${pCurveVerdict}`;
  return `Fraud risk: ${fraudRisk}`;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Date unavailable';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString();
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 'N/A';
  return new Intl.NumberFormat().format(numeric);
}

function formatDeduction(value) {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric) || numeric === 0) return '0.00';
  return numeric.toFixed(2);
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'Unknown';
  return titleize(String(value));
}

function titleize(value) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stripMarkdown(value) {
  return value
    .replace(/[`*_~]/g, '')
    .replace(/[^\w\s&/-]/g, '')
    .trim();
}

function slugify(value) {
  return stripMarkdown(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getText(children) {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getText).join('');
  if (children && typeof children === 'object' && 'props' in children) return getText(children.props.children);
  return '';
}
