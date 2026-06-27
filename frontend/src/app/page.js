'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  MessageSquare, 
  Calendar, 
  Play, 
  Check, 
  Plus, 
  Minus, 
  Volume2, 
  Users2, 
  Sparkles, 
  Activity,
  Layers
} from 'lucide-react';

export default function HomePage() {
  // Tab states for "Frameworks and Expertise"
  const [activeTab, setActiveTab] = useState('Team Portfolio');

  // FAQ accordion states
  const [expandedFaq, setExpandedFaq] = useState(null);

  const tabsContent = {
    'Team Portfolio': {
      title: 'Samfund',
      desc: 'Quickly integrate new team members and highlight the importance of their equity. They will gain instant access to a dedicated team application where they can track the real-time value of their equity.',
      author: 'Adam Kruger',
      role: 'AI Product Manager',
      authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      heroImg: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800'
    },
    'Capital Sale': {
      title: 'Capital Allocation',
      desc: 'Optimize your fundraising and capital deployment loops. Run compliant cap-table simulations and clear secondary transactions in real-time, backed by cryptographic verification audits.',
      author: 'Sarah Jenkins',
      role: 'Head of Operations',
      authorImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      heroImg: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
    },
    'Contract': {
      title: 'Smart Contracting',
      desc: 'Verify external research statements and automatically audit consulting and research contract bounds, reducing institutional legal overhead and risk exposures by 70%.',
      author: 'Marcus Aurel',
      role: 'Compliance Lead',
      authorImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
      heroImg: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800'
    }
  };

  const faqData = [
    {
      question: 'Do I need to know how to code?',
      answer: 'No! Samfund is built to be entirely code-free. You can execute full research verification audits, track citation clusters, and evaluate statistical anomalies via a simple drag-and-drop dashboard interface.'
    },
    {
      question: 'I already have a custom domain. Can I use it with Format?',
      answer: 'Yes, you can connect custom domains easily. Our network configuration handles real-time data streaming and secure routing for custom subdomains automatically.'
    },
    {
      question: 'Does Format include hosting for my website?',
      answer: 'Absolutely. We host the complete user interface and container stack under custom routing patterns, ensuring high availability and sub-millisecond response rates.'
    }
  ];

  return (
    <main className="landing-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      
      {/* 1. HERO SECTION */}
      <section className="landing-hero" style={{ textAlign: 'center', position: 'relative', padding: '4rem 0 2rem' }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', 
          fontWeight: 700, 
          color: 'var(--text-primary)', 
          letterSpacing: '-0.04em',
          lineHeight: 1.08,
          maxWidth: '22ch',
          margin: '0 auto 1.5rem'
        }}>
          AI-Driven Support To Boost Your Business Growth
        </h1>
        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '72ch',
          margin: '0 auto 2.5rem',
          lineHeight: 1.6
        }}>
          A platform that helps customer service leaders provide efficient, high-quality support at 
          scale with an AI agent, improving speed and quality across all channels, 24/7.
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
            Book a Demo <ArrowRight size={16} />
          </Link>
        </div>

        {/* 2. BENTO GRID */}
        <div className="bento-grid">
          
          {/* Column 1 (Left): Integrations & 5.5B Card */}
          <div className="bento-col">
            <div className="bento-card card-light-gray" style={{ minHeight: '200px' }}>
              <div>
                <div className="icon-circle-group">
                  <div className="icon-circle" style={{ color: '#5865F2' }}><MessageSquare size={20} /></div>
                  <div className="icon-circle" style={{ color: '#E01E5A' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523a2.528 2.528 0 0 1-2.522-2.523a2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52v-5.043zm0-1.262a2.528 2.528 0 0 1 2.52-2.522a2.528 2.528 0 0 1 2.522 2.522v2.52h-5.043v-2.52zm0-5.043a2.528 2.528 0 0 1 2.52-2.52a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52V8.86zm-1.261 1.262h-2.52a2.528 2.528 0 0 1-2.522-2.52a2.528 2.528 0 0 1-2.522-2.522a2.528 2.528 0 0 1 2.52 2.522v2.52zm10.086-6.304a2.528 2.528 0 0 1 2.522-2.52a2.528 2.528 0 0 1 2.52 2.52v2.52h-2.52a2.528 2.528 0 0 1-2.522-2.52zm-1.262 1.262a2.528 2.528 0 0 1-2.52 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52V5.08a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043zm0 1.262a2.528 2.528 0 0 1-2.52 2.522a2.528 2.528 0 0 1-2.522-2.522v-2.52h5.043v2.52zm0 5.043a2.528 2.528 0 0 1-2.52 2.52a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm1.262-1.262h2.52a2.528 2.528 0 0 1 2.522 2.52a2.528 2.528 0 0 1-2.522 2.522a2.528 2.528 0 0 1-2.52-2.522v-2.52z"/>
                    </svg>
                  </div>
                  <div className="icon-circle" style={{ color: '#FF3B30' }}><Calendar size={20} /></div>
                </div>
                <h3 className="bento-title">Integrations</h3>
              </div>
              <p className="bento-desc">way better at getting things done than human agents</p>
            </div>
            
            <div className="bento-card card-light-gray" style={{ minHeight: '170px' }}>
              <div className="bento-big-num">5.5B</div>
              <div>
                <h3 className="bento-title" style={{ fontSize: '1.1rem' }}>Efficiency Multiplier</h3>
                <p className="bento-desc">more efficient than human representatives</p>
              </div>
            </div>
          </div>

          {/* Column 2 (Middle): Portrait Transcript Card */}
          <div className="bento-card" style={{ 
            padding: 0, 
            borderRadius: '24px',
            position: 'relative',
            minHeight: '390px',
            backgroundImage: `url('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Top translucent sheet overlay */}
            <div style={{
              background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.4), transparent)',
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
                Transcript
              </span>
            </div>
            
            {/* Bottom soft ambient gradient */}
            <div style={{
              background: 'linear-gradient(to top, rgba(15, 23, 42, 0.6), transparent)',
              padding: '1.5rem',
              color: 'white',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <p style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 500 }}>
                Live dialogue analysis running...
              </p>
            </div>
          </div>

          {/* Column 3 (Right): Nested Top Row & Bottom Teal Card */}
          <div className="bento-col" style={{ gap: '1.5rem' }}>
            {/* Top row side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', height: '180px' }}>
              <div className="bento-card card-green">
                <div className="bento-big-num" style={{ color: '#065f46', fontSize: '3rem' }}>83%</div>
                <div>
                  <h3 className="bento-title" style={{ color: '#065f46', fontSize: '1.05rem' }}>Resolution Rate</h3>
                  <p className="bento-desc" style={{ color: '#047857' }}>Up to 83% of conversations autonomously resolved</p>
                </div>
              </div>
              
              <div className="bento-card" style={{ 
                padding: 0,
                backgroundImage: `url('https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=400')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {/* Visual empty card for headphones lady portrait */}
              </div>
            </div>
            
            {/* Bottom Teal Gradient Card */}
            <div className="bento-card card-blue-grad" style={{ minHeight: '190px', justifyContent: 'space-between' }}>
              <div>
                <h3 className="bento-title" style={{ color: '#0369a1', fontSize: '1.35rem' }}>Automated Customer Service Quality</h3>
                <p className="bento-desc" style={{ color: '#0284c7' }}>Consolidated dialogue graphs & metrics</p>
              </div>

              {/* Avatar circle connection mockup */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', position: 'relative' }}>
                <div style={{ display: 'flex', marginLeft: '0.5rem' }}>
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80" alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white' }} />
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80" alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px' }} />
                  <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=80" alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px' }} />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80" alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px' }} />
                </div>
                <div style={{
                  border: '1px dashed rgba(3, 105, 161, 0.3)',
                  height: '1px',
                  flexGrow: 1,
                  margin: '0 0.5rem'
                }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0369a1', background: 'rgba(255,255,255,0.4)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  Active Audit
                </span>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* 3. LOGOS STRIP */}
      <section style={{ padding: '2.5rem 0', borderTop: '1px solid rgba(15, 23, 42, 0.05)', borderBottom: '1px solid rgba(15, 23, 42, 0.05)', margin: '1rem 0' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '2rem',
          opacity: 0.65
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Activity size={18} /> MODE</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MessageSquare size={18} /> INTERCOM</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Layers size={18} /> Mosaic</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Sparkles size={18} /> replicant</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Volume2 size={18} /> Canopy</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Activity size={18} /> MODE</span>
        </div>
      </section>

      {/* 4. DRIVE TRANSFORMATIVE IMPACT WITH AI */}
      <section className="landing-section" style={{ padding: '3.5rem 0' }}>
        <div className="landing-section-heading" style={{ margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Drive Transformative Impact with AI
          </h2>
        </div>
        
        <div className="impact-stack">
          {/* Allison Herwitz */}
          <div className="impact-row pink">
            <div className="impact-profile">
              <img className="impact-avatar" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" alt="Allison" />
              <div>
                <h4 className="impact-name">Allison Herwitz</h4>
                <p className="impact-role">Product Manager</p>
              </div>
            </div>
            <Link href="/audit" className="impact-btn">
              Buy Template <ArrowRight size={14} />
            </Link>
          </div>

          {/* Corey Ekstrom */}
          <div className="impact-row yellow">
            <div className="impact-profile">
              <img className="impact-avatar" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" alt="Corey" />
              <div>
                <h4 className="impact-name">Corey Ekstrom</h4>
                <p className="impact-role">Product Manager</p>
              </div>
            </div>
            <Link href="/audit" className="impact-btn">
              Buy Template <ArrowRight size={14} />
            </Link>
          </div>

          {/* Jane Pampa */}
          <div className="impact-row blue">
            <div className="impact-profile">
              <img className="impact-avatar" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150" alt="Jane" />
              <div>
                <h4 className="impact-name">Jane Pampa</h4>
                <p className="impact-role">Product Manager</p>
              </div>
            </div>
            <Link href="/audit" className="impact-btn">
              Buy Template <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FRAMEWORKS AND EXPERTISE */}
      <section className="landing-section" style={{ padding: '3.5rem 0' }}>
        <div className="landing-section-heading" style={{ margin: '0 auto 2.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
            Frameworks And Expertise
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
              Case Study
            </span>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {tabsContent[activeTab].title}
            </h3>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {tabsContent[activeTab].desc}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '1.5rem', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: '1.25rem' }}>
              <img src={tabsContent[activeTab].authorImg} alt="author" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              <div>
                <h5 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tabsContent[activeTab].author}</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tabsContent[activeTab].role}</p>
              </div>
            </div>
          </div>

          <div className="framework-right">
            <img src={tabsContent[activeTab].heroImg} alt="Workspace showcase" className="framework-img" />
            <div className="play-overlay">
              <div className="play-btn">
                <Play size={22} fill="currentColor" style={{ marginLeft: '4px' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE US (STATS SECTION) */}
      <section className="landing-section" style={{ padding: '3.5rem 0' }}>
        <div className="landing-section-heading" style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Why Choose Us
          </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
          <div className="bento-card card-blue-grad" style={{ padding: '2.5rem', minHeight: '220px' }}>
            <div className="bento-big-num" style={{ fontSize: '4.5rem', color: '#1e3a8a' }}>42%</div>
            <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e40af' }}>
              lower average handle time
            </p>
          </div>

          <div className="bento-card card-beige" style={{ padding: '2.5rem', minHeight: '220px' }}>
            <div className="bento-big-num" style={{ fontSize: '4.5rem', color: '#78350f' }}>60k</div>
            <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#92400e' }}>
              monthly labor hours saved
            </p>
          </div>
        </div>
      </section>

      {/* 7. UNLEASH THE POWER */}
      <section className="landing-section" style={{ padding: '3.5rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.15 }}>
              Unleash the power of AI to turn your innovative <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>concepts into game-changing solutions!</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
            <div className="bento-card card-purple" style={{ padding: '2rem', minHeight: '180px' }}>
              <div className="bento-big-num" style={{ fontSize: '3.5rem', color: '#5b21b6' }}>5x</div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b21a8' }}>
                increase in support capacity
              </p>
            </div>

            <div className="bento-card card-soft-cream" style={{ padding: '2rem', minHeight: '180px' }}>
              <div className="bento-big-num" style={{ fontSize: '3.5rem', color: '#1c1917' }}>80%</div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#44403c' }}>
                CSAT score achieved
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. EFFORTLESS ONBOARDING & PIPELINE */}
      <section className="landing-section" style={{ padding: '4rem 0' }}>
        <div className="landing-section-heading" style={{ margin: '0 auto 3rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Effortless onboarding and rapid installation steps
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
            Experience an effortless adventure with our user-friendly application and dedicated assistance here, all at no cost to you!
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '4rem', alignItems: 'center', marginTop: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
              Transitioning your equity management to a fresh platform is effortless and smooth with Slice.
            </h3>
            
            <div className="checklist">
              <div className="check-item">
                <div className="check-icon-box">✓</div>
                <div className="check-content">
                  <h4>Free Migration</h4>
                  <p>Improve lead management to prioritize promising opportunities and include free migration services for a smoother transition.</p>
                </div>
              </div>

              <div className="check-item">
                <div className="check-icon-box">✓</div>
                <div className="check-content">
                  <h4>Transparent Pricing</h4>
                  <p>Boost your efficiency with automated follow-ups that enhance engagement and offer transparent pricing, saving you time.</p>
                </div>
              </div>

              <div className="check-item">
                <div className="check-icon-box">✓</div>
                <div className="check-content">
                  <h4>Personalized Support</h4>
                  <p>Create customized, lead-nurturing workflows to ensure supportive and engaging interactions with prospective clients.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="floating-mockup-container">
            {/* Main portrait of the team leader */}
            <div style={{ 
              borderRadius: '24px', 
              overflow: 'hidden', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
              border: '1px solid rgba(15,23,42,0.06)'
            }}>
              <img 
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600" 
                alt="Representative" 
                style={{ width: '100%', height: '360px', objectFit: 'cover', display: 'block' }} 
              />
            </div>

            {/* Floating Sales Pipeline dashboard card */}
            <div className="floating-pipeline-card">
              <div className="pipeline-header">Sales pipeline</div>
              
              <div className="pipeline-row">
                <span>Leads</span>
                <div className="pipeline-bar-bg">
                  <div className="pipeline-bar-fill" style={{ width: '75%', backgroundColor: '#3b82f6' }} />
                </div>
                <strong>75%</strong>
              </div>

              <div className="pipeline-row">
                <span>Deals</span>
                <div className="pipeline-bar-bg">
                  <div className="pipeline-bar-fill" style={{ width: '45%', backgroundColor: '#10b981' }} />
                </div>
                <strong>45%</strong>
              </div>

              <div className="pipeline-row">
                <span>Tasks</span>
                <div className="pipeline-bar-bg">
                  <div className="pipeline-bar-fill" style={{ width: '90%', backgroundColor: '#f59e0b' }} />
                </div>
                <strong>90%</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION SECTION */}
      <section id="faq" className="landing-section" style={{ padding: '4rem 0 2rem' }}>
        <div className="landing-section-heading" style={{ margin: '0 auto 2.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            FAQ's : Write in the customer's voice
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '65ch', margin: '0 auto' }}>
            Pinos offers a comprehensive suite of online payment solutions, encompassing everything from credit card processing and digital wallets
          </p>
        </div>

        <div className="faq-stack">
          {faqData.map((faq, index) => {
            const isOpen = expandedFaq === index;
            return (
              <div key={index} className="faq-item">
                <button 
                  className="faq-trigger" 
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                >
                  <span className="faq-title">{faq.question}</span>
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
      </section>

    </main>
  );
}
