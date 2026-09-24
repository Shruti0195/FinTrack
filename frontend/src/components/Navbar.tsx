import React from 'react';
import { TrendingUp, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'var(--navbar-bg)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              FinTrack
            </div>
            <div style={{ fontSize: '11px', color: 'var(--secondary-text)', marginTop: '-2px' }}>
              Personal Finance Analytics
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#features" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--secondary-text)', textDecoration: 'none' }}>
            Features
          </a>
          <a href="#how-it-works" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--secondary-text)', textDecoration: 'none' }}>
            How It Works
          </a>
          <a href="#health-score" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--secondary-text)', textDecoration: 'none' }}>
            Health Score
          </a>
          <a href="#security" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--secondary-text)', textDecoration: 'none' }}>
            Security
          </a>
        </nav>

        {/* Action Buttons & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            onClick={() => onOpenAuth('login')}
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Log In
          </button>
          <button 
            onClick={() => onOpenAuth('register')}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Create Account
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
