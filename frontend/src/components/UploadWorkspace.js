'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  UploadCloud, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Network, 
  Calculator, 
  FileScan, 
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Trash2
} from 'lucide-react';
import { analyzeDocument, getHistory } from '../lib/api';

const MOCK_CLAIMS = [
  { text: "The treatment cohort demonstrated a ", highlight: "34.2% reduction in tumor volume", postText: " over 12 weeks." },
  { text: "Analysis of the control group confirmed ", highlight: "no abnormal cell morphology", postText: " across all replicates." },
  { text: "The correlation between markers was ", highlight: "highly significant (p < 0.001)", postText: " using Pearson coefficient." },
  { text: "High-resolution imaging revealed ", highlight: "accelerated protein aggregation", postText: " in mutant samples." }
];

export default function UploadWorkspace() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // History states
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simulation states
  const [activeClaimIdx, setActiveClaimIdx] = useState(0);
  
  const router = useRouter();

  // Fetch recent audits
  const fetchHistory = async (showPulse = false) => {
    if (showPulse) setRefreshing(true);
    try {
      const data = await getHistory();
      if (data && data.history) {
        // Sort by timestamp desc and take top 5
        const sorted = [...data.history].sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        setHistory(sorted.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    
    // Cycle mock claims
    const claimInterval = setInterval(() => {
      setActiveClaimIdx((prev) => (prev + 1) % MOCK_CLAIMS.length);
    }, 3800);

    return () => {
      clearInterval(claimInterval);
    };
  }, []);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const droppedFile = event.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (ext === 'pdf' || ext === 'docx') {
        setFile(droppedFile);
      } else {
        alert('Invalid file format. Please upload a PDF or DOCX file.');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await analyzeDocument(file);
      if (data.doc_id) {
        router.push(`/analyze/${data.doc_id}`);
      }
    } catch (error) {
      console.error(error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to format date
  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const getStatusBadge = (status, score) => {
    switch (status) {
      case 'processed':
        return (
          <div className="audit-status-badge processed">
            <span className="status-dot"></span>
            <span>Completed {score !== undefined && score !== null ? `(${score}/100)` : ''}</span>
          </div>
        );
      case 'failed':
        return (
          <div className="audit-status-badge failed">
            <span className="status-dot"></span>
            <span>Failed</span>
          </div>
        );
      case 'processing':
        return (
          <div className="audit-status-badge processing">
            <span className="status-dot pulse-dot"></span>
            <span>Analyzing...</span>
          </div>
        );
      default:
        return (
          <div className="audit-status-badge pending">
            <span className="status-dot"></span>
            <span>Queued</span>
          </div>
        );
    }
  };

  return (
    <div className="audit-workspace-layout-spacious">
      
      {/* TOP SECTION: Title Block, Upload Dropzone, Recent Audits */}
      <div className="workspace-top-section">
        
        {/* Title Block */}
        <div className="workspace-hero-block centered">
          <h1>Manuscript Integrity Audit</h1>
          <p>
            Submit your manuscript in PDF or DOCX format to run deep-scan LLM claim isolation, Louvain citation cartel network extraction, and GRIM / p-curve statistical audits.
          </p>
        </div>

        {/* Upload Box */}
        <div
          className={`upload-card-wrapper spacious ${isDragging ? 'dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="card-glass-glow" />
          
          {!file ? (
            <div className="dropzone-area spacious">
              <input
                type="file"
                id="file-upload"
                className="upload-input"
                accept=".pdf,.docx"
                onChange={(event) => {
                  if (event.target.files && event.target.files[0]) {
                    setFile(event.target.files[0]);
                  }
                }}
              />
              <div className="upload-circle-glow spacious">
                <UploadCloud size={38} className="upload-cloud-icon" />
              </div>
              <h3>Drag & drop manuscript here</h3>
              <p>Supports scientific manuscripts in PDF or DOCX formats</p>
              
              <div className="dropzone-actions">
                <button
                  type="button"
                  className="btn-glass"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Browse Files
                </button>
                <span className="format-hint">Max file size 25MB</span>
              </div>
            </div>
          ) : (
            <div className="file-ready-area spacious">
              <div className="file-icon-box">
                <FileText size={38} className="file-icon" />
              </div>
              <div className="file-details">
                <h3 className="file-name">{file.name}</h3>
                <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready for analysis</p>
              </div>
              <div className="file-actions">
                <button 
                  type="button" 
                  className="btn-trash" 
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                  title="Remove file"
                >
                  <Trash2 size={18} />
                  <span>Clear</span>
                </button>
                <button 
                  type="button" 
                  className="btn-run-audit" 
                  onClick={handleAnalyze} 
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} fill="white" />
                      <span>Run Integrity Audit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Audits Log */}
        <div className="recent-audits-section">
          <div className="section-header">
            <div className="header-left">
              <h2>Recent Audits</h2>
              <span className="audits-count">({history.length})</span>
            </div>
            <button 
              type="button" 
              className={`btn-refresh ${refreshing ? 'refreshing' : ''}`}
              onClick={() => fetchHistory(true)}
              title="Refresh log history"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="audits-list-container">
            {loadingHistory ? (
              // Skeleton Loader (Grid)
              <div className="skeleton-list-grid">
                {[1, 2].map((n) => (
                  <div key={n} className="skeleton-item">
                    <div className="skeleton-bar title" />
                    <div className="skeleton-row">
                      <div className="skeleton-bar badge" />
                      <div className="skeleton-bar date" />
                    </div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="empty-history-card">
                <FileCheck2 size={28} className="empty-icon" />
                <p>No recent audits found.</p>
                <span>Manuscripts you analyze will be logged here for easy access.</span>
              </div>
            ) : (
              <div className="audits-grid-spacious">
                {history.map((item) => {
                  const isProcessed = item.status === 'processed';
                  const targetUrl = isProcessed ? `/report/${item.doc_id}` : `/analyze/${item.doc_id}`;
                  
                  return (
                    <div 
                      key={item.analysis_id || item.doc_id} 
                      className="audit-history-card"
                      onClick={() => router.push(targetUrl)}
                    >
                      <div className="card-top">
                        <span className="doc-name" title={item.filename}>
                          {item.filename}
                        </span>
                        <ChevronRight size={16} className="chevron-link" />
                      </div>
                      <div className="card-bottom">
                        {getStatusBadge(item.status, item.integrity_score)}
                        <span className="audit-time">{formatTime(item.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>      {/* BOTTOM SECTION: Interactive Pipeline Details */}
      <div className="workspace-bottom-section">
        <div className="pipeline-header">
          <h3>How the audit works</h3>
          <p>Three specialized AI agents run in parallel to analyze your manuscript end-to-end</p>
        </div>

        <div className="pipeline-modules-grid">

          {/* Module 1: Claim Isolation */}
          <div className="pipeline-module-card-spacious">
            <div className="pmc-step-number violet">01</div>
            <div className="pmc-content">
              <div className="pmc-icon violet">
                <FileScan size={24} />
              </div>
              <h4>Claim Isolation Engine</h4>
              <p>LLM agents parse your manuscript page by page, extracting every factual assertion and mapping it to supporting evidence.</p>
            </div>
            <div className="module-simulation-box claims-sim">
              <div className="sim-title">
                <span className="sim-indicator blink" />
                <span>Claim Extractor · Processing page 4 of 22</span>
              </div>
              <div className="claims-text-container">
                <p className="claim-para-text">
                  {MOCK_CLAIMS[activeClaimIdx].text}
                  <span className="isolated-claim-highlight">
                    {MOCK_CLAIMS[activeClaimIdx].highlight}
                    <span className="claim-pop-tag">Claim Isolated</span>
                  </span>
                  {MOCK_CLAIMS[activeClaimIdx].postText}
                </p>
              </div>
            </div>
          </div>

          {/* Module 2: Citation Graph Network */}
          <div className="pipeline-module-card-spacious">
            <div className="pmc-step-number blue">02</div>
            <div className="pmc-content">
              <div className="pmc-icon blue">
                <Network size={24} />
              </div>
              <h4>Citation Cartel Detector</h4>
              <p>Resolves your reference list via CrossRef and Semantic Scholar, then runs Louvain community detection to flag suspicious citation rings.</p>
            </div>
            <div className="module-simulation-box citation-sim">
              <div className="sim-title">
                <span className="sim-indicator blink" />
                <span>Louvain community detection · 148 refs resolved</span>
              </div>
              <div className="network-diagram-container">
                <svg className="network-svg" viewBox="0 0 260 130">
                  {/* Main edges */}
                  <line x1="50" y1="100" x2="130" y2="40" stroke="rgba(124, 58, 237, 0.35)" strokeWidth="1.5" strokeDasharray="5,4" className="flow-dash-fast" />
                  <line x1="210" y1="100" x2="130" y2="40" stroke="rgba(124, 58, 237, 0.35)" strokeWidth="1.5" strokeDasharray="5,4" className="flow-dash-fast-reverse" />
                  <line x1="50" y1="100" x2="210" y2="100" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1" />
                  <line x1="130" y1="40" x2="130" y2="100" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="3,3" />
                  {/* Cartel loop */}
                  <path d="M 130,100 Q 155,75 130,55 Q 105,75 130,100" fill="none" stroke="var(--accent-rose)" strokeWidth="2" strokeDasharray="4,3" className="cartel-loop-flow" />
                </svg>
                <div className="net-node node-a" title="Your Paper"><span className="node-pulse" /><span className="node-lbl">Paper</span></div>
                <div className="net-node node-b" title="Ref B"><span className="node-lbl">Ref B</span></div>
                <div className="net-node node-c" title="Ref A"><span className="node-lbl">Ref A</span></div>
                <div className="net-node node-d suspect-node" title="Cartel Ring"><span className="node-pulse ring-suspect" /><span className="node-lbl">⚠ Cartel</span></div>
              </div>
            </div>
          </div>

          {/* Module 3: Statistical Fraud */}
          <div className="pipeline-module-card-spacious">
            <div className="pmc-step-number emerald">03</div>
            <div className="pmc-content">
              <div className="pmc-icon emerald">
                <Calculator size={24} />
              </div>
              <h4>Statistical Fraud Audit</h4>
              <p>Scans reported means via GRIM, checks p-value distributions for selective reporting patterns, and scores study statistical power.</p>
            </div>
            <div className="module-simulation-box stats-sim">
              <div className="sim-title">
                <span className="sim-indicator blink" />
                <span>p-Curve analysis · 31 p-values detected</span>
              </div>
              <div className="pcurve-chart-wrapper">
                <svg className="pcurve-svg" viewBox="0 0 240 100">
                  {/* Grid */}
                  <line x1="0" y1="25" x2="240" y2="25" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="55" x2="240" y2="55" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <line x1="0" y1="85" x2="240" y2="85" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  {/* p=0.05 threshold */}
                  <line x1="96" y1="0" x2="96" y2="100" stroke="rgba(239,68,68,0.6)" strokeWidth="1.5" strokeDasharray="4,3" />
                  <text x="100" y="16" fill="rgba(239,68,68,0.9)" fontSize="8" fontWeight="bold">p = 0.05</text>
                  {/* Expected uniform line */}
                  <line x1="12" y1="55" x2="228" y2="55" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,3" />
                  {/* Observed curve (left-skewed = suspicious) */}
                  <path d="M 12,85 Q 50,78 94,28 L 96,82 Q 140,86 228,88" fill="rgba(16,185,129,0.08)" stroke="var(--accent-emerald)" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Scan sweep */}
                  <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(16,185,129,0.4)" strokeWidth="5" className="radar-sweep" />
                </svg>
                <div className="chart-labels">
                  <span>p → 0 (suspicious spike)</span>
                  <span>p = 0.05 cut-off</span>
                  <span>p → 1</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>


    </div>
  );
}
