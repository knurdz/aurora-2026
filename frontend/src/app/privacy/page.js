'use client';
import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="landing-shell" style={{ minHeight: '80vh', padding: '6rem 2rem 4rem' }}>
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          background: '#ffffff', 
          padding: '3rem', 
          borderRadius: '24px', 
          border: '1px solid rgba(15, 23, 42, 0.06)', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.01)' 
        }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                1. Introduction
              </h2>
              <p>
                At VeriScholar, we are committed to protecting your academic research and personal data. This Privacy Policy outlines how we collect, process, and safeguard the information you provide when using our manuscript verification services.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                2. Information We Process
              </h2>
              <p>
                To perform automated manuscript audits, our system processes the following assets:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Manuscript Documents:</strong> Scholarly papers in PDF or DOCX format uploaded for verification checks.</li>
                <li><strong>Metadata:</strong> Bibliographic metadata such as paper titles, authors, and citation lists extracted during the analysis phases.</li>
                <li><strong>Configuration Data:</strong> Custom AI model endpoints, model names, and API tokens configured on your settings page.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                3. How We Process Data
              </h2>
              <p>
                All file processing is structured to respect research confidentiality:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Confidential Analysis:</strong> Uploaded manuscripts are processed temporarily for claim isolation and statistical anomaly checks.</li>
                <li><strong>Custom AI Routing:</strong> If you configure your own AI provider, manuscript text used for LLM claim extraction and statistics extraction is sent to that endpoint instead of the VeriScholar default provider.</li>
                <li><strong>API Integrations:</strong> Citation cartel resolution is audited against public databases (CrossRef and Semantic Scholar). No manuscript body text is sent to these endpoints.</li>
                <li><strong>No Commercial Storage:</strong> We do not store, index, sell, or train external machine learning models on your uploaded files.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                4. Data Security
              </h2>
              <p>
                Your verification jobs run inside isolated Docker containers. Database storage (Neo4j and Chroma DB vectors) is sandboxed with network-level encryption, ensuring that only authorized sessions can view generated reports.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                5. Your Controls
              </h2>
              <p>
                From Settings, you can switch future analyses to your own OpenAI-compatible AI endpoint and delete your VeriScholar account data. Account deletion removes sessions, API keys, custom AI settings, analysis records, progress logs, and stored claim vectors associated with your analyses.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                6. Changes to This Policy
              </h2>
              <p>
                We may update this policy periodically to reflect changes in our verification tools or system architecture. We encourage you to review this page regularly.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                7. Contact Information
              </h2>
              <p>
                If you have questions about our privacy practices, please contact us at <a href="mailto:privacy@verischolar.org" style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 500 }}>privacy@verischolar.org</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
