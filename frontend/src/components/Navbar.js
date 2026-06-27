'use client';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.85rem 3rem',
      borderBottom: 'var(--glass-border)',
      background: 'rgba(248, 250, 252, 0.85)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)'
    }}>
      {/* Left: Brand Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Samfund
        </span>
      </Link>
      
      {/* Center: Navigation Links */}
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        <a href="/#features" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Features
        </a>
        <a href="/#how-it-works" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          How it works
        </a>
        <a href="/#pricing" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Pricing
        </a>
        <a href="/#faq" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          FAQ
        </a>
      </div>
      
      {/* Right: Actions */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <Link href="/settings" style={{ 
          color: pathname === '/settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.35rem',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          <Settings size={16} />
          Settings
        </Link>
        <Link href="/audit" className="btn-primary" style={{
          padding: '0.55rem 1.4rem',
          fontSize: '0.9rem',
          textDecoration: 'none',
          textAlign: 'center',
          boxShadow: 'none'
        }}>
          Log in
        </Link>
      </div>
    </nav>
  );
}
