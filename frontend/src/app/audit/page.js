import Navbar from '../../components/Navbar';
import UploadWorkspace from '../../components/UploadWorkspace';
import AuthGate from '../../components/AuthGate';

export const metadata = {
  title: 'Audit Tool | VeriScholar',
  description: 'Upload a paper and run VeriScholar integrity analysis across claims, citations, and statistical signals.',
};

export default function AuditPage() {
  return (
    <AuthGate>
      <>
        <Navbar />
        <main className="audit-shell">
          <section className="audit-hero">
            <span className="audit-eyebrow">Paper integrity audit</span>
            <h1>Upload a manuscript and start the audit.</h1>
            <p>
              Start with a PDF or DOCX file to analyze claim support, citation-network risk, and statistical
              integrity in one pass.
            </p>
          </section>

          <UploadWorkspace />
        </main>
      </>
    </AuthGate>
  );
}
