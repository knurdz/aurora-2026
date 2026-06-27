'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, LogIn, LogOut, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getCurrentUser, logout } from '../lib/api';
import Logo from './Logo';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((data) => {
        if (!cancelled && data.authenticated) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error(error);
    }
  };

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
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Logo size={34} />
        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Veri<span style={{ color: '#0d9488' }}>Scholar</span>
        </span>
      </Link>
      
      {/* Center: Navigation Links */}
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        <Link href="/#features" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Features
        </Link>
        <Link href="/docs" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Documentation
        </Link>
        <Link href="/#pricing" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Pricing
        </Link>
        <Link href="/#faq" style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          FAQ
        </Link>
      </div>
      
      {/* Right: Actions */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        {user && (
          <Link href="/dashboard" style={{
            color: pathname === '/dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
        )}
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
        {user ? (
          <button type="button" className="btn-primary" onClick={handleLogout} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.1rem',
            fontSize: '0.9rem',
            boxShadow: 'none'
          }}>
            <LogOut size={16} />
            Log out
          </button>
        ) : (
          <Link href="/login" className="btn-primary" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.2rem',
            fontSize: '0.9rem',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: 'none'
          }}>
            <LogIn size={16} />
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
