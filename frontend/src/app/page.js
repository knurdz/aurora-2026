'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Home() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.doc_id) {
        // Navigate to the report page directly for now, or analysis progress if built later
        router.push(`/report/${data.doc_id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Analysis failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.1 }}>
          Verify <span className="gradient-text">Research Integrity</span><br/> at Scale
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '3rem' }}>
          Upload a scientific paper (PDF/DOCX) to automatically detect statistical fraud, citation cartels, and uncited claims.
        </p>

        <div 
          className="glass-panel"
          style={{ 
            width: '100%', 
            maxWidth: '600px', 
            padding: '3rem',
            borderStyle: isDragging ? 'dashed' : 'solid',
            borderColor: isDragging ? 'var(--accent-blue)' : 'var(--glass-border)',
            background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-card)'
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {!file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <UploadCloud size={48} color="var(--text-secondary)" />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Drag & Drop your paper here</h3>
                <p style={{ color: 'var(--text-secondary)' }}>or click to browse (PDF, DOCX)</p>
              </div>
              <input 
                type="file" 
                id="file-upload" 
                style={{ display: 'none' }} 
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button 
                className="btn-secondary" 
                onClick={() => document.getElementById('file-upload').click()}
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <FileText size={48} className="gradient-text" color="var(--accent-blue)" />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{file.name}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-secondary" onClick={() => setFile(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleAnalyze} disabled={isUploading}>
                  {isUploading ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
