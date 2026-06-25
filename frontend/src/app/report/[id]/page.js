'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Navbar from '../../../components/Navbar';
import { FileText, Download, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function ReportPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analysis/${id}`);
        if (!res.ok) throw new Error('Analysis not found');
        setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <><Navbar /><main><p>Loading report...</p></main></>;
  if (!data) return <><Navbar /><main><p>Report not found.</p></main></>;

  const score = data.integrity_score || 0;
  const isCritical = score < 0.55;

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Audit Report</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <FileText size={16} />
              <span>{data.filename}</span>
              <span>•</span>
              <span>{new Date(data.timestamp).toLocaleString()}</span>
            </div>
          </div>
          
          <button className="btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} />
            Export PDF
          </button>
        </div>

        <div className="grid grid-cols-3" style={{ marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            {isCritical ? <ShieldAlert size={48} color="var(--accent-rose)" /> : <ShieldCheck size={48} color="var(--accent-emerald)" />}
            <h2 style={{ fontSize: '3rem', fontWeight: 800, marginTop: '1rem', color: isCritical ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
              {(score * 100).toFixed(0)}%
            </h2>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Integrity Score</p>
          </div>
          
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Summary Stats</h3>
            <div className="grid grid-cols-2">
              <Stat label="Pages Parsed" value={data.pages_parsed} />
              <Stat label="Claims Found" value={data.claims_found} />
              <Stat label="Citations Resolved" value={data.citations_resolved} />
              <Stat label="Overall Fraud Risk" value={data.fraud_risk} color={data.fraud_risk === 'high' ? 'var(--accent-rose)' : 'inherit'} />
            </div>
          </div>
        </div>

        <div className="glass-panel report-content" style={{ padding: '3rem' }}>
          <style dangerouslySetInnerHTML={{__html: `
            .report-content h1, .report-content h2, .report-content h3 { margin-top: 2rem; margin-bottom: 1rem; color: white; }
            .report-content h1 { font-size: 2rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; }
            .report-content h2 { font-size: 1.5rem; }
            .report-content p { margin-bottom: 1rem; color: var(--text-secondary); }
            .report-content ul { padding-left: 1.5rem; margin-bottom: 1rem; color: var(--text-secondary); }
            .report-content li { margin-bottom: 0.5rem; }
            .report-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
            .report-content th, .report-content td { border: 1px solid var(--glass-border); padding: 0.75rem; text-align: left; }
            .report-content th { background: rgba(255,255,255,0.05); color: white; }
            .report-content td { color: var(--text-secondary); }
          `}} />
          {data.audit_report ? (
            <ReactMarkdown>{data.audit_report}</ReactMarkdown>
          ) : (
            <p>No text report available.</p>
          )}
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</p>
      <p style={{ fontSize: '1.25rem', fontWeight: 600, color: color || 'white', textTransform: 'capitalize' }}>{value}</p>
    </div>
  );
}
