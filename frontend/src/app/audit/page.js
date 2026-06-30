import Navbar from '../../components/Navbar';
import UploadWorkspace from '../../components/UploadWorkspace';
import AuthGate from '../../components/AuthGate';

export const metadata = {
  title: 'Audit Workspace | VeriScholar',
  description: 'Upload a paper and run VeriScholar integrity analysis across claims, citations, and statistical signals.',
};

export default function AuditPage() {
  return (
    <AuthGate>
      <>
        <Navbar />
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
          {/* Floating background animation bubbles */}
          <div className="landing-bg-bubble landing-bubble-1" />
          <div className="landing-bg-bubble landing-bubble-2" />
          <div className="landing-bg-bubble landing-bubble-3" />

          <main className="audit-shell">
            <UploadWorkspace />
          </main>
        </div>
      </>
    </AuthGate>
  );
}

