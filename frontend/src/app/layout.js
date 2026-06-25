import './globals.css';

export const metadata = {
  title: 'VeriScholar | Research Integrity Audit',
  description: 'AI-powered scientific claim and citation analysis.',
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
