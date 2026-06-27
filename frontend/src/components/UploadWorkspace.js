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
          <div className="eyebrow-glow">
            <Sparkles size={14} />
            <span>INTEGRITY VERIFICATION PLATFORM</span>
          </div>
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

      </div>

      {/* BOTTOM SECTION: Interactive Pipeline Details */}
      <div className="workspace-bottom-section">
        <div className="pipeline-header centered">
          <h3>Active Audit Pipeline Modules</h3>
          <p>Verification sub-agents execute these checks in parallel</p>
        </div>

        <div className="pipeline-modules-grid">
          
          {/* Module 1: Claim Isolation */}
          <div className="pipeline-module-card-spacious">
            <div className="module-card-header">
              <div className="icon-badge violet">
                <FileScan size={18} />
              </div>
              <div>
                <h4>1. Claim Isolation Engine</h4>
                <p>LLM Agents parse manuscript structures to isolate core assertions.</p>
              </div>
            </div>
            
            {/* Interactive Simulation */}
            <div className="module-simulation-box claims-sim">
              <div className="sim-title">
                <span className="sim-indicator blink" />
                <span>Agent Claims Extractor: Active</span>
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
            <div className="module-card-header">
              <div className="icon-badge blue">
                <Network size={18} />
              </div>
              <div>
                <h4>2. Citation Graph & Cartel Detector</h4>
                <p>Resolves citation coordinates and checks for circular network rings.</p>
              </div>
            </div>

            {/* Interactive Simulation */}
            <div className="module-simulation-box citation-sim">
              <div className="sim-title">
                <span className="sim-indicator blink" />
                <span>Louvain Community Detection</span>
              </div>
              <div className="network-diagram-container">
                <svg className="network-svg" viewBox="0 0 200 110">
                  <path d="M 40,80 Q 100,10 160,80" fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" />
                  <line x1="40" y1="80" x2="100" y2="40" stroke="rgba(124, 58, 237, 0.4)" strokeWidth="1.5" strokeDasharray="4,4" className="flow-dash-fast" />
                  <line x1="160" y1="80" x2="100" y2="40" stroke="rgba(124, 58, 237, 0.4)" strokeWidth="1.5" strokeDasharray="4,4" className="flow-dash-fast-reverse" />
                  <path d="M 100,40 Q 130,60 100,80 Q 70,60 100,40" fill="none" stroke="var(--accent-rose)" strokeWidth="1.5" strokeDasharray="3,3" className="cartel-loop-flow" />
                </svg>

                <div className="net-node node-a" title="Your Paper">
                  <span className="node-pulse" />
                  <span className="node-lbl">Manuscript</span>
                </div>
                <div className="net-node node-b" title="Referenced Work A">
                  <span className="node-lbl">Ref A</span>
                </div>
                <div className="net-node node-c" title="Referenced Work B">
                  <span className="node-lbl">Ref B</span>
                </div>
                <div className="net-node node-d suspect-node" title="Citation Ring Flag">
                  <span className="node-pulse ring-suspect" />
                  <span className="node-lbl">Cartel Ring</span>
                </div>
              </div>
            </div>
          </div>

          {/* Module 3: Statistical Fraud */}
          <div className="pipeline-module-card-spacious">
            <div className="module-card-header">
              <div className="icon-badge emerald">
                <Calculator size={18} />
              </div>
              <div>
                <h4>3. Statistical Fraud Audit</h4>
                <p>Performs GRIM arithmetic tests and scans p-curve distributions.</p>
              </div>
            </div>

            {/* Interactive Simulation */}
            <div className="module-simulation-box stats-sim">
              <div className="sim-title">
                <span className="sim-indicator blink" />
                <span>p-Curve Analysis (p-hacking Check)</span>
              </div>
              
              <div className="pcurve-chart-wrapper">
                <svg className="pcurve-svg" viewBox="0 0 200 90">
                  <line x1="0" y1="10" x2="200" y2="10" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />
                  <line x1="0" y1="40" x2="200" y2="40" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />
                  <line x1="0" y1="70" x2="200" y2="70" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />
                  <line x1="100" y1="0" x2="100" y2="90" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />
                  
                  <line x1="80" y1="0" x2="80" y2="90" stroke="var(--accent-rose)" strokeWidth="1.2" strokeDasharray="3,3" />
                  <text x="84" y="15" fill="var(--accent-rose)" fontSize="7" fontWeight="bold">p = 0.05</text>
                  
                  <path 
                    d="M 10,15 Q 40,20 78,25 L 80,75 Q 120,80 190,82" 
                    fill="none" 
                    stroke="var(--accent-emerald)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />

                  <line x1="0" y1="0" x2="0" y2="90" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="4" className="radar-sweep" />
                </svg>
                
                <div className="chart-labels">
                  <span>High Significance (p &lt; 0.01)</span>
                  <span>No Significance</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
