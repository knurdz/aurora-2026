'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, LogIn, LogOut, Settings, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getCurrentUser, logout } from '../lib/api';
import Logo from './Logo';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <nav className="nav-container">
      {/* Left: Brand Logo */}
      <Link href="/" className="nav-logo">
        <Logo size={34} />
        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Veri<span style={{ color: '#0d9488' }}>Scholar</span>
        </span>
      </Link>
      
      {/* Center: Navigation Links (Desktop) */}
      <div className="nav-links">
        <Link href="/#features" className="nav-link">
          Features
        </Link>
        <Link href="/docs" className="nav-link">
          Documentation
        </Link>
        <Link href="/#faq" className="nav-link">
          FAQ
        </Link>
      </div>
      
      {/* Right: Actions (Desktop) */}
      <div className="nav-actions">
        {user && (
          <Link href="/dashboard" className="nav-action-link" style={{
            color: pathname === '/dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
        )}
        <Link href="/settings" className="nav-action-link" style={{ 
          color: pathname === '/settings' ? 'var(--text-primary)' : 'var(--text-secondary)'
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

      {/* Hamburger Toggle (Mobile/Tablet) */}
      <button 
        className="nav-mobile-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle Navigation Menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Slide-down Mobile Menu */}
      <div className={`nav-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-mobile-menu-links">
          <Link 
            href="/#features" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="nav-link"
            style={{ fontSize: '1.05rem', fontWeight: 600 }}
          >
            Features
          </Link>
          <Link 
            href="/docs" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="nav-link"
            style={{ fontSize: '1.05rem', fontWeight: 600 }}
          >
            Documentation
          </Link>
          <Link 
            href="/#faq" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="nav-link"
            style={{ fontSize: '1.05rem', fontWeight: 600 }}
          >
            FAQ
          </Link>
        </div>
        <div className="nav-mobile-menu-actions">
          {user && (
            <Link 
              href="/dashboard" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="nav-action-link"
              style={{
                color: pathname === '/dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '1.05rem',
                fontWeight: 600,
                marginBottom: '0.75rem'
              }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
          )}
          <Link 
            href="/settings" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="nav-action-link"
            style={{ 
              color: pathname === '/settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '1.05rem',
              fontWeight: 600,
              marginBottom: '1.25rem'
            }}
          >
            <Settings size={18} />
            Settings
          </Link>
          {user ? (
            <button type="button" className="btn-primary" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              fontSize: '0.95rem',
              boxShadow: 'none',
              width: '100%'
            }}>
              <LogOut size={18} />
              Log out
            </button>
          ) : (
            <Link href="/login" className="btn-primary" onClick={() => setIsMobileMenuOpen(false)} style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.2rem',
              fontSize: '0.95rem',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: 'none',
              width: '100%'
            }}>
              <LogIn size={18} />
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
