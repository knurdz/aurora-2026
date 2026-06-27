'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '../../components/AuthGate';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { createApiKey, getApiBase, getApiKeys, getDashboardSummary, revokeApiKey } from '../../lib/api';
import {
  Activity,
  Check,
  Clipboard,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  ArrowRight,
  Terminal,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const [summary, setSummary] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState('Production key');
  const [newSecret, setNewSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const apiBase = getApiBase();
  const displayBase = apiBase === '/api' ? 'https://verischolar.knurdz.org/api' : apiBase;

  async function loadDashboard() {
    setLoading(true);
    try {
      const [summaryData, keysData] = await Promise.all([getDashboardSummary(), getApiKeys()]);
      setSummary(summaryData);
      setApiKeys(keysData.api_keys || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDashboard() {
      try {
        const [summaryData, keysData] = await Promise.all([getDashboardSummary(), getApiKeys()]);
        if (cancelled) return;
        setSummary(summaryData);
        setApiKeys(keysData.api_keys || []);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeKeys = useMemo(() => apiKeys.filter((key) => !key.revoked_at), [apiKeys]);

  const handleCreateKey = async () => {
    setCreating(true);
    try {
      const data = await createApiKey(keyName);
      setNewSecret(data.secret);
      setApiKeys((prev) => [data.api_key, ...prev]);
      setKeyName('Production key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId) => {
    await revokeApiKey(keyId);
    setApiKeys((prev) => prev.map((key) => (
      key.id === keyId ? { ...key, revoked_at: new Date().toISOString() } : key
    )));
  };

  return (
    <>
      <Navbar />
      <main className="dashboard-shell">
        <section className="dashboard-header">
          <div>
            <div className="dashboard-eyebrow-badge">
              <Terminal size={12} /> Developer Console
            </div>
            <h1>API Access & Audits</h1>
            <p>Manage keys for secure server REST integrations and review your document integrity analyses.</p>
          </div>
          <button type="button" className="btn-secondary dashboard-refresh-btn" onClick={loadDashboard} style={{ borderRadius: '999px' }}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </section>

        {loading ? (
          <div className="glass-panel dashboard-loading">
            <Loader2 className="spin" size={24} />
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-secondary)' }}>Retrieving dashboard data...</p>
          </div>
        ) : (
          <>
            <section className="dashboard-metrics-grid">
              <Metric icon={Activity} label="Analyses Started" value={summary?.usage?.total_analyses ?? 0} className="metric-tile-blue" />
              <Metric icon={ShieldCheck} label="Processed Success" value={summary?.usage?.processed_analyses ?? 0} className="metric-tile-green" />
              <Metric icon={KeyRound} label="Active API Keys" value={`${activeKeys.length}/${summary?.usage?.limits?.active_api_keys ?? 5}`} className="metric-tile-purple" />
              <Metric icon={Loader2} label="Running Pipelines" value={`${summary?.usage?.active_analyses ?? 0}/${summary?.usage?.limits?.active_analyses ?? 1}`} className="metric-tile-amber" />
            </section>

            <section className="dashboard-panels-grid">
              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <div>
                    <h2>Authentication Keys</h2>
                    <p>Integrate VeriScholar with server daemons or automated research integrity pipelines.</p>
                  </div>
                  <KeyRound size={20} />
                </div>

                {newSecret && (
                  <div className="secret-reveal">
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong style={{ color: '#065f46', fontSize: '0.92rem' }}>Copy this key now</strong>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#047857' }}>It will not be displayed again for security purposes.</p>
                    </div>
                    <code style={{ fontSize: '0.85rem' }}>{newSecret}</code>
                    <button type="button" className="btn-secondary" onClick={() => navigator.clipboard?.writeText(newSecret)} style={{ borderRadius: '999px', width: 'fit-content', padding: '0.45rem 1.1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <Clipboard size={14} /> Copy to Clipboard
                    </button>
                  </div>
                )}

                <div className="key-create-row">
                  <input
                    value={keyName}
                    onChange={(event) => setKeyName(event.target.value)}
                    maxLength={80}
                    placeholder="Enter key name (e.g. Production client)"
                    aria-label="API key name"
                  />
                  <button type="button" className="btn-primary" onClick={handleCreateKey} disabled={creating} style={{ borderRadius: '999px', fontSize: '0.9rem' }}>
                    <Plus size={16} />
                    {creating ? 'Creating...' : 'Create Key'}
                  </button>
                </div>

                <div className="api-key-list-container">
                  {apiKeys.length === 0 ? (
                    <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No active API keys found.</p>
                  ) : apiKeys.map((key) => (
                    <div className="api-key-row-item" key={key.id}>
                      <div>
                        <strong>{key.name}</strong>
                        <code>{key.prefix}...</code>
                      </div>
                      <div className="key-meta">
                        {key.revoked_at ? (
                          <span className="revoked-badge">Revoked</span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{key.usage_total} calls</span>
                        )}
                        {!key.revoked_at && (
                          <button type="button" className="icon-button" title="Revoke key" onClick={() => handleRevoke(key.id)}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <div>
                    <h2>API Quick Start</h2>
                    <p>Submit manuscript files via simple shell commands or REST webhooks.</p>
                  </div>
                  <Terminal size={20} />
                </div>
                <pre>{`curl -X POST ${displayBase}/v1/analyses \\
  -H "Authorization: Bearer vs_live_..." \\
  -F "file=@paper.pdf"

curl ${displayBase}/v1/analyses/{analysis_id} \\
  -H "Authorization: Bearer vs_live_..."

# MCP Integration Endpoint
${displayBase}/mcp/`}</pre>
                <div className="quota-list" style={{ marginTop: '0.5rem' }}>
                  {(summary?.usage?.quota_windows || []).map((quota) => (
                    <div key={quota.bucket} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <Check size={14} style={{ color: '#10b981' }} />
                      <span>{quota.remaining} of {quota.limit} {quota.bucket.replaceAll('_', ' ')} remaining</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="dashboard-card-panel" style={{ paddingBottom: '1.25rem' }}>
              <div className="dashboard-card-header">
                <div>
                  <h2>Recent Analyses</h2>
                  <p>Track audit jobs launched from your account dashboard or integrations.</p>
                </div>
                <Link className="btn-secondary" href="/audit" style={{ borderRadius: '999px', fontSize: '0.88rem', padding: '0.55rem 1.15rem' }}>
                  Run New Audit
                </Link>
              </div>
              <div className="recent-analyses-container">
                {(summary?.recent_analyses || []).length === 0 ? (
                  <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No recent analyses recorded.</p>
                ) : summary.recent_analyses.map((analysis) => {
                  const isProcessed = analysis.status === 'processed';
                  const isRunning = analysis.status === 'running' || analysis.status === 'pending';
                  
                  let statusClass = 'status-pending';
                  if (isProcessed) statusClass = 'status-success';
                  if (analysis.status === 'failed') statusClass = 'status-failed';

                  return (
                    <Link 
                      href={isProcessed ? `/report/${analysis.analysis_id}` : `/analyze/${analysis.analysis_id}`} 
                      key={analysis.analysis_id} 
                      className="recent-analysis-row-link"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <div className={`status-dot-pulse ${statusClass}`} />
                        <span className="analysis-filename" title={analysis.filename}>
                          {analysis.filename || 'Untitled document'}
                        </span>
                      </div>
                      <span className="analysis-source-tag">{analysis.source || 'REST API'}</span>
                      <span className={`analysis-status-badge ${statusClass}`}>{analysis.status}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {formatScore(analysis.integrity_score)}
                        </strong>
                        <ArrowRight size={15} className="row-arrow" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function Metric({ icon: Icon, label, value, className }) {
  return (
    <div className={`metric-bento-tile ${className || ''}`}>
      <div className="metric-icon-container">
        <Icon size={20} />
      </div>
      <div>
        <span className="metric-label-text">{label}</span>
        <strong className="metric-value-text">{value}</strong>
      </div>
    </div>
  );
}

function formatScore(score) {
  if (typeof score !== 'number') return 'Pending';
  return `${Math.round(score * 100)}%`;
}
