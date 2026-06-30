'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Logo from '../components/Logo';
import { 
  ArrowRight, 
  Search, 
  Network, 
  Calculator, 
  Play, 
  Check, 
  Plus, 
  Minus, 
  Database, 
  FileText, 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle,
  FileScan,
  GitBranch
} from 'lucide-react';

export default function HomePage() {
  // Tab states for case studies / capability details
  const [activeTab, setActiveTab] = useState('Claim Isolation');

  // FAQ accordion states
  const [expandedFaq, setExpandedFaq] = useState(null);

  const tabsContent = {
    'Claim Isolation': {
      title: 'LLM-Powered Claim Isolation',
      desc: 'Our fine-tuned LLM agents parse every page of your manuscript, identifying key scientific and experimental assertions. They extract findings so reviewers can instantly inspect what the paper actually claims without manual searching.',
      author: 'Dr. Elena Rostova',
      role: 'Research Integrity Auditor',
      authorImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      heroImg: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
    },
    'Citation Graphs': {
      title: 'Cartel & Network Resolution',
      desc: 'By query-mapping citations through CrossRef and Semantic Scholar APIs, we construct a citation graph database. Using Louvain community detection in Neo4j, VeriScholar automatically surfaces circular citation rings, retracted references, and abnormal network clusters.',
      author: 'Marcus Vane',
      role: 'Graph Data Scientist',
      authorImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
      heroImg: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800'
    },
    'Statistical Audits': {
      title: 'GRIM, p-Curve & Power Checks',
      desc: 'Verify the mathematical consistency of reported means (GRIM test) and scan for p-hacking trends via p-curve distributions. Our pipeline evaluates sample power heuristics and highlights undisclosed funding or conflict patterns.',
      author: 'Dr. David Klay',
      role: 'Biostatistician & Peer Reviewer',
      authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      heroImg: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800'
    }
  };

  const faqData = [
    {
      question: 'How does claim isolation work?',
      answer: 'Our LLM-driven agents scan every page of the manuscript, identifying and extracting key scientific assertions. These extracted claims are then structured and compared against referenced literature to check for alignment and support.'
    },
    {
      question: 'What is citation cartel detection?',
      answer: 'We pull metadata from APIs like CrossRef and Semantic Scholar to model citation paths. A Louvain community detection algorithm in our Neo4j graph database scans these pathways to discover circular quoting, self-citation loops, or references to known retracted works.'
    },
    {
      question: 'How are statistical fraud checks run?',
      answer: 'We run mathematical consistency tests like GRIM (Granularity in Relation to Mean) on reported averages to verify calculation accuracy. Additionally, we analyze p-curve distributions to detect potential selective reporting (p-hacking) and evaluate overall sample power.'
    }
  ];

  return (
    <>
      {/* RESTORED NAVIGATION BAR */}
      <Navbar />

      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        {/* Floating background animation bubbles */}
        <div className="landing-bg-bubble landing-bubble-1" />
        <div className="landing-bg-bubble landing-bubble-2" />
        <div className="landing-bg-bubble landing-bubble-3" />

        <main className="landing-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', position: 'relative' }}>

        {/* 1. HERO SECTION */}
        <section className="landing-hero" style={{ textAlign: 'center', position: 'relative', padding: '4rem 0 2rem', zIndex: 1 }}>
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            maxWidth: '22ch',
            margin: '0 auto 1.5rem'
          }}>
            Verify Research Integrity with More Confidence
          </h1>
          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            maxWidth: '72ch',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6
          }}>
            VeriScholar audits scientific papers across claims, citations, and statistical evidence so researchers, reviewers, and institutions can spot risk earlier.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4rem' }}>
            <Link href="/audit" className="btn-primary" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.85rem 2.2rem',
              fontSize: '1.05rem',
              textDecoration: 'none'
            }}>
              Start Audit <ArrowRight size={16} />
            </Link>
          </div>

          {/* 2. BENTO GRID (INTEGRITY LAYERS MAPPED) */}
          <div className="bento-grid">
            
            {/* Card 1: Citation Cartels */}
            <div className="bento-card card-light-gray bento-card-1">
              <div>
                <div className="icon-circle-group">
                  <div className="icon-circle" style={{ color: '#2563eb' }}><FileScan size={20} /></div>
                  <div className="icon-circle" style={{ color: '#7c3aed' }}><Network size={20} /></div>
                  <div className="icon-circle" style={{ color: '#059669' }}><Calculator size={20} /></div>
                </div>
                <h3 className="bento-title">Citation Cartels</h3>
              </div>
              <p className="bento-desc">Identify circular citation rings and clusters of circular influence automatically</p>
            </div>
            
            {/* Card 2: Integrity Layers */}
            <div className="bento-card card-light-gray bento-card-2">
              <div className="bento-big-num">4</div>
              <div>
                <h3 className="bento-title" style={{ fontSize: '1.1rem' }}>Integrity Layers</h3>
                <p className="bento-desc">Claim isolation, citation network mapping, statistical tests, and report scoring</p>
              </div>
            </div>

            {/* Card 3: Claim Isolation (Translucent overlay and portrait background) */}
            <div className="bento-card bento-card-3" style={{ 
              padding: 0, 
              borderRadius: '24px',
              position: 'relative',
              backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.15) 50%, rgba(15, 23, 42, 0.7) 100%), url('https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              {/* Top translucent overlay */}
              <div style={{
                background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.5), transparent)',
                padding: '1.5rem',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <span style={{ 
                  color: '#e0f2fe', 
                  fontSize: '1.25rem', 
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  fontFamily: 'sans-serif'
                }}>
                  Claim Isolation
                </span>
              </div>
              
              {/* Bottom gradient */}
              <div style={{
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.7), transparent)',
                padding: '1.5rem',
                color: 'white',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <p style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 500 }}>
                  LLM extraction identifying key asserts...
                </p>
              </div>
            </div>

            {/* Card 4: Clustering Rate */}
            <div className="bento-card card-green bento-card-4">
              <div className="bento-big-num" style={{ color: '#065f46', fontSize: '3rem' }}>95%</div>
              <div>
                <h3 className="bento-title" style={{ color: '#065f46', fontSize: '1.05rem' }}>Clustering Rate</h3>
                <p className="bento-desc" style={{ color: '#047857' }}>Louvain community algorithm identification success</p>
              </div>
            </div>
            
            {/* Card 5: Reviewer Working Image */}
            <div className="bento-card bento-card-5" style={{ 
              padding: 0,
              borderRadius: '24px',
              backgroundImage: `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=400')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              {/* Portrait of reviewer */}
            </div>
            
            {/* Card 6: Statistical Fraud Checks */}
            <div className="bento-card card-blue-grad bento-card-6" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 className="bento-title" style={{ color: '#0369a1', fontSize: '1.35rem' }}>Statistical Fraud Checks</h3>
                <p className="bento-desc" style={{ color: '#0284c7' }}>Run GRIM tests, p-curve evaluation, and study power heuristics</p>
              </div>

              {/* Avatar circle connection mockup */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', position: 'relative' }}>
                <div style={{ display: 'flex', marginLeft: '0.5rem' }}>
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80" alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white' }} />
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80" alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px' }} />
                  <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=80" alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px' }} />
                </div>
                <div style={{
                  border: '1px dashed rgba(3, 105, 161, 0.3)',
                  height: '1px',
                  flexGrow: 1,
                  margin: '0 0.5rem'
                }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0369a1', background: 'rgba(255,255,255,0.4)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  Live Verification
                </span>
              </div>
            </div>
            
          </div>
        </section>

        {/* 3. LOGOS STRIP (ACTUAL TECHNOLOGY INTEGRATIONS) */}
        <section style={{ padding: '2.5rem 0', borderTop: '1px solid rgba(15, 23, 42, 0.05)', borderBottom: '1px solid rgba(15, 23, 42, 0.05)', margin: '1rem 0' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '2rem',
            opacity: 0.65
          }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Database size={20} /> NEO4J GRAPH</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={20} /> CROSSREF</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><GitBranch size={20} /> CHROMA VECTOR</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShieldAlert size={20} /> LLM AGENTS</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={20} /> SEMANTIC SCHOLAR</span>
          </div>
        </section>

        {/* 4. AUDIENCES (TRANSFORMATIVE IMPACT SECTION) */}
        <section className="landing-section" style={{ padding: '3.5rem 0' }}>
          <div className="landing-section-heading" style={{ margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Built for Every Phase of Research Review
            </h2>
          </div>
          
          <div className="impact-stack">
            {/* Researchers */}
            <div className="impact-row pink">
              <div className="impact-profile">
                <img className="impact-avatar" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" alt="Researcher" />
                <div>
                  <h4 className="impact-name">Researchers</h4>
                  <p className="impact-role">Screen manuscripts before submission, catch signal anomalies, and verify citation compliance.</p>
                </div>
              </div>
              <Link href="/audit" className="impact-btn">
                Start Audit <ArrowRight size={14} />
              </Link>
            </div>

            {/* Reviewers and Editors */}
            <div className="impact-row yellow">
              <div className="impact-profile">
                <img className="impact-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" alt="Reviewer" />
                <div>
                  <h4 className="impact-name">Reviewers and Editors</h4>
                  <p className="impact-role">Utilize rapid first-pass filters to focus human scrutiny on critical mathematical or graph risks.</p>
                </div>
              </div>
              <Link href="/audit" className="impact-btn">
                Start Audit <ArrowRight size={14} />
              </Link>
            </div>

            {/* Institutions and Publishers */}
            <div className="impact-row blue">
              <div className="impact-profile">
                <img className="impact-avatar" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150" alt="Institutional Admin" />
                <div>
                  <h4 className="impact-name">Institutions and Publishers</h4>
                  <p className="impact-role">Establish automated, scalable screening checks for research integrity offices and journal submissions.</p>
                </div>
              </div>
              <Link href="/audit" className="impact-btn">
                Start Audit <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* 5. CAPABILITIES (FRAMEWORKS AND EXPERTISE) */}
        <section className="landing-section" style={{ padding: '3.5rem 0' }}>
          <div className="landing-section-heading" style={{ margin: '0 auto 2.5rem', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
              Verification Capabilities & Frameworks
            </h2>
            
            {/* Tabs Navigation */}
            <div className="tabs-container">
              {Object.keys(tabsContent).map((tabName) => (
                <button
                  key={tabName}
                  className={`tab-btn ${activeTab === tabName ? 'active' : ''}`}
                  onClick={() => setActiveTab(tabName)}
                >
                  {tabName}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Panel Content Box */}
          <div className="framework-card">
            <div className="framework-left">
              <span style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Technical Specification
              </span>
              <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {tabsContent[activeTab].title}
              </h3>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {tabsContent[activeTab].desc}
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '1.5rem', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '1.25rem' }}>
                <img src={tabsContent[activeTab].authorImg} alt="expert" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div>
                  <h5 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tabsContent[activeTab].author}</h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tabsContent[activeTab].role}</p>
                </div>
              </div>
            </div>

            <div className="framework-right">
              <img src={tabsContent[activeTab].heroImg} alt="Integrity graph workspace" className="framework-img" />
              <div className="play-overlay">
                <div className="play-btn">
                  <Play size={22} fill="currentColor" style={{ marginLeft: '4px' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. STATS (WHY CHOOSE US SECTION) */}
        <section className="landing-section" style={{ padding: '3.5rem 0' }}>
          <div className="landing-section-heading" style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Database Scale
            </span>
          </div>
          
          <div className="home-stats-grid">
            <div className="bento-card card-blue-grad" style={{ padding: '2.5rem', minHeight: '220px' }}>
              <div className="bento-big-num" style={{ fontSize: '4.5rem', color: '#1e3a8a' }}>100M+</div>
              <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e40af' }}>
                Scientific paper records cataloged & tracked
              </p>
            </div>

            <div className="bento-card card-beige" style={{ padding: '2.5rem', minHeight: '220px' }}>
              <div className="bento-big-num" style={{ fontSize: '4.5rem', color: '#78350f' }}>10s</div>
              <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#92400e' }}>
                Average response time for automated initial triage
              </p>
            </div>
          </div>
        </section>

        {/* 7. UNLEASH THE POWER */}
        <section className="landing-section" style={{ padding: '3.5rem 0' }}>
          <div className="home-unleash-grid">
            <div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.15 }}>
                Unleash the power of agentic AI to audit scientific paper <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>integrity structures in real-time.</span>
              </h2>
            </div>

            <div className="home-unleash-stats">
              <div className="bento-card card-purple" style={{ padding: '2rem', minHeight: '180px' }}>
                <div className="bento-big-num" style={{ fontSize: '3.5rem', color: '#5b21b6' }}>4x</div>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b21a8' }}>
                  increased verification audit layers
                </p>
              </div>

              <div className="bento-card card-soft-cream" style={{ padding: '2rem', minHeight: '180px' }}>
                <div className="bento-big-num" style={{ fontSize: '3.5rem', color: '#1c1917' }}>100%</div>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#44403c' }}>
                  traceable evidence outputs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. PIPELINE (ONBOARDING & PIPELINE SECTION) */}
        <section className="landing-section" style={{ padding: '4rem 0' }}>
          <div className="landing-section-heading" style={{ margin: '0 auto 3rem', textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
              Traceable, Automated Document Screening
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
              VeriScholar compiles claim, citation, and statistical audits into a single structured report.
            </p>
          </div>

          <div className="home-pipeline-grid">
            <div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
                Transitioning your verification workflow to automated multi-agent screening is smooth and reliable.
              </h3>
              
              <div className="checklist">
                <div className="check-item">
                  <div className="check-icon-box">✓</div>
                  <div className="check-content">
                    <h4>Traceable Evidence</h4>
                    <p>VeriScholar returns concrete findings, citation networks, and formula score card audits instead of opaque labels.</p>
                  </div>
                </div>

                <div className="check-item">
                  <div className="check-icon-box">✓</div>
                  <div className="check-content">
                    <h4>Built for Human Review</h4>
                    <p>Designed to assist reviewer and publisher judgment, not replace it, letting you explore graph communities before deciding.</p>
                  </div>
                </div>

                <div className="check-item">
                  <div className="check-icon-box">✓</div>
                  <div className="check-content">
                    <h4>Unified Risk View</h4>
                    <p>Each PDF/DOCX audit ties together claims, network graphs, and statistical signals into one shared workspace.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="floating-mockup-container">
              {/* Main portrait of researcher */}
              <div style={{ 
                borderRadius: '24px', 
                overflow: 'hidden', 
                boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
                border: '1px solid rgba(15,23,42,0.06)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600" 
                  alt="Review Analyst" 
                  style={{ width: '100%', height: '360px', objectFit: 'cover', display: 'block' }} 
                />
              </div>

              {/* Floating Audit Status dashboard card */}
              <div className="floating-pipeline-card">
                <div className="pipeline-header">Audit pipeline</div>
                
                <div className="pipeline-row">
                  <span>Claims</span>
                  <div className="pipeline-bar-bg">
                    <div className="pipeline-bar-fill" style={{ width: '85%', backgroundColor: '#3b82f6' }} />
                  </div>
                  <strong>85%</strong>
                </div>

                <div className="pipeline-row">
                  <span>Citations</span>
                  <div className="pipeline-bar-bg">
                    <div className="pipeline-bar-fill" style={{ width: '95%', backgroundColor: '#10b981' }} />
                  </div>
                  <strong>95%</strong>
                </div>

                <div className="pipeline-row">
                  <span>Statistics</span>
                  <div className="pipeline-bar-bg">
                    <div className="pipeline-bar-fill" style={{ width: '60%', backgroundColor: '#f59e0b' }} />
                  </div>
                  <strong>60%</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. FAQ ACCORDION (VERISCHOLAR FAQS) */}
        <section id="faq" className="landing-section" style={{ padding: '6rem 0 4rem', width: '100%', boxSizing: 'border-box' }}>
          <div className="faq-split-layout" style={{ alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
            
            {/* Left Column: Sticky Header */}
            <div style={{ position: 'sticky', top: '100px', width: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Questions & Answers
              </span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '1rem' }}>
                Frequently Asked Questions
              </h2>
              <p style={{ fontSize: '1.02rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Learn more about how VeriScholar extracts scientific assertions, resolves citation paths, and checks reported mathematical integrity.
              </p>
              <div style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(13, 148, 136, 0.03)', border: '1px solid rgba(13, 148, 136, 0.1)', display: 'inline-flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Still have questions?</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Reach out to our core developer team at <a href="mailto:support@knurdz.org" style={{ color: 'var(--accent-teal)', fontWeight: 600, textDecoration: 'none' }}>support@knurdz.org</a>
                </span>
              </div>
            </div>

            {/* Right Column: Accordion List */}
            <div className="faq-stack" style={{ margin: 0, maxWidth: '100%' }}>
              {faqData.map((faq, index) => {
                const isOpen = expandedFaq === index;
                return (
                  <div key={index} className="faq-item">
                    <button 
                      className={`faq-trigger ${isOpen ? 'active' : ''}`}
                      onClick={() => setExpandedFaq(isOpen ? null : index)}
                    >
                      <span className="faq-title">
                        {faq.question}
                      </span>
                      <span className="faq-symbol">
                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="faq-content">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        </main>
      </div>

      {/* 10. FOOTER */}
      <Footer />
    </>
  );
}
