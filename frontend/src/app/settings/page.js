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
  ArrowRight
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
    event.preventDefault();
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
      setNotice('Custom AI model saved.');
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
      setNotice('Using the VeriScholar default AI provider.');
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
        
        {/* Subnav aligned exactly like Dashboard */}
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
                placeholder="Search settings..." 
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
          <div className="twisty-layout-grid">
            
            {/* Left Column: Form & Active config */}
            <div className="twisty-column-left">
              
              {(notice || error) && (
                <StatusMessage type={error ? 'error' : 'success'} message={error || notice} />
              )}

              {/* Active AI Provider info */}
              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <div>
                    <h2>Active AI Provider</h2>
                    <p>Current backend LLM integration configured on this server.</p>
                  </div>
                  <Cpu size={20} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <FieldLabel label="Provider" value={config?.llm_provider || 'Unknown'} transform />
                  <FieldLabel label="Model Name" value={config?.model_name || 'Unknown'} />
                  <FieldLabel label="Source" value={config?.using_custom_ai ? 'Your custom settings' : 'VeriScholar default'} />
                  <FieldLabel label="Endpoint" value={config?.endpoint || 'Unknown'} breakWords />
                </div>
              </div>

              {/* Custom AI Model Form */}
              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <div>
                    <h2>Configure Custom AI Model</h2>
                    <p>Redirect claim extraction LLM prompts to your own local or cloud endpoints.</p>
                  </div>
                  <KeyRound size={20} />
                </div>

                <form onSubmit={handleSaveAiSettings} style={{ display: 'grid', gap: '1.25rem', marginTop: '0.5rem' }}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="ai-endpoint">Endpoint URI</label>
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

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="ai-api-key">
                      API Secret Key {aiSettings?.api_key_configured ? '(configured)' : ''}
                    </label>
                    <input
                      id="ai-api-key"
                      type="password"
                      value={form.api_key}
                      onChange={(event) => setForm((current) => ({ ...current, api_key: event.target.value }))}
                      placeholder={aiSettings?.api_key_configured ? 'Leave blank to keep current key' : 'Optional for local endpoints'}
                      className="twisty-search-input"
                      style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem' }}
                      autoComplete="off"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button className="btn-primary" type="submit" disabled={saving} style={{ borderRadius: '999px', padding: '0.65rem 1.75rem' }}>
                      {saving ? 'Saving...' : 'Save Model'}
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={handleResetAiSettings}
                      disabled={resetting || !config?.using_custom_ai}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '999px', padding: '0.65rem 1.5rem' }}
                    >
                      <RefreshCw size={15} />
                      {resetting ? 'Resetting...' : 'Use Default'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Health & Delete */}
            <div className="twisty-column-right">
              
              {/* Service Health */}
              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <div>
                    <h2>Service Health</h2>
                    <p>Current operational health of downstream microservices.</p>
                  </div>
                  <Server size={20} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <HealthItem name="Backend API Core" status={health?.status === 'ok'} />
                  <HealthItem name="Neo4j Graph Database" status={health?.neo4j === 'connected'} />
                  <HealthItem name="ChromaDB Vector Store" status={health?.chroma === 'connected'} />
                </div>
              </div>

              {/* Delete Account */}
              <div className="dashboard-card-panel" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div className="dashboard-card-header">
                  <div>
                    <h2>Danger Zone</h2>
                    <p>Permanently remove account workspace details.</p>
                  </div>
                  <ShieldAlert size={20} style={{ color: 'var(--accent-rose)' }} />
                </div>

                <form onSubmit={handleDeleteAccount} style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                    Deletes all analysis jobs, Neo4j citation networks, Chroma vectors, and generated API authentication credentials.
                  </p>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="delete-confirm">Type DELETE to confirm</label>
                    <input
                      id="delete-confirm"
                      type="text"
                      value={deleteConfirm}
                      onChange={(event) => setDeleteConfirm(event.target.value)}
                      className="twisty-search-input"
                      style={{ width: '100%', borderRadius: '10px', padding: '0.65rem 1rem' }}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={deleteConfirm !== 'DELETE' || deleting}
                    style={deleteButtonStyle(deleteConfirm === 'DELETE' && !deleting)}
                  >
                    <Trash2 size={15} />
                    {deleting ? 'Deleting...' : 'Delete Workspace Data'}
                  </button>
                </form>
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
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginTop: '0.2rem',
        textTransform: transform ? 'capitalize' : 'none',
        wordBreak: breakWords ? 'break-all' : 'normal',
      }}>
        {value}
      </p>
    </div>
  );
}

function HealthItem({ name, status }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>
      <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {status ? (
          <>
            <CheckCircle size={16} color="var(--accent-emerald)" />
            <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 700 }}>Online</span>
          </>
        ) : (
          <>
            <XCircle size={16} color="var(--accent-rose)" />
            <span style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', fontWeight: 700 }}>Offline</span>
          </>
        )}
      </div>
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
      marginBottom: '1rem'
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
    padding: '0.7rem 1.5rem',
    fontWeight: 700,
    fontSize: '0.88rem',
    color: '#fff',
    background: enabled ? 'var(--accent-rose)' : '#cbd5e1',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease'
  };
}
