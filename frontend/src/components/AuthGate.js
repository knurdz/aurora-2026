'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '../lib/api';

export default function AuthGate({ children }) {
  const [state, setState] = useState({ loading: true, user: null });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const data = await getCurrentUser();
        if (cancelled) return;
        if (!data.authenticated) {
          const query = typeof window !== 'undefined' ? window.location.search : '';
          const nextPath = `${pathname || '/dashboard'}${query}`;
          router.replace(`/login?next=${encodeURIComponent(nextPath || '/dashboard')}`);
          return;
        }
        setState({ loading: false, user: data.user });
      } catch (error) {
        if (!cancelled) {
          router.replace('/login');
        }
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (state.loading) {
    return (
      <main className="auth-loading-shell">
        <Loader2 className="spin" size={28} />
        <p>Checking your session...</p>
      </main>
    );
  }

  return children;
}
