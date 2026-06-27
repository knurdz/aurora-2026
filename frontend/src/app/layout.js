import './globals.css';

export const metadata = {
  title: 'VeriScholar | Research Integrity Verification Platform',
  description: 'AI-powered paper integrity screening across claims, citations, and statistical signals.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
