'use client';
import Link from 'next/link';
import { Shield, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isAuditRoute =
    pathname === '/audit' ||
    pathname.startsWith('/analyze/') ||
    pathname.startsWith('/report/');

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      borderBottom: 'var(--glass-border)',
      background: 'rgba(6, 8, 15, 0.8)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Shield size={28} className="gradient-text" style={{ color: 'var(--accent-blue)' }} />
        <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          VeriScholar
        </span>
      </Link>
      
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link href="/" style={{ color: pathname === '/' ? 'white' : 'var(--text-secondary)' }}>
          Home
        </Link>
        <Link href="/audit" style={{ color: isAuditRoute ? 'white' : 'var(--text-secondary)' }}>
          Audit Tool
        </Link>
        <Link href="/settings" style={{ color: pathname === '/settings' ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </nav>
  );
}
