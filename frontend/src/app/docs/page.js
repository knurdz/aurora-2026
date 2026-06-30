'use client';

import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="docs-shell">
        <div className="docs-layout">
          {/* Left Sticky Sidebar */}
          <aside className="docs-sidebar">
            <h3 className="docs-sidebar-title">
              Documentation
            </h3>
            
            <nav className="docs-sidebar-nav">
              <a href="#intro" style={{ fontWeight: 600 }}>Introduction</a>
              
              <div className="docs-sidebar-section">
                <span className="docs-sidebar-section-header">
                  Technical Layers
                </span>
                <a href="#claim-isolation">Claim Isolation</a>
                <a href="#citation-cartels">Citation Cartels</a>
                <a href="#statistical-fraud">Statistical Fraud</a>
              </div>

              <div className="docs-sidebar-section">
                <span className="docs-sidebar-section-header">
                  Features & APIs
                </span>
                <a href="#rest-api">REST API Reference</a>
                <a href="#mcp-server">MCP Integration</a>
                <a href="#privacy-controls">Privacy Controls</a>
              </div>

              <a href="#examples" style={{ fontWeight: 600 }}>Usage Examples</a>
            </nav>
          </aside>

          {/* Right Scrollable Panel */}
          <article className="docs-content">
            {/* Intro */}
            <section id="intro">
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
                VeriScholar Documentation
              </h1>
              <p style={{ fontSize: '1.1rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Welcome to the technical documentation for VeriScholar, an automated, multi-agent research integrity screening framework.
              </p>
              <p>
                VeriScholar analyzes scientific manuscripts (PDF/DOCX) across claim boundaries, citation graphs, and statistical reports to compute a unified research integrity risk score. It provides a visual dashboard for human reviewers, a webhook-ready REST API, and Model Context Protocol (MCP) server endpoints.
              </p>
            </section>

            <hr style={{ border: 0, borderTop: '1px solid rgba(15, 23, 42, 0.06)' }} />

            {/* Technical Details */}
            <section id="tech-layers" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Core Technical Layers
                </h2>
                <p>
                  Our validation engine operates across three isolated analysis layers, orchestrating data through localized vector indexes and graph databases.
                </p>
              </div>

              <div id="claim-isolation" style={{ borderLeft: '3px solid #10b981', paddingLeft: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  1. Claim Isolation (NLP Ingestion)
                </h3>
                <p>
                  During the ingestion phase, fine-tuned LLM agents parse the manuscript body to extract core scientific and experimental assertions. It filters out citation citations, methodology boilerplate, and background summaries to isolate the paper&apos;s novel findings. The extracted claims are indexed in a local Chroma vector database for topological semantic checks, preventing reviewers from having to manually scan the paper.
                </p>
              </div>

              <div id="citation-cartels" style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  2. Citation Cartel & Network Resolution
                </h3>
                <p>
                  VeriScholar resolves the manuscript&apos;s bibliography by querying CrossRef and Semantic Scholar APIs. We build a local citation network graph in Neo4j and execute Louvain community detection. This surfaces circular citation structures (where authors repeatedly reference each other in small circles to artificially inflate scores) and alerts reviewers to references pointing to retracted or high-risk papers.
                </p>
              </div>

              <div id="statistical-fraud" style={{ borderLeft: '3px solid #d97706', paddingLeft: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  3. Statistical Anomaly & Fraud Auditing
                </h3>
                <p>
                  The statistics auditor scans reported findings for mathematical consistency:
                </p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><strong>GRIM Test:</strong> Verifies if reported means correspond mathematically to the declared sample sizes and integers.</li>
                  <li><strong>p-Curve Analysis:</strong> Audits the distribution of reported p-values. A high density of p-values just below the 0.05 threshold indicates p-hacking and study manipulation.</li>
                  <li><strong>Power Calculations:</strong> Evaluates study sample sizes against median effect sizes to flag underpowered research.</li>
                </ul>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: '1px solid rgba(15, 23, 42, 0.06)' }} />

            {/* Features & APIs */}
            <section id="features-apis" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Features & Integrations
                </h2>
                <p>
                  Integrate VeriScholar directly into journal manuscript systems, automated peer review pipelines, or local developer setups.
                </p>
              </div>

              <div id="rest-api">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  REST API Specifications
                </h3>
                <p>
                  All REST endpoints require an active API key passed in the authorization header:
                </p>
                <code style={{ display: 'block', padding: '0.2rem 0.5rem', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '6px', width: 'fit-content', fontSize: '0.85rem', fontFamily: 'monospace', margin: '0.5rem 0' }}>
                  Authorization: Bearer vs_live_...
                </code>

                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.35rem' }}>
                  POST /v1/analyses
                </h4>
                <p>Submit a new manuscript file for analysis. Request body must be multi-part form data containing the file binary.</p>

                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.35rem' }}>
                  GET /v1/analyses/{`{analysis_id}`}
                </h4>
                <p>Retrieve the integrity score, extracted claims list, Louvain cartel network status, and statistics audit findings.</p>
              </div>

              <div id="mcp-server">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Model Context Protocol (MCP) Integration
                </h3>
                <p>
                  VeriScholar implements the Model Context Protocol (MCP). This standardizes communication between our verification databases and LLM clients (such as Claude Desktop or Cursor).
                </p>
                <p>
                  When connected to an MCP client, the LLM can query Neo4j networks, run GRIM evaluations, or isolate claims directly using simple prompt calls, making VeriScholar a powerful assistant inside your editor or chatbot workspace.
                </p>
              </div>

              <div id="privacy-controls">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Privacy Controls & Custom AI Models
                </h3>
                <p>
                  Signed-in users can configure their own OpenAI-compatible model endpoint from the Settings page by providing an endpoint URL, model name, and optional API key. Once saved, future dashboard, REST API, and MCP submissions for that account use the custom model route instead of the system default provider.
                </p>
                <p>
                  Users can also delete their VeriScholar account data from Settings. The deletion flow removes account sessions, dashboard-created API keys, stored AI model settings, analysis records, progress logs, and ChromaDB claim vectors associated with the user&apos;s analyses. Active analyses must finish before deletion so no in-flight job continues processing a manuscript after the removal request.
                </p>
              </div>
            </section>

            <hr style={{ border: 0, borderTop: '1px solid rgba(15, 23, 42, 0.06)' }} />

            {/* Examples */}
            <section id="examples">
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
                Usage Examples
              </h2>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Programmatic Manuscript Ingestion (cURL)
              </h4>
              <pre className="quickstart-panel" style={{ padding: '1rem', background: '#0f172a', color: '#dbeafe', borderRadius: '12px', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace' }}>
{`# Submit a manuscript PDF for analysis
curl -X POST https://verischolar.knurdz.org/api/v1/analyses \\
  -H "Authorization: Bearer vs_live_your_secret_key" \\
  -F "file=@/path/to/manuscript.pdf"

# Response returns analysis job ID
# { "analysis_id": "a98fd7-f7a9-..." }`}
              </pre>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                Querying Audit Status
              </h4>
              <pre className="quickstart-panel" style={{ padding: '1rem', background: '#0f172a', color: '#dbeafe', borderRadius: '12px', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace' }}>
{`# Fetch report once status is processed
curl https://verischolar.knurdz.org/api/v1/analyses/a98fd7-f7a9-... \\
  -H "Authorization: Bearer vs_live_your_secret_key"`}
              </pre>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
