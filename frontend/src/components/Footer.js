import React from 'react';
import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer-wrap">
      <div className="footer-container">
        {/* Logo & Info */}
        <div>
          <h3 className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Logo size={32} />
            Veri<span style={{ color: '#0d9488' }}>Scholar</span>
          </h3>
          <p className="footer-bio">
            AI-driven verification frameworks auditing scientific claims, citation topologies, and statistical consistency.
          </p>
          <span className="footer-copy">
            &copy; {new Date().getFullYear()} VeriScholar. All rights reserved.
          </span>
        </div>

        {/* Links Column 1 */}
        <div className="footer-col">
          <h4>Capabilities</h4>
          <div className="footer-links">
            <a href="/#capabilities">Claim Isolation</a>
            <a href="/#capabilities">Citation Cartels</a>
            <a href="/#capabilities">Statistical Audits</a>
            <Link href="/audit">Integrity Scoring</Link>
          </div>
        </div>

        {/* Links Column 2 */}
        <div className="footer-col">
          <h4>Workspace</h4>
          <div className="footer-links">
            <Link href="/audit">Start Audit</Link>
            <Link href="/settings">System Settings</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>

        {/* Status Column */}
        <div className="footer-col">
          <h4>System Status</h4>
          <div className="footer-links" style={{ gap: '0.85rem' }}>
            <div className="footer-status-item">
              <div className="footer-status-dot" />
              <span>CrossRef API</span>
            </div>
            <div className="footer-status-item">
              <div className="footer-status-dot" />
              <span>Semantic Scholar API</span>
            </div>
            <div className="footer-status-item">
              <div className="footer-status-dot" />
              <span>Graph DB (Neo4j)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
