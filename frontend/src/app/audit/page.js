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
        <main className="audit-shell">
          <UploadWorkspace />
        </main>
      </>
    </AuthGate>
  );
}

