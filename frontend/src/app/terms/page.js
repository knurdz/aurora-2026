'use client';
import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function TermsPage() {
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
            Terms and Conditions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using VeriScholar, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                2. Acceptable Use
              </h2>
              <p>
                VeriScholar is designed for scientific manuscript integrity verification. You agree to use the services only for lawful purposes and under the following constraints:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>You must have the legal right or permission to upload and audit the files submitted to the system.</li>
                <li>You may not use the tool to automate manuscript creation, reverse-engineer LLM prompts, or disrupt database servers.</li>
                <li>No automated scraping or querying of VeriScholar's Neo4j citation topologies is allowed outside of standard usage.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                3. Service Availability and Accuracy
              </h2>
              <p>
                VeriScholar provides automated scans based on public records and AI-based logic:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>No Guarantees:</strong> While our checks (GRIM, Louvain circles, p-curve) are mathematically grounded, results do not constitute definitive proof of fraud or compliance.</li>
                <li><strong>As-Is Basis:</strong> The service is provided "as is". We make no warranties about database synchronization uptimes or LLM response consistencies.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                4. Limitation of Liability
              </h2>
              <p>
                VeriScholar, its developers, and contributors are not liable for any direct or indirect consequences arising from manuscript scores or reports. This includes, but is not limited to: academic journal decisions, institutional investigations, reviewer choices, or academic career outcomes.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                5. Termination of Access
              </h2>
              <p>
                We reserve the right to suspend or block access to our services if a user is found violating these terms, uploading malformed files, or generating abnormal API request traffic.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                6. Contact Information
              </h2>
              <p>
                For questions regarding these Terms, please contact us at <a href="mailto:terms@verischolar.org" style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 500 }}>terms@verischolar.org</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
