'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, UploadCloud } from 'lucide-react';
import { analyzeDocument } from '../lib/api';

export default function UploadWorkspace() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setFile(event.dataTransfer.files[0]);
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

  return (
    <div
      className={`glass-panel upload-dropzone ${isDragging ? 'dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {!file ? (
        <div className="upload-state">
          <div className="upload-icon-shell" aria-hidden="true">
            <UploadCloud size={42} />
          </div>
          <div className="upload-copy">
            <h2>Drag and drop your paper here</h2>
            <p>Upload a PDF or DOCX to run a full integrity audit with live progress tracking.</p>
          </div>
          <input
            type="file"
            id="file-upload"
            className="upload-input"
            accept=".pdf,.docx"
            onChange={(event) => setFile(event.target.files[0])}
          />
          <div className="upload-action-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Browse Files
            </button>
            <span className="upload-note">Accepted formats: PDF, DOCX</span>
          </div>
        </div>
      ) : (
        <div className="upload-state">
          <div className="upload-icon-shell file-ready" aria-hidden="true">
            <FileText size={40} />
          </div>
          <div className="upload-copy">
            <h2>{file.name}</h2>
            <p>{(file.size / 1024 / 1024).toFixed(2)} MB ready for analysis.</p>
          </div>
          <div className="upload-action-row">
            <button type="button" className="btn-secondary" onClick={() => setFile(null)}>
              Remove
            </button>
            <button type="button" className="btn-primary" onClick={handleAnalyze} disabled={isUploading}>
              {isUploading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
