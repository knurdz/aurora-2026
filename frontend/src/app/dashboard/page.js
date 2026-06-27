'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '../../components/AuthGate';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Logo from '../../components/Logo';
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
  Search,
  ChevronDown,
  ChevronUp,
  FileScan,
  Network,
  Settings,
  Bell
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

  // Redesign tab states
  const [activeView, setActiveView] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

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

  const filteredAnalyses = useMemo(() => {
    const list = summary?.recent_analyses || [];
    if (!searchQuery) return list;
    return list.filter(item => 
      item.filename?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [summary?.recent_analyses, searchQuery]);

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
        
        {/* Mockup sub-navbar */}
        <section className="twisty-subnav">
          <div className="twisty-nav-group">
            <button 
              className={`twisty-nav-tab ${activeView === 'Overview' ? 'active' : ''}`}
              onClick={() => setActiveView('Overview')}
            >
              Overview
            </button>
            <button 
              className={`twisty-nav-tab ${activeView === 'Audits' ? 'active' : ''}`}
              onClick={() => setActiveView('Audits')}
            >
              Audits
            </button>
            <button 
              className={`twisty-nav-tab ${activeView === 'Developer' ? 'active' : ''}`}
              onClick={() => setActiveView('Developer')}
            >
              Developer Tools
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="twisty-search-wrapper">
              <Search className="twisty-search-icon" size={16} />
              <input 
                type="text" 
                placeholder="Search audits by name..." 
                className="twisty-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="icon-button" style={{ borderRadius: '50%' }} title="System Settings" onClick={() => window.location.href='/settings'}>
              <Settings size={16} />
            </button>
            <button className="icon-button" style={{ borderRadius: '50%' }} title="Notifications">
              <Bell size={16} />
            </button>
            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100" 
              alt="Profile" 
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
          </div>
        </section>

        {loading ? (
          <div className="glass-panel dashboard-loading" style={{ justifyContent: 'center' }}>
            <Loader2 className="spin" size={24} />
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-secondary)' }}>Retrieving dashboard data...</p>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW VIEW */}
            {activeView === 'Overview' && (
              <div className="twisty-layout-grid">
                {/* Left Column */}
                <div className="twisty-column-left">
                  {/* Verification Volume Card */}
                  <div className="twisty-chart-card">
                    <div className="twisty-chart-header">
                      <div>
                        <h2>Verification Volume</h2>
                        <p className="twisty-chart-subheader">
                          Track changes in verified claims over time and inspect statistical distribution checks.
                        </p>
                      </div>
                      <div className="twisty-select-badge">
                        <span>Week</span> <ChevronDown size={14} />
                      </div>
                    </div>

                    <div className="twisty-chart-summary">
                      <div className="twisty-percentage-grow">
                        +20%
                        <span>This week's audits is higher than last week's</span>
                      </div>
                    </div>

                    {/* Styled HTML/CSS Bar Chart */}
                    <div className="twisty-bar-chart">
                      <div className="twisty-bar-col">
                        <div className="twisty-bar-line" style={{ height: '70px' }}><div className="twisty-bar-dot" /></div>
                        <div className="twisty-day-badge">S</div>
                      </div>
                      <div className="twisty-bar-col">
                        <div className="twisty-bar-line" style={{ height: '90px' }}><div className="twisty-bar-dot" /></div>
                        <div className="twisty-day-badge">M</div>
                      </div>
                      
                      {/* Highlighted Tuesday */}
                      <div className="twisty-bar-col">
                        <div className="twisty-bar-highlight-pill">
                          <span className="twisty-tooltip-val">25 claims</span>
                          <div className="twisty-bar-line"><div className="twisty-bar-dot" /></div>
                          <div className="twisty-day-badge">T</div>
                        </div>
                      </div>

                      <div className="twisty-bar-col">
                        <div className="twisty-bar-line" style={{ height: '110px' }}><div className="twisty-bar-dot" /></div>
                        <div className="twisty-day-badge">W</div>
                      </div>
                      <div className="twisty-bar-col">
                        <div className="twisty-bar-line" style={{ height: '130px' }}><div className="twisty-bar-dot" /></div>
                        <div className="twisty-day-badge">T</div>
                      </div>
                      <div className="twisty-bar-col">
                        <div className="twisty-bar-line" style={{ height: '100px' }}><div className="twisty-bar-dot" /></div>
                        <div className="twisty-day-badge">F</div>
                      </div>
                      <div className="twisty-bar-col">
                        <div className="twisty-bar-line" style={{ height: '85px' }}><div className="twisty-bar-dot" /></div>
                        <div className="twisty-day-badge">S</div>
                      </div>
                    </div>
                  </div>

                  {/* Connect + Upgrade row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }}>
                    {/* Let's Connect */}
                    <div className="twisty-connect-card">
                      <div className="twisty-connect-header">
                        <h3>Audit Experts</h3>
                        <a href="#expert" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0ea5e9', textDecoration: 'none' }}>See all</a>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="twisty-reviewer-row">
                          <div className="twisty-reviewer-profile">
                            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80" alt="Dr. Randy Gouse" />
                            <div className="twisty-reviewer-info">
                              <strong>Dr. Randy Gouse <span className="twisty-role-badge role-orange">Senior</span></strong>
                              <span>Cybersecurity specialist</span>
                            </div>
                          </div>
                          <button className="twisty-connect-plus"><Plus size={14} /></button>
                        </div>

                        <div className="twisty-reviewer-row">
                          <div className="twisty-reviewer-profile">
                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80" alt="Giana Schleifer" />
                            <div className="twisty-reviewer-info">
                              <strong>Giana Schleifer <span className="twisty-role-badge role-blue">Middle</span></strong>
                              <span>Research Integrity Auditor</span>
                            </div>
                          </div>
                          <button className="twisty-connect-plus"><Plus size={14} /></button>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade Card */}
                    <div className="twisty-upgrade-card">
                      <div>
                        <h3>Unlock Premium</h3>
                        <p>Get access to GPT-4o custom weights, unlimited graph database sync and Louvain cartel mapping.</p>
                      </div>
                      <button className="twisty-upgrade-btn" onClick={() => window.location.href='/settings'}>
                        <span>Upgrade now</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="twisty-column-right">
                  {/* Recent Projects / Audits Card */}
                  <div className="twisty-projects-card">
                    <div className="twisty-projects-header">
                      <h3>Your Recent Audits</h3>
                      <button 
                        onClick={() => setActiveView('Audits')}
                        style={{ background: 'none', border: 'none', fontSize: '0.82rem', fontWeight: 600, color: '#0ea5e9', cursor: 'pointer' }}
                      >
                        See all audits
                      </button>
                    </div>
                    <div>
                      {(summary?.recent_analyses || []).slice(0, 3).map((analysis, index) => {
                        const isExpanded = expandedRow === index;
                        const isProcessed = analysis.status === 'processed';

                        let statusClass = 'status-capsule-pending';
                        let statusLabel = 'Pending';
                        if (isProcessed) {
                          statusClass = 'status-capsule-paid';
                          statusLabel = 'Processed';
                        } else if (analysis.status === 'failed') {
                          statusClass = 'status-capsule-pending';
                          statusLabel = 'Failed';
                        }

                        return (
                          <div className="twisty-project-row" key={analysis.analysis_id}>
                            <div 
                              className="twisty-project-summary-line"
                              onClick={() => setExpandedRow(isExpanded ? null : index)}
                            >
                              <div className="twisty-project-title-group">
                                <div className="twisty-project-icon-box">
                                  {index % 2 === 0 ? <FileScan size={18} /> : <Network size={18} />}
                                </div>
                                <div>
                                  <strong style={{ maxWidth: '160px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {analysis.filename || 'Untitled document'}
                                  </strong>
                                  <span>{analysis.source || 'REST API'}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span className={`twisty-status-capsule ${statusClass}`}>
                                  {statusLabel}
                                </span>
                                <button className="twisty-arrow-btn">
                                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="twisty-project-details-expanded">
                                <p style={{ margin: 0, fontWeight: 500 }}>Audit Details:</p>
                                <div className="twisty-tag-row">
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    Score: {formatScore(analysis.integrity_score)}
                                  </span>
                                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    ID: {analysis.analysis_id.slice(0, 8)}
                                  </span>
                                </div>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                  Click below to view the full verification graphs and claims matching report.
                                </p>
                                <Link href={isProcessed ? `/report/${analysis.analysis_id}` : `/analyze/${analysis.analysis_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#0ea5e9', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', marginTop: '0.5rem' }}>
                                  Open Report <ArrowRight size={12} />
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(summary?.recent_analyses || []).length === 0 && (
                        <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No recent audits recorded.</p>
                      )}
                    </div>
                  </div>

                  {/* Proposal Progress Card */}
                  <div className="twisty-progress-card">
                    <div className="twisty-progress-header">
                      <h3>Audit Progress Stats</h3>
                      <div className="twisty-select-badge" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                        <span>April 11, 2024</span> <ChevronDown size={12} />
                      </div>
                    </div>

                    <div className="twisty-progress-grid">
                      <div className="twisty-progress-col">
                        <span>Audits completed</span>
                        <strong>{summary?.usage?.total_analyses ?? 64}</strong>
                        <div className="twisty-progress-bar-lines">
                          {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className={`twisty-bar-tick ${i < 10 ? 'active-orange' : ''}`} />
                          ))}
                        </div>
                      </div>

                      <div className="twisty-progress-col">
                        <span>Risk detections</span>
                        <strong>{summary?.usage?.active_analyses ? summary.usage.active_analyses * 6 : 12}</strong>
                        <div className="twisty-progress-bar-lines">
                          {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className={`twisty-bar-tick ${i < 6 ? 'active-blue' : ''}`} />
                          ))}
                        </div>
                      </div>

                      <div className="twisty-progress-col">
                        <span>Integrity ratio</span>
                        <strong>{summary?.usage?.processed_analyses ? `${Math.round((summary.usage.processed_analyses / (summary.usage.total_analyses || 1)) * 100)}%` : '85%'}</strong>
                        <div className="twisty-progress-bar-lines">
                          {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className={`twisty-bar-tick ${i < 12 ? 'active-slate' : ''}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. AUDITS VIEW */}
            {activeView === 'Audits' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Upload drag-and-drop workspace */}
                <div className="dashboard-card-panel" style={{ padding: '2.5rem', textAlign: 'center', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(15,23,42,0.06)' }}>
                  <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                      <FileScan size={32} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Upload Research Manuscript</h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                        Drag and drop your manuscript (PDF or DOCX) to launch claim isolation, Louvain cartel network tests, and statistical fraud audits.
                      </p>
                    </div>
                    <Link href="/audit" className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '999px', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                      Launch Audit Workspace <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>

                {/* Full scrollable analyses grid */}
                <div className="dashboard-card-panel" style={{ borderRadius: '24px' }}>
                  <div className="dashboard-card-header">
                    <div>
                      <h2>Manuscript Audits Archive</h2>
                      <p>All manuscript integrity runs executed on this VeriScholar server node.</p>
                    </div>
                  </div>

                  <div className="recent-analyses-container">
                    {filteredAnalyses.length === 0 ? (
                      <p className="muted" style={{ textAlign: 'center', padding: '3rem 0' }}>No audits matched your search criteria.</p>
                    ) : filteredAnalyses.map((analysis) => {
                      const isProcessed = analysis.status === 'processed';
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
                </div>
              </div>
            )}

            {/* 3. DEVELOPER VIEW */}
            {activeView === 'Developer' && (
              <div className="twisty-layout-grid">
                {/* Left Panel: Keys */}
                <div className="dashboard-card-panel">
                  <div className="dashboard-card-header">
                    <div>
                      <h2>Authentication Keys</h2>
                      <p>Integrate VeriScholar REST integrations with local peer review workflows.</p>
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

                {/* Right Panel: Curl & Quotas */}
                <div className="twisty-column-right">
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
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function formatScore(score) {
  if (typeof score !== 'number') return 'Pending';
  return `${Math.round(score * 100)}%`;
}
