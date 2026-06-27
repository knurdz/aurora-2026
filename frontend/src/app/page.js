import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Binary,
  BookMarked,
  Building2,
  FileScan,
  FlaskConical,
  Microscope,
  Network,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';

const checks = [
  {
    icon: FileScan,
    title: 'Claim isolation',
    copy: 'Extract page-level claims from PDFs and DOCX files so reviewers can inspect what the paper actually asserts.',
  },
  {
    icon: Network,
    title: 'Citation cartel detection',
    copy: 'Resolve citation graphs and surface suspicious clusters, retracted references, and circular influence patterns.',
  },
  {
    icon: Binary,
    title: 'Statistical fraud checks',
    copy: 'Run GRIM testing, p-curve analysis, power heuristics, and conflict-of-interest scanning across the manuscript.',
  },
  {
    icon: ShieldCheck,
    title: 'Integrity scoring',
    copy: 'Compile structured findings into a weighted report that helps teams triage review effort quickly.',
  },
];

const audiences = [
  {
    icon: Microscope,
    title: 'Researchers',
    copy: 'Screen manuscripts before submission, catch weak signals early, and prepare cleaner evidence for peer review.',
  },
  {
    icon: BookMarked,
    title: 'Reviewers and editors',
    copy: 'Use a fast first-pass audit to focus human attention on the sections that most need scrutiny.',
  },
  {
    icon: Building2,
    title: 'Institutions and publishers',
    copy: 'Create scalable integrity workflows for research offices, journals, and oversight teams.',
  },
];

const trustPoints = [
  {
    icon: BadgeCheck,
    title: 'Traceable outputs',
    copy: 'VeriScholar returns concrete findings, narrative explanations, and score breakdowns instead of opaque pass/fail labels.',
  },
  {
    icon: Users,
    title: 'Built for human review',
    copy: 'The system is designed to support analyst judgment, not replace it, so teams can investigate before acting.',
  },
  {
    icon: Scale,
    title: 'Evidence-aware workflow',
    copy: 'Each audit ties together claims, citation patterns, and statistical signals into one review surface.',
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="landing-shell">
        <section className="landing-hero">
          <div className="landing-badge">
            <FlaskConical size={16} />
            <span>AI research integrity screening for papers and review teams</span>
          </div>

          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <h1>Verify research integrity with more confidence.</h1>
              <p>
                VeriScholar audits scientific papers across claims, citations, and statistical evidence so
                researchers, reviewers, and institutions can spot risk earlier and review with more confidence.
              </p>

              <div className="landing-cta-row">
                <Link href="/audit" className="btn-primary landing-button">
                  Start Audit
                  <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="btn-secondary landing-button">
                  See How It Works
                </a>
              </div>
            </div>

            <div className="glass-panel landing-hero-panel">
              <div className="landing-proof-header">
                <span>Audit coverage</span>
                <strong>Four integrity layers</strong>
              </div>
              <div className="landing-proof-grid">
                {checks.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="landing-proof-card">
                    <div className="landing-proof-icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h2>{title}</h2>
                      <p>{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-proof-strip" aria-label="Core product signals">
            <span>PDF and DOCX ingestion</span>
            <span>Live pipeline progress</span>
            <span>Citation graph analysis</span>
            <span>Report-ready integrity score</span>
          </div>
        </section>

        <section id="what-it-checks" className="landing-section">
          <div className="landing-section-heading">
            <span>What VeriScholar checks</span>
            <h2>One audit surface for integrity signals.</h2>
            <p>
              The platform combines document parsing, agent-driven claim extraction, citation network analysis,
              and statistical review into a single workflow.
            </p>
          </div>

          <div className="landing-card-grid">
            {checks.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="glass-panel landing-card">
                <div className="landing-card-icon">
                  <Icon size={20} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="landing-section-heading">
            <span>How it works</span>
            <h2>From manuscript to report in three steps.</h2>
          </div>

          <div className="landing-process-grid">
            <article className="glass-panel landing-process-card">
              <strong>01</strong>
              <h3>Upload the paper</h3>
              <p>Start with a PDF or DOCX file and send it through the audit pipeline from the dedicated tool route.</p>
            </article>
            <article className="glass-panel landing-process-card">
              <strong>02</strong>
              <h3>Run the multi-agent analysis</h3>
              <p>Watch live progress as the system parses the document, resolves citations, and evaluates statistical risk.</p>
            </article>
            <article className="glass-panel landing-process-card">
              <strong>03</strong>
              <h3>Review the final report</h3>
              <p>Inspect score deductions, narrative findings, and supporting signals in a single report workspace.</p>
            </article>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>Who it&apos;s for</span>
            <h2>Built for researchers, reviewers, and institutions.</h2>
          </div>

          <div className="landing-audience-grid">
            {audiences.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="glass-panel landing-audience-card">
                <div className="landing-card-icon">
                  <Icon size={20} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <span>Why trust the output</span>
            <h2>Evidence-first, not black-box.</h2>
          </div>

          <div className="landing-trust-grid">
            {trustPoints.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="glass-panel landing-trust-card">
                <div className="landing-card-icon">
                  <Icon size={20} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="glass-panel landing-final-cta">
            <div>
              <span>Start with a real paper</span>
              <h2>Run an integrity audit on your next paper.</h2>
              <p>Upload a PDF or DOCX and move directly into the live analysis flow.</p>
            </div>
            <div className="landing-cta-row">
              <Link href="/audit" className="btn-primary landing-button">
                Start Audit
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
