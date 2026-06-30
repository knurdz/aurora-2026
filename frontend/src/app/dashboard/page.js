'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGate from '../../components/AuthGate';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Logo from '../../components/Logo';
import { createApiKey, getApiBase, getApiKeys, getDashboardSummary, revokeApiKey, getCurrentUser, getHealth } from '../../lib/api';
import {
  Activity,
  Check,
  Clipboard,
  Copy,
  AlertTriangle,
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

const TIMEFRAME_DATA = {
  Day: {
    percentage: '+12%',
    desc: "Today's audits count is higher than yesterday's",
    chart: [
      { label: '12am', lineHeight: '30px' },
      { label: '4am', lineHeight: '15px' },
      { label: '8am', lineHeight: '50px' },
      { label: '12pm', lineHeight: '110px' },
      { label: '4pm', lineHeight: '140px', highlighted: true, tooltip: '24 claims' },
      { label: '8pm', lineHeight: '80px' },
      { label: '11pm', lineHeight: '40px' }
    ]
  },
  Week: {
    percentage: '+20%',
    desc: "This week's audits count is higher than last week's",
    chart: [
      { label: 'S', lineHeight: '70px' },
      { label: 'M', lineHeight: '90px' },
      { label: 'T', lineHeight: '140px', highlighted: true, tooltip: '25 claims' },
      { label: 'W', lineHeight: '110px' },
      { label: 'T', lineHeight: '130px' },
      { label: 'F', lineHeight: '100px' },
      { label: 'S', lineHeight: '85px' }
    ]
  },
  Year: {
    percentage: '+45%',
    desc: "This year's audits count is higher than last year's",
    chart: [
      { label: 'Jan', lineHeight: '60px' },
      { label: 'Mar', lineHeight: '95px' },
      { label: 'May', lineHeight: '120px' },
      { label: 'Jul', lineHeight: '140px', highlighted: true, tooltip: '310 claims' },
      { label: 'Sep', lineHeight: '135px' },
      { label: 'Nov', lineHeight: '100px' }
    ]
  }
};

function DashboardContent() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedPrefixId, setCopiedPrefixId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState(null);
  const [health, setHealth] = useState(null);

  // Redesign tab states
  const [activeView, setActiveView] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  // Notifications states
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef(null);

  // Verification Volume Timeframe states
  const [volumeTimeframe, setVolumeTimeframe] = useState('Week');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const timeframeRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (timeframeRef.current && !timeframeRef.current.contains(event.target)) {
        setShowTimeframeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const apiBase = getApiBase();
  const displayBase = apiBase === '/api' ? 'https://verischolar.knurdz.org/api' : apiBase;

  async function loadDashboard() {
    setLoading(true);
    try {
      const [summaryData, keysData, userData, healthData] = await Promise.all([
        getDashboardSummary(), 
        getApiKeys(),
        getCurrentUser(),
        getHealth()
      ]);
      setSummary(summaryData);
      setApiKeys(keysData.api_keys || []);
      if (userData.authenticated) {
        setUser(userData.user);
      }
      setHealth(healthData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDashboard() {
      try {
        const [summaryData, keysData, userData, healthData] = await Promise.all([
          getDashboardSummary(), 
          getApiKeys(),
          getCurrentUser(),
          getHealth()
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setApiKeys(keysData.api_keys || []);
        if (userData.authenticated) {
          setUser(userData.user);
        }
        setHealth(healthData);
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
    const query = searchQuery.toLowerCase().trim();
    return list.filter(item => {
      const filenameMatch = item.filename?.toLowerCase().includes(query);
      const statusMatch = item.status?.toLowerCase().includes(query);
      const sourceMatch = item.source?.toLowerCase().includes(query);
      const verdictMatch = item.integrity_verdict?.toLowerCase().includes(query);
      const idMatch = item.analysis_id?.toLowerCase().includes(query) || item.doc_id?.toLowerCase().includes(query);
      const formattedScore = formatScore(item.integrity_score).toLowerCase();
      const scoreMatch = formattedScore.includes(query) || String(item.integrity_score).includes(query);
      
      return filenameMatch || statusMatch || sourceMatch || verdictMatch || idMatch || scoreMatch;
    });
  }, [summary?.recent_analyses, searchQuery]);

  const filteredApiKeys = useMemo(() => {
    if (!searchQuery) return apiKeys;
    const query = searchQuery.toLowerCase().trim();
    return apiKeys.filter(key => 
      key.name?.toLowerCase().includes(query) ||
      key.prefix?.toLowerCase().includes(query)
    );
  }, [apiKeys, searchQuery]);

  // Reset search query when changing views
  useEffect(() => {
    setSearchQuery('');
  }, [activeView]);

  // Compile active notifications list dynamically
  useEffect(() => {
    if (!summary && apiKeys.length === 0) return;
    const list = [];
    
    // 1. Processed audits
    (summary?.recent_analyses || []).forEach((analysis, index) => {
      const isProcessed = analysis.status === 'processed';
      if (isProcessed) {
        list.push({
          id: `audit-${analysis.analysis_id}`,
          text: `Audit processed: ${analysis.filename || 'Untitled'} (Score: ${formatScore(analysis.integrity_score)})`,
          time: index === 0 ? 'Just now' : `${index * 2}h ago`,
          link: `/report/${analysis.analysis_id}`
        });
      } else if (analysis.status === 'failed') {
        list.push({
          id: `audit-${analysis.analysis_id}`,
          text: `Audit failed: ${analysis.filename || 'Untitled'}`,
          time: `${index * 3 + 1}h ago`,
          link: `/analyze/${analysis.analysis_id}`
        });
      }
    });

    // 2. Active API keys
    apiKeys.forEach((key, index) => {
      if (!key.revoked_at) {
        list.push({
          id: `key-${key.id}`,
          text: `API Key active: "${key.name}" (${key.prefix}...)`,
          time: `${index * 4 + 2}h ago`,
          link: null
        });
      }
    });

    // 3. System Health status
    list.push({
      id: 'sys-health',
      text: 'System health: Neo4j graph databases and Chroma stores online.',
      time: '1d ago',
      link: '/settings'
    });

    setNotifications(list);
    setUnreadCount(list.length > 3 ? 3 : list.length);
  }, [summary, apiKeys]);

  const handleCreateKey = async () => {
    setCreating(true);
    try {
      const data = await createApiKey(keyName);
      setNewSecret(data.secret);
      setApiKeys((prev) => [data.api_key, ...prev]);
      setKeyName('');
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

  const handleCopyCommand = (text, index) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const [copiedIndex, setCopiedIndex] = useState(null);

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
          <div className="twisty-subnav-actions">
            <div className="twisty-search-wrapper">
              <Search className="twisty-search-icon" size={16} />
              <input 
                type="text" 
                placeholder={
                  activeView === 'Developer' 
                    ? "Search API keys..." 
                    : "Search audits (name, status, verdict)..."
                } 
                className="twisty-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="icon-button" style={{ borderRadius: '50%' }} title="System Settings" onClick={() => router.push('/settings')}>
              <Settings size={16} />
            </button>
            
            {/* Notification Bell Dropdown */}
            <div ref={notificationsRef} style={{ position: 'relative' }}>
              <button 
                className="icon-button" 
                style={{ 
                  borderRadius: '50%', 
                  position: 'relative',
                  background: showNotifications ? 'rgba(13, 148, 136, 0.08)' : '#ffffff', 
                  color: showNotifications ? '#0d9488' : 'var(--text-secondary)',
                  borderColor: showNotifications ? 'rgba(13, 148, 136, 0.2)' : 'rgba(15, 23, 42, 0.12)'
                }} 
                title="Notifications"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadCount(0);
                }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    background: 'var(--accent-rose)',
                    borderRadius: '50%',
                    border: '2px solid white'
                  }} />
                )}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <strong>Notifications</strong>
                    <button onClick={() => setNotifications([])}>Clear all</button>
                  </div>
                  <div className="notifications-body">
                    {notifications.length === 0 ? (
                      <p className="notifications-empty">No new notifications.</p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className="notification-row" 
                          onClick={() => {
                            if (n.link) router.push(n.link);
                            setShowNotifications(false);
                          }}
                        >
                          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                            <div className="notification-dot" />
                            <div>
                              <p>{n.text}</p>
                              <span>{n.time}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                      <div ref={timeframeRef} className="twisty-select-container">
                        <div 
                          className="twisty-select-badge"
                          onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
                        >
                          <span>{volumeTimeframe}</span> <ChevronDown size={14} />
                        </div>
                        {showTimeframeDropdown && (
                          <div className="twisty-select-dropdown">
                            {['Day', 'Week', 'Year'].map((tf) => (
                              <button
                                key={tf}
                                type="button"
                                className={`twisty-select-option ${volumeTimeframe === tf ? 'active' : ''}`}
                                onClick={() => {
                                  setVolumeTimeframe(tf);
                                  setShowTimeframeDropdown(false);
                                }}
                              >
                                {tf}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="twisty-chart-summary">
                      <div className="twisty-percentage-grow">
                        {TIMEFRAME_DATA[volumeTimeframe].percentage}
                        <span>{TIMEFRAME_DATA[volumeTimeframe].desc}</span>
                      </div>
                    </div>

                    {/* Styled HTML/CSS Bar Chart */}
                    <div className="twisty-bar-chart">
                      {TIMEFRAME_DATA[volumeTimeframe].chart.map((item, idx) => {
                        if (item.highlighted) {
                          return (
                            <div className="twisty-bar-col" key={idx}>
                              <div className="twisty-bar-highlight-pill">
                                <span className="twisty-tooltip-val">{item.tooltip}</span>
                                <div className="twisty-bar-line" style={{ height: item.lineHeight }}>
                                  <div className="twisty-bar-dot" />
                                </div>
                                <div className="twisty-day-badge">{item.label}</div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="twisty-bar-col" key={idx}>
                            <div className="twisty-bar-line" style={{ height: item.lineHeight }}>
                              <div className="twisty-bar-dot" />
                            </div>
                            <div className="twisty-day-badge">{item.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Connect + Upgrade row */}
                  <div className="dashboard-upgrade-grid">
                    {/* Workspace Quota Limits */}
                    <div className="twisty-connect-card">
                      <div className="twisty-connect-header">
                        <h3>Workspace Quotas</h3>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>Active</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.25rem' }}>
                        {/* Daily Audits */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Daily Audits Quota</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {summary?.usage?.total_analyses ?? 0} / 50 files
                            </strong>
                          </div>
                          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, ((summary?.usage?.total_analyses ?? 0) / 50) * 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #10b981, #0ea5e9)',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>

                        {/* API Requests */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>API Rate Limit (hour)</span>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {summary?.usage?.quota_windows?.[0]?.remaining ?? 58} / {summary?.usage?.quota_windows?.[0]?.limit ?? 60} req
                            </strong>
                          </div>
                          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, (((summary?.usage?.quota_windows?.[0]?.remaining ?? 58) / (summary?.usage?.quota_windows?.[0]?.limit ?? 60)) * 100))}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LLM Engine Card */}
                    <div className="twisty-upgrade-card">
                      <div>
                        <h3 style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: '#475569', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Active Engine</h3>
                        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>
                          {health?.llm_provider || 'OpenAI'}
                        </h2>
                        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.45 }}>
                          Manuscript LLM audits configured using model <code style={{ fontSize: '0.8rem', background: 'rgba(15,23,42,0.06)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{health?.llm_model || 'gpt-4o-mini'}</code>.
                        </p>
                      </div>
                      <button className="twisty-upgrade-btn" onClick={() => router.push('/settings')} style={{ marginTop: '1rem' }}>
                        <span>Configure Engine</span>
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
                      {filteredAnalyses.slice(0, 3).map((analysis, index) => {
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
                                  <strong>
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
                      {filteredAnalyses.length === 0 && (
                        <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No audits matched your search query.</p>
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
                            <div key={i} className={`twisty-bar-tick ${i < 10 ? 'active-green' : ''}`} />
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
                <div className="dashboard-card-panel" style={{ textAlign: 'center', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(15,23,42,0.06)' }}>
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
                <div className="dev-keys-card">
                  <div className="dev-header-with-badge">
                    <div className="dev-header-info">
                      <h2>REST & MCP Authentication Keys</h2>
                      <p>Integrate VeriScholar REST and MCP integrations with local peer review workflows.</p>
                    </div>
                    <div className="dev-badge-count">
                      <KeyRound size={14} />
                      <span>{apiKeys.filter(k => !k.revoked_at).length} Active</span>
                    </div>
                  </div>

                  {newSecret && (
                    <div className="dev-secret-banner">
                      <div className="dev-secret-banner-header">
                        <AlertTriangle size={15} style={{ color: '#059669' }} />
                        <strong>Copy this key now</strong>
                        <span>It will not be displayed again for security purposes.</span>
                      </div>
                      <div className="dev-secret-code-wrapper">
                        <code>{newSecret}</code>
                        <button 
                          type="button" 
                          className="dev-secret-copy-btn" 
                          onClick={() => {
                            navigator.clipboard?.writeText(newSecret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                        >
                          {copiedSecret ? <Check size={13} /> : <Clipboard size={13} />}
                          {copiedSecret ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleCreateKey(); }} 
                    className="dev-key-input-group"
                  >
                    <div className="dev-key-input-wrapper">
                      <KeyRound size={16} />
                      <input
                        value={keyName}
                        onChange={(event) => setKeyName(event.target.value)}
                        maxLength={80}
                        placeholder="Enter key name (e.g. Production client)"
                        className="dev-key-input"
                        aria-label="API key name"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="dev-key-submit-btn" 
                      disabled={creating || !keyName.trim()}
                    >
                      {creating ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                      {creating ? 'Creating...' : 'Create Key'}
                    </button>
                  </form>

                  <div className="dev-keys-list">
                    {filteredApiKeys.length === 0 ? (
                      <p className="muted" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        No API keys matched your search.
                      </p>
                    ) : filteredApiKeys.map((key) => (
                      <div className="dev-key-row" key={key.id}>
                        <div className="dev-key-info">
                          <div className={`dev-status-indicator ${key.revoked_at ? 'revoked' : 'active'}`} />
                          <div className="dev-key-text">
                            <span className="dev-key-name" title={key.name}>{key.name}</span>
                            <div className="dev-key-meta-line">
                              <span className="dev-key-prefix">
                                {key.prefix}...
                                <button 
                                  type="button" 
                                  className="dev-key-copy-prefix-btn"
                                  title="Copy prefix"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(key.prefix);
                                    setCopiedPrefixId(key.id);
                                    setTimeout(() => setCopiedPrefixId(null), 2000);
                                  }}
                                >
                                  {copiedPrefixId === key.id ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                                </button>
                              </span>
                              <span>•</span>
                              <span>Created {new Date(key.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="dev-key-actions">
                          {key.revoked_at ? (
                            <span className="dev-revoked-badge">Revoked</span>
                          ) : (
                            <span className="dev-calls-badge">{key.usage_total} calls</span>
                          )}
                          {!key.revoked_at && (
                            <button 
                              type="button" 
                              className="dev-revoke-btn" 
                              title="Revoke key" 
                              onClick={() => handleRevoke(key.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Panel: Curl & Quotas */}
                <div className="twisty-column-right">
                  <div className="dev-keys-card" style={{ gap: '1.25rem' }}>
                    <div className="dev-header-with-badge" style={{ paddingBottom: '0.85rem' }}>
                      <div className="dev-header-info">
                        <h2 style={{ fontSize: '1.25rem' }}>REST & MCP Quick Start</h2>
                        <p style={{ marginTop: '0.15rem' }}>Submit manuscript files via simple shell commands, REST webhooks, or MCP integration.</p>
                      </div>
                      <div className="dev-badge-count" style={{ background: 'rgba(15, 23, 42, 0.04)', color: 'var(--text-secondary)', borderColor: 'rgba(15, 23, 42, 0.08)' }}>
                        <Terminal size={14} />
                        <span>Reference</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem', minWidth: 0 }}>
                      {/* Submit Manuscript */}
                      <div className="dev-ide-window">
                        <div className="dev-ide-header">
                          <div className="dev-mac-dots">
                            <span className="dev-mac-dot red" />
                            <span className="dev-mac-dot yellow" />
                            <span className="dev-mac-dot green" />
                          </div>
                          <div className="dev-ide-title">
                            <span className="dev-method-badge post">POST</span>
                            <span className="dev-ide-filename">submit_manuscript.sh</span>
                          </div>
                          <button 
                            type="button"
                            className={`dev-ide-copy-btn ${copiedIndex === 0 ? 'copied' : ''}`}
                            onClick={() => handleCopyCommand(`curl -X POST ${displayBase}/v1/analyses -H "Authorization: Bearer vs_live_..." -F "file=@paper.pdf"`, 0)}
                            title="Copy code"
                          >
                            {copiedIndex === 0 ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="dev-ide-body">
                          <pre className="dev-ide-code">
                            <span className="code-c-cmd">curl</span> <span className="code-c-arg">-X</span> POST \<br />
                            &nbsp;&nbsp;<span className="code-c-url">{displayBase}/v1/analyses</span> \<br />
                            &nbsp;&nbsp;<span className="code-c-arg">-H</span> <span className="code-c-hdr">"Authorization: Bearer <span className="code-c-val">vs_live_...</span>"</span> \<br />
                            &nbsp;&nbsp;<span className="code-c-arg">-F</span> <span className="code-c-hdr">"file=@<span className="code-c-param">paper.pdf</span>"</span>
                          </pre>
                        </div>
                      </div>

                      {/* Fetch Analysis Status */}
                      <div className="dev-ide-window">
                        <div className="dev-ide-header">
                          <div className="dev-mac-dots">
                            <span className="dev-mac-dot red" />
                            <span className="dev-mac-dot yellow" />
                            <span className="dev-mac-dot green" />
                          </div>
                          <div className="dev-ide-title">
                            <span className="dev-method-badge get">GET</span>
                            <span className="dev-ide-filename">fetch_status.sh</span>
                          </div>
                          <button 
                            type="button"
                            className={`dev-ide-copy-btn ${copiedIndex === 1 ? 'copied' : ''}`}
                            onClick={() => handleCopyCommand(`curl ${displayBase}/v1/analyses/{analysis_id} -H "Authorization: Bearer vs_live_..."`, 1)}
                            title="Copy code"
                          >
                            {copiedIndex === 1 ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="dev-ide-body">
                          <pre className="dev-ide-code">
                            <span className="code-c-cmd">curl</span> <span className="code-c-url">{displayBase}/v1/analyses/<span className="code-c-param">{"{analysis_id}"}</span></span> \<br />
                            &nbsp;&nbsp;<span className="code-c-arg">-H</span> <span className="code-c-hdr">"Authorization: Bearer <span className="code-c-val">vs_live_...</span>"</span>
                          </pre>
                        </div>
                      </div>

                      {/* MCP Endpoint */}
                      <div className="dev-ide-window">
                        <div className="dev-ide-header">
                          <div className="dev-mac-dots">
                            <span className="dev-mac-dot red" />
                            <span className="dev-mac-dot yellow" />
                            <span className="dev-mac-dot green" />
                          </div>
                          <div className="dev-ide-title">
                            <span className="dev-method-badge mcp">MCP</span>
                            <span className="dev-ide-filename">mcp_config.json</span>
                          </div>
                          <button 
                            type="button"
                            className={`dev-ide-copy-btn ${copiedIndex === 2 ? 'copied' : ''}`}
                            onClick={() => handleCopyCommand(`${displayBase}/mcp/`, 2)}
                            title="Copy Endpoint"
                          >
                            {copiedIndex === 2 ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="dev-ide-body">
                          <pre className="dev-ide-code">
                            <span className="code-c-hdr">"url"</span>: <span className="code-c-url">"{displayBase}/mcp/"</span>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quotas & Usage Rates */}
                  <div className="dev-quota-card">
                    <div className="dev-header-with-badge">
                      <div className="dev-header-info">
                        <h2 style={{ fontSize: '1.25rem' }}>REST & MCP Quota Usage</h2>
                        <p style={{ marginTop: '0.15rem' }}>Monitor request rate limits and remaining scan volume allocation for REST & MCP endpoints.</p>
                      </div>
                      <div className="dev-badge-count" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.12)' }}>
                        <ShieldCheck size={14} />
                        <span>Active Limits</span>
                      </div>
                    </div>

                    <div className="dev-quota-list">
                      {(summary?.usage?.quota_windows || []).map((quota) => {
                        const used = quota.limit - quota.remaining;
                        const percentageUsed = Math.min(100, Math.max(0, (used / quota.limit) * 100));
                        
                        let fillClass = '';
                        if (percentageUsed >= 90) {
                          fillClass = 'danger';
                        } else if (percentageUsed >= 70) {
                          fillClass = 'warning';
                        }
                        
                        return (
                          <div className="dev-quota-item" key={quota.bucket}>
                            <div className="dev-quota-meta">
                              <span className="dev-quota-label">{quota.bucket.replaceAll('_', ' ')}</span>
                              <span className="dev-quota-ratio">
                                <span className="dev-quota-ratio-accent">{quota.remaining}</span> of {quota.limit} remaining
                              </span>
                            </div>
                            <div className="dev-quota-progress-track" title={`${used} of ${quota.limit} used`}>
                              <div 
                                className={`dev-quota-progress-fill ${fillClass}`} 
                                style={{ width: `${100 - percentageUsed}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
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
