'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '../../components/AuthGate';
import Navbar from '../../components/Navbar';
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
            <span className="dashboard-eyebrow">Developer console</span>
            <h1>API access and audit activity</h1>
            <p>Manage keys for server-to-server REST clients and review your recent VeriScholar analyses.</p>
          </div>
          <button type="button" className="btn-secondary dashboard-refresh" onClick={loadDashboard}>
            <RefreshCw size={17} />
            Refresh
          </button>
        </section>

        {loading ? (
          <div className="glass-panel dashboard-loading">
            <Loader2 className="spin" size={28} />
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <>
            <section className="dashboard-metrics">
              <Metric icon={Activity} label="Analyses" value={summary?.usage?.total_analyses ?? 0} />
              <Metric icon={ShieldCheck} label="Processed" value={summary?.usage?.processed_analyses ?? 0} />
              <Metric icon={KeyRound} label="Active keys" value={`${activeKeys.length}/${summary?.usage?.limits?.active_api_keys ?? 5}`} />
              <Metric icon={Loader2} label="Running" value={`${summary?.usage?.active_analyses ?? 0}/${summary?.usage?.limits?.active_analyses ?? 1}`} />
            </section>

            <section className="dashboard-grid">
              <div className="glass-panel api-key-panel">
                <div className="panel-heading">
                  <div>
                    <h2>API Keys</h2>
                    <p>Create a key for each integration and revoke keys you no longer use.</p>
                  </div>
                  <KeyRound size={22} />
                </div>

                {newSecret && (
                  <div className="secret-reveal">
                    <div>
                      <strong>Copy this key now</strong>
                      <p>It will not be shown again.</p>
                    </div>
                    <code>{newSecret}</code>
                    <button type="button" className="btn-secondary" onClick={() => navigator.clipboard?.writeText(newSecret)}>
                      <Clipboard size={16} />
                      Copy
                    </button>
                  </div>
                )}

                <div className="key-create-row">
                  <input
                    value={keyName}
                    onChange={(event) => setKeyName(event.target.value)}
                    maxLength={80}
                    aria-label="API key name"
                  />
                  <button type="button" className="btn-primary" onClick={handleCreateKey} disabled={creating}>
                    <Plus size={17} />
                    {creating ? 'Creating...' : 'Create key'}
                  </button>
                </div>

                <div className="api-key-list">
                  {apiKeys.length === 0 ? (
                    <p className="muted">No API keys yet.</p>
                  ) : apiKeys.map((key) => (
                    <div className="api-key-row" key={key.id}>
                      <div>
                        <strong>{key.name}</strong>
                        <span>{key.prefix}...</span>
                      </div>
                      <div className="key-meta">
                        <span>{key.revoked_at ? 'Revoked' : `${key.usage_total} calls`}</span>
                        {!key.revoked_at && (
                          <button type="button" className="icon-button" title="Revoke key" onClick={() => handleRevoke(key.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel quickstart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>REST Quick Start</h2>
                    <p>Submit an analysis asynchronously, then poll or stream progress.</p>
                  </div>
                  <Clipboard size={22} />
                </div>
                <pre>{`curl -X POST ${displayBase}/v1/analyses \\
  -H "Authorization: Bearer vs_live_..." \\
  -F "file=@paper.pdf"

curl ${displayBase}/v1/analyses/{analysis_id} \\
  -H "Authorization: Bearer vs_live_..."

curl -N ${displayBase}/v1/analyses/{analysis_id}/events \\
  -H "Authorization: Bearer vs_live_..."`}</pre>
                <div className="quota-list">
                  {(summary?.usage?.quota_windows || []).map((quota) => (
                    <div key={quota.bucket}>
                      <Check size={15} />
                      <span>{quota.remaining} of {quota.limit} {quota.bucket.replaceAll('_', ' ')} remaining</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass-panel recent-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Analyses</h2>
                  <p>Dashboard and REST API jobs are scoped to your account.</p>
                </div>
                <Link className="btn-secondary" href="/audit">Run audit</Link>
              </div>
              <div className="analysis-table">
                {(summary?.recent_analyses || []).length === 0 ? (
                  <p className="muted">No analyses yet.</p>
                ) : summary.recent_analyses.map((analysis) => (
                  <Link href={analysis.status === 'processed' ? `/report/${analysis.analysis_id}` : `/analyze/${analysis.analysis_id}`} key={analysis.analysis_id} className="analysis-row">
                    <span>{analysis.filename || 'Untitled document'}</span>
                    <span>{analysis.source}</span>
                    <span>{analysis.status}</span>
                    <span>{formatScore(analysis.integrity_score)}</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="glass-panel metric-tile">
      <Icon size={21} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function formatScore(score) {
  if (typeof score !== 'number') return 'Pending';
  return `${Math.round(score * 100)}%`;
}
