'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '../../components/AuthGate';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import {
  CheckCircle,
  Cpu,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
  Trash2,
  XCircle,
  Search,
  Settings,
  Bell,
  ArrowRight,
  Database
} from 'lucide-react';
import {
  deleteAccount,
  getAiSettings,
  getConfig,
  getHealth,
  resetAiSettings,
  saveAiSettings,
  getCurrentUser
} from '../../lib/api';

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsContent />
    </AuthGate>
  );
}

function SettingsContent() {
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [aiSettings, setAiSettings] = useState(null);
  const [form, setForm] = useState({ endpoint: '', model_name: '', api_key: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [user, setUser] = useState(null);

  // Redesign state
  const [useCustomAi, setUseCustomAi] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [configData, healthData, aiData, userData] = await Promise.all([
          getConfig(),
          getHealth(),
          getAiSettings(),
          getCurrentUser()
        ]);
        if (cancelled) return;
        setConfig(configData);
        setHealth(healthData);
        setAiSettings(aiData);
        setUseCustomAi(aiData?.using_custom_ai || false);
        if (userData.authenticated) {
          setUser(userData.user);
        }
        setForm({
          endpoint: aiData?.using_custom_ai ? aiData.endpoint || '' : '',
          model_name: aiData?.using_custom_ai ? aiData.model_name || '' : '',
          api_key: '',
        });
      } catch (e) {
        if (!cancelled) setError(readableError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveAiSettings(event) {
    if (event) event.preventDefault();
    setNotice('');
    setError('');
    setSaving(true);
    try {
      const payload = {
        endpoint: form.endpoint.trim(),
        model_name: form.model_name.trim(),
      };
      if (form.api_key.trim()) {
        payload.api_key = form.api_key.trim();
      }
      const saved = await saveAiSettings(payload);
      setAiSettings(saved);
      setConfig(saved);
      setForm((current) => ({ ...current, api_key: '' }));
      setNotice('Custom AI model configuration saved successfully.');
    } catch (e) {
      setError(readableError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetAiSettings() {
    setNotice('');
    setError('');
    setResetting(true);
    try {
      const reset = await resetAiSettings();
      setAiSettings(reset);
      setConfig(reset);
      setForm({ endpoint: '', model_name: '', api_key: '' });
      setUseCustomAi(false);
      setNotice('Switched back to VeriScholar default AI models.');
    } catch (e) {
      setError(readableError(e));
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteAccount(event) {
    event.preventDefault();
    if (deleteConfirm !== 'DELETE') return;

    setNotice('');
    setError('');
    setDeleting(true);
    try {
      await deleteAccount();
      router.push('/');
      router.refresh();
    } catch (e) {
      setError(readableError(e));
      setDeleting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="dashboard-shell">
        
        {/* Mockup sub-navbar */}
        <section className="twisty-subnav">
          <div className="twisty-nav-group">
            <button 
              className="twisty-nav-tab"
              onClick={() => router.push('/dashboard')}
            >
              Overview
            </button>
            <button 
              className="twisty-nav-tab"
              onClick={() => router.push('/dashboard')}
            >
              Audits
            </button>
            <button 
              className="twisty-nav-tab"
              onClick={() => router.push('/dashboard')}
            >
              Developer Tools
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="twisty-search-wrapper" style={{ opacity: 0.5 }}>
              <Search className="twisty-search-icon" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="twisty-search-input"
                disabled
              />
            </div>
            <button 
              className="icon-button" 
              style={{ borderRadius: '50%', background: 'rgba(13, 148, 136, 0.08)', color: '#0d9488', borderColor: 'rgba(13, 148, 136, 0.2)' }} 
              title="System Settings"
            >
              <Settings size={16} />
            </button>
            <button className="icon-button" style={{ borderRadius: '50%' }} title="Notifications">
              <Bell size={16} />
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

        {loading ? (
          <div className="glass-panel dashboard-loading" style={{ justifyContent: 'center' }}>
            <Loader2 className="spin" size={24} />
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-secondary)' }}>Loading settings...</p>
          </div>
        ) : (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            {(notice || error) && (
              <StatusMessage type={error ? 'error' : 'success'} message={error || notice} />
            )}

            {/* Vercel Card 1: AI Model Engine */}
            <div className="settings-panel-card">
              <div className="settings-panel-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <Cpu size={22} style={{ color: '#0d9488' }} />
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    AI Model Engine
                  </h2>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '2rem', marginTop: 0 }}>
                  Manage the LLM provider utilized for manuscript claim isolation and semantic analysis.
                </p>

                {/* Big Selector Cards */}
                <div className="settings-toggle-group">
                  <div 
                    className={`settings-toggle-card ${!useCustomAi ? 'active' : ''}`}
                    onClick={handleResetAiSettings}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>VeriScholar Managed Defaults</h4>
                      {!useCustomAi && <CheckCircle size={16} style={{ color: '#0d9488' }} />}
                    </div>
                    <p>Use pre-configured OpenAI/Ollama LLM model instances hosted by the server.</p>
                  </div>

                  <div 
                    className={`settings-toggle-card ${useCustomAi ? 'active' : ''}`}
                    onClick={() => setUseCustomAi(true)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>Custom LLM Endpoint</h4>
                      {useCustomAi && <CheckCircle size={16} style={{ color: '#0d9488' }} />}
                    </div>
                    <p>Integrate self-hosted Ollama or custom OpenAI API tokens directly.</p>
                  </div>
                </div>

                {/* Form fields shown if useCustomAi */}
                {useCustomAi ? (
                  <form onSubmit={handleSaveAiSettings} style={{ display: 'grid', gap: '1.25rem', marginTop: '1.5rem' }}>
                    <div className="settings-input-row">
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle} htmlFor="ai-endpoint">API Endpoint URI</label>
                        <input
                          id="ai-endpoint"
                          type="url"
                          value={form.endpoint}
                          onChange={(event) => setForm((current) => ({ ...current, endpoint: event.target.value }))}
                          placeholder="https://api.openai.com/v1"
                          className="twisty-search-input"
                          style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem' }}
                          required
                        />
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={labelStyle} htmlFor="ai-model">Model Name</label>
                        <input
                          id="ai-model"
                          type="text"
                          value={form.model_name}
                          onChange={(event) => setForm((current) => ({ ...current, model_name: event.target.value }))}
                          placeholder="gpt-4o-mini"
                          className="twisty-search-input"
                          style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={labelStyle} htmlFor="ai-api-key">
                        API Secret Key {aiSettings?.api_key_configured ? '(configured)' : ''}
                      </label>
                      <input
                        id="ai-api-key"
                        type="password"
                        value={form.api_key}
                        onChange={(event) => setForm((current) => ({ ...current, api_key: event.target.value }))}
                        placeholder={aiSettings?.api_key_configured ? '•••••••••••••••• (Leave blank to keep current key)' : 'Optional for local endpoints'}
                        className="twisty-search-input"
                        style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem' }}
                        autoComplete="off"
                      />
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', background: 'rgba(15,23,42,0.02)', padding: '1.25rem', borderRadius: '12px', marginTop: '1.5rem' }}>
                    <FieldLabel label="Active Provider" value={config?.llm_provider || 'Unknown'} transform />
                    <FieldLabel label="Model Name" value={config?.model_name || 'Unknown'} />
                    <FieldLabel label="Managed Endpoint" value={config?.endpoint || 'VeriScholar Default'} breakWords />
                  </div>
                )}
              </div>

              {/* Vercel Footer */}
              <div className="settings-panel-footer">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {useCustomAi ? 'Quota consumption will be billed directly to your custom key.' : 'Managed server weights have rate-limiting quota buckets.'}
                </span>
                {useCustomAi && (
                  <button 
                    onClick={handleSaveAiSettings}
                    disabled={saving} 
                    className="btn-primary" 
                    style={{ borderRadius: '999px', padding: '0.6rem 1.75rem', fontSize: '0.88rem' }}
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                )}
              </div>
            </div>

            {/* Vercel Card 2: Service Health */}
            <div className="settings-panel-card">
              <div className="settings-panel-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <Server size={22} style={{ color: '#0d9488' }} />
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    Service Infrastructure
                  </h2>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '2rem', marginTop: 0 }}>
                  Real-time connectivity status of downstream databases and internal API services.
                </p>

                <div className="settings-health-row">
                  <div className="settings-health-card">
                    <CheckCircle size={22} style={{ color: health?.status === 'ok' ? '#10b981' : '#f43f5e' }} />
                    <strong>Backend REST Core</strong>
                    <span>{health?.status === 'ok' ? 'Online' : 'Offline'}</span>
                  </div>

                  <div className="settings-health-card">
                    <Database size={22} style={{ color: health?.neo4j === 'connected' ? '#10b981' : '#f43f5e' }} />
                    <strong>Neo4j Graph</strong>
                    <span>{health?.neo4j === 'connected' ? 'Connected' : 'Disconnected'}</span>
                  </div>

                  <div className="settings-health-card">
                    <Server size={22} style={{ color: health?.chroma === 'connected' ? '#10b981' : '#f43f5e' }} />
                    <strong>Chroma Vector DB</strong>
                    <span>{health?.chroma === 'connected' ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vercel Card 3: Danger Zone */}
            <div className="settings-panel-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="settings-panel-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <ShieldAlert size={22} style={{ color: 'var(--accent-rose)' }} />
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    Danger Zone
                  </h2>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '2rem', marginTop: 0 }}>
                  Permanently delete account workspace details. This removes all analysis runs, Neo4j citation cartels, Chroma vector graphs, and API keys.
                </p>

                <div style={fieldGroupStyle}>
                  <label style={labelStyle} htmlFor="delete-confirm">Type DELETE to confirm deletion</label>
                  <input
                    id="delete-confirm"
                    type="text"
                    value={deleteConfirm}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                    className="twisty-search-input"
                    style={{ width: '100%', maxwidth: '320px', borderRadius: '10px', padding: '0.75rem 1rem' }}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="settings-panel-footer" style={{ background: 'rgba(239, 68, 68, 0.02)', borderTopColor: 'rgba(239, 68, 68, 0.1)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-rose)', fontWeight: 500 }}>
                  This action is irreversible and deletes everything.
                </span>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deleting}
                  style={deleteButtonStyle(deleteConfirm === 'DELETE' && !deleting)}
                >
                  <Trash2 size={15} />
                  {deleting ? 'Deleting...' : 'Delete Workspace Data'}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function FieldLabel({ label, value, transform = false, breakWords = false }) {
  return (
    <div>
      <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>{label}</label>
      <p style={{
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginTop: '0.2rem',
        textTransform: transform ? 'capitalize' : 'none',
        wordBreak: breakWords ? 'break-all' : 'normal',
        margin: 0
      }}>
        {value}
      </p>
    </div>
  );
}

function StatusMessage({ type, message }) {
  const isError = type === 'error';
  return (
    <div style={{
      border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
      color: isError ? 'var(--accent-rose)' : '#047857',
      background: isError ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.05)',
      borderRadius: '14px',
      padding: '0.9rem 1.25rem',
      fontWeight: 600,
      fontSize: '0.9rem',
      marginBottom: '1.5rem'
    }}>
      {message}
    </div>
  );
}

function readableError(error) {
  if (!error?.message) return 'Something went wrong.';
  try {
    const parsed = JSON.parse(error.message);
    return parsed.detail || error.message;
  } catch {
    return error.message;
  }
}

const fieldGroupStyle = {
  display: 'grid',
  gap: '0.4rem',
};

const labelStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  fontWeight: 600,
};

function deleteButtonStyle(enabled) {
  return {
    width: 'fit-content',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    borderRadius: '999px',
    padding: '0.65rem 1.75rem',
    fontWeight: 700,
    fontSize: '0.88rem',
    color: '#fff',
    background: enabled ? 'var(--accent-rose)' : '#cbd5e1',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease'
  };
}
