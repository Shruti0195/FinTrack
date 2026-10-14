import React from 'react';
import { 
  ArrowLeft, 
  LayoutDashboard, 
  Sun, 
  Moon,
  TrendingUp
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NotFoundPageProps {
  isLoggedIn?: boolean;
  onGoHome?: () => void;
  onGoDashboard?: (tab?: string) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
  embedded?: boolean; // When rendered within Dashboard layout
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  isLoggedIn = false,
  onGoHome,
  onGoDashboard,
  embedded = false
}) => {
  const { theme, toggleTheme } = useTheme();

  const handlePrimaryAction = () => {
    if (isLoggedIn) {
      if (onGoDashboard) {
        onGoDashboard('dashboard');
      } else {
        window.history.pushState(null, '', '/#dashboard');
        window.location.hash = '#dashboard';
        window.location.reload();
      }
    } else {
      if (onGoHome) {
        onGoHome();
      } else {
        window.history.pushState(null, '', '/');
        window.location.href = '/';
      }
    }
  };

  const handleBackAction = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handlePrimaryAction();
    }
  };

  const content = (
    <div style={{
      maxWidth: '540px',
      width: '100%',
      margin: '0 auto',
      textAlign: 'center',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* 404 Number */}
      <div style={{
        fontSize: 'clamp(80px, 14vw, 110px)',
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-0.04em',
        color: 'var(--accent)',
        userSelect: 'none',
        marginBottom: '10px',
        textShadow: '0 8px 30px rgba(16, 185, 129, 0.2)'
      }}>
        404
      </div>

      {/* Page Not Found Title */}
      <h1 style={{
        fontSize: '26px',
        fontWeight: 700,
        color: 'var(--primary)',
        marginBottom: '28px',
        letterSpacing: '-0.02em'
      }}>
        Page Not Found
      </h1>

      {/* Primary Action Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleBackAction}
          className="btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: 'var(--radius-btn)',
            height: '44px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Go Back</span>
        </button>

        <button
          onClick={handlePrimaryAction}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: 'var(--radius-btn)',
            height: '44px',
            cursor: 'pointer',
            backgroundColor: 'var(--accent)',
            color: '#FFFFFF'
          }}
        >
          <LayoutDashboard size={16} />
          <span>Go to Dashboard</span>
        </button>
      </div>
    </div>
  );

  // If embedded within Dashboard layout, return content directly centered
  if (embedded) {
    return (
      <main style={{
        flex: 1,
        minHeight: 'calc(100vh - 100px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px',
        width: '100%'
      }}>
        {content}
      </main>
    );
  }

  // Standalone full-screen 404 page with top navigation
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      color: 'var(--main-text)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header */}
      <header style={{
        height: '68px',
        backgroundColor: 'var(--navbar-bg)',
        borderBottom: '1px solid var(--border)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        {/* FinTrack Brand Logo */}
        <div 
          onClick={handlePrimaryAction}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
        >
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

        {/* Right Tools: Theme Toggle and Go to Dashboard Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={handlePrimaryAction}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              height: '38px',
              borderRadius: 'var(--radius-btn)'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </header>

      {/* Center 404 Body */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {content}
      </main>
    </div>
  );
};
