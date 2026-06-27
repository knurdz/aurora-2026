'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Logo from '../../components/Logo';
import { getCurrentUser, getGoogleLoginUrl } from '../../lib/api';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const nextPath = useMemo(() => {
    if (typeof window === 'undefined') return '/dashboard';
    return new URLSearchParams(window.location.search).get('next') || '/dashboard';
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((data) => {
        if (!cancelled && data.authenticated) router.replace(nextPath);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  return (
    <>
      <Navbar />
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-icon-container">
            <Logo size={36} />
          </div>
          <h1>Sign in to VeriScholar</h1>
          <p>Use your Google account to manage API keys, monitor usage, and run protected paper audits.</p>
          <a className="btn-primary login-google-button" href={getGoogleLoginUrl(nextPath)} aria-disabled={checking} style={{ borderRadius: '999px', padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
            Continue with Google
            <ArrowRight size={17} />
          </a>
        </section>
      </main>
    </>
  );
}
