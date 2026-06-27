'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { Loader2, Terminal, CheckCircle2, AlertCircle, Play } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AnalyzePage() {
  const { id } = useParams();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('connecting'); // connecting, analyzing, completed, failed
  const [currentPhase, setCurrentPhase] = useState(1); // 1 to 4
  const [errorMsg, setErrorMsg] = useState('');
  const terminalEndRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!id) return;

    const eventSource = new EventSource(`${API_BASE}/events/${id}`);
    setStatus('analyzing');

    eventSource.onmessage = (event) => {
      const message = event.data;
      setLogs((prevLogs) => [...prevLogs, message]);

      // Detect current phase from message contents
      if (message.includes('Parsing document') || message.includes('Parsed')) {
        setCurrentPhase(1);
      } else if (message.includes('Extracting claims') || message.includes('Page') || message.includes('Embedding')) {
        setCurrentPhase(2);
      } else if (message.includes('Resolving') || message.includes('Louvain') || message.includes('cartel risk')) {
        setCurrentPhase(3);
      } else if (message.includes('Extracting statistical') || message.includes('GRIM') || message.includes('p-curve') || message.includes('Scoring') || message.includes('Markdown')) {
        setCurrentPhase(4);
      }

      // Check for completion or error
      if (message.includes('🏁 Complete!')) {
        setStatus('completed');
        eventSource.close();
        // Redirect after a short delay so the user sees the completed state
        setTimeout(() => {
          router.push(`/report/${id}`);
        }, 1500);
      } else if (message.includes('❌ Error during analysis')) {
        setStatus('failed');
        setErrorMsg(message.replace('❌ Error during analysis:', '').trim());
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // We don't close immediately as it might try to reconnect, 
      // but if the status was already processing we can display a connecting warning.
    };

    return () => {
      eventSource.close();
    };
  }, [id, router]);

  const phases = [
    { num: 1, label: 'Ingestion & Parsing' },
    { num: 2, label: 'Claim Isolation (LLM)' },
    { num: 3, label: 'Citation Graph Resolution' },
    { num: 4, label: 'Statistical Integrity Audit' },
  ];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .terminal-window {
            background: rgba(5, 7, 15, 0.95);
            border: var(--glass-border);
            border-radius: var(--radius);
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 450px;
          }
          .terminal-header {
            background: rgba(255, 255, 255, 0.03);
            padding: 0.75rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: var(--glass-border);
          }
          .terminal-dots {
            display: flex;
            gap: 6px;
          }
          .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }
          .dot-red { background: #ff5f56; }
          .dot-yellow { background: #ffbd2e; }
          .dot-green { background: #27c93f; }
          
          .terminal-body {
            padding: 1.5rem;
            overflow-y: auto;
            flex-grow: 1;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            color: #a9b2c3;
          }
          .log-line {
            margin-bottom: 0.5rem;
            word-break: break-all;
            white-space: pre-wrap;
          }
          .log-cursor {
            display: inline-block;
            width: 8px;
            height: 15px;
            background: var(--accent-blue);
            margin-left: 5px;
            animation: blink 1s infinite;
            vertical-align: middle;
          }
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          
          .phase-step {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.02);
            border: 1px solid transparent;
            transition: all 0.3s ease;
          }
          .phase-step.active {
            background: rgba(59, 130, 246, 0.08);
            border: 1px solid rgba(59, 130, 246, 0.25);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.04);
          }
          .phase-step.completed {
            background: rgba(16, 185, 129, 0.06);
            border: 1px solid rgba(16, 185, 129, 0.15);
          }
          .phase-num {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            background: rgba(15, 23, 42, 0.05);
            color: var(--text-secondary);
          }
          .phase-step.active .phase-num {
            background: var(--accent-blue);
            color: white;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
          }
          .phase-step.completed .phase-num {
            background: var(--accent-emerald);
            color: white;
          }
        `}} />

        <div style={{ textAlign: 'center', margin: '2rem 0 1rem 0' }}>
          {status === 'completed' ? (
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={36} /> Analysis Complete
            </h1>
          ) : status === 'failed' ? (
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <AlertCircle size={36} /> Analysis Failed
            </h1>
          ) : (
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <Loader2 className="spin" size={36} style={{ color: 'var(--accent-blue)', animation: 'spin 1.5s linear infinite' }} />
              Analyzing Paper...
            </h1>
          )}
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            {status === 'completed' && "Redirecting to your audit report..."}
            {status === 'failed' && `Error: ${errorMsg || 'Pipeline crashed'}`}
            {status === 'analyzing' && "Executing multi-agent verification pipeline..."}
          </p>
        </div>

        <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
          {/* Progress Steps Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {phases.map((phase) => {
              const isActive = currentPhase === phase.num && status === 'analyzing';
              const isCompleted = currentPhase > phase.num || status === 'completed';
              
              return (
                <div 
                  key={phase.num} 
                  className={`phase-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="phase-num">
                    {isCompleted ? '✓' : phase.num}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {phase.label}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)', opacity: 0.8 }}>
                      {isActive ? 'Processing...' : isCompleted ? 'Done' : 'Waiting'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terminal Logs Column */}
          <div className="terminal-window" style={{ gridColumn: 'span 2' }}>
            <div className="terminal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Terminal size={16} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  verischolar-audit-pipeline.sh
                </span>
              </div>
              <div className="terminal-dots">
                <div className="dot dot-red"></div>
                <div className="dot dot-yellow"></div>
                <div className="dot dot-green"></div>
              </div>
            </div>
            
            <div className="terminal-body">
              {logs.map((log, idx) => (
                <div key={idx} className="log-line">
                  {log}
                </div>
              ))}
              {status === 'analyzing' && (
                <div className="log-line" style={{ color: 'var(--accent-blue)' }}>
                  <span>$ running task...</span>
                  <span className="log-cursor"></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
