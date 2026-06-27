'use client';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { Server, Cpu, CheckCircle, XCircle } from 'lucide-react';
import { getConfig, getHealth } from '../../lib/api';

export default function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [configData, healthData] = await Promise.all([getConfig(), getHealth()]);
        setConfig(configData);
        setHealth(healthData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '2rem' }}>System Settings</h1>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid">
            <div className="glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Cpu className="gradient-text" style={{ color: 'var(--accent-blue)' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>LLM Provider</h2>
              </div>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Active Provider</label>
                  <p style={{ fontSize: '1.125rem', fontWeight: 500, textTransform: 'capitalize' }}>
                    {config?.llm_provider || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Model Name</label>
                  <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                    {config?.model_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Endpoint</label>
                  <p style={{ fontSize: '1.125rem', fontWeight: 500, wordBreak: 'break-all' }}>
                    {config?.endpoint || 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  To change the provider, update the <code style={{ color: 'var(--text-primary)' }}>LLM_PROVIDER</code> setting in the backend <code style={{ color: 'var(--text-primary)' }}>.env</code> file.
                </p>
              </div>
            </div>

            <div className="glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Server className="gradient-text" style={{ color: 'var(--accent-violet)' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Service Health</h2>
              </div>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <HealthItem name="Backend API" status={health?.status === 'ok'} />
                <HealthItem name="Neo4j Graph Database" status={health?.neo4j === 'connected'} />
                <HealthItem name="ChromaDB Vector Store" status={health?.chroma === 'connected'} />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function HealthItem({ name, status }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <span style={{ fontWeight: 500 }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {status ? (
          <><CheckCircle size={18} color="var(--accent-emerald)" /> <span style={{ color: 'var(--accent-emerald)', fontSize: '0.875rem' }}>Online</span></>
        ) : (
          <><XCircle size={18} color="var(--accent-rose)" /> <span style={{ color: 'var(--accent-rose)', fontSize: '0.875rem' }}>Offline</span></>
        )}
      </div>
    </div>
  );
}
