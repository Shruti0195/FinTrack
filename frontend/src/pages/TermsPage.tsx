import React from 'react';
import { ArrowLeft, FileText, Sun, Moon, TrendingUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TermsPageProps {
  onGoBack?: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onGoBack }) => {
  const { theme, toggleTheme } = useTheme();

  const handleBack = () => {
    if (onGoBack) {
      onGoBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

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
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleBack}
            className="btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '13px',
              borderRadius: 'var(--radius-btn)',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>
              FinTrack
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        padding: '40px 20px',
        lineHeight: 1.7
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--light-accent)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={20} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Terms of Service
          </h1>
        </div>
        <p style={{ color: 'var(--secondary-text)', fontSize: '14px', marginBottom: '32px' }}>
          Last updated: October 2026 • <em>Placeholder Document</em>
        </p>

        <div className="card-box" style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              1. Acceptance of Terms
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              By accessing or using FinTrack, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you should not access or use the application.
            </p>
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px dashed var(--accent)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '10px',
              fontSize: '13px',
              color: 'var(--accent)'
            }}>
              <strong>[PLACEHOLDER]</strong> Insert formal legal governing law, jurisdiction clauses, and contract formation definitions.
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              2. User Accounts & Security
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us immediately if you suspect unauthorized access.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              3. Financial Disclaimers
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              FinTrack provides financial analytics, health score calculations, and budgeting tools for informational and personal budgeting purposes only. FinTrack does not provide licensed investment, tax, or legal advice.
            </p>
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px dashed var(--accent)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '10px',
              fontSize: '13px',
              color: 'var(--accent)'
            }}>
              <strong>[PLACEHOLDER]</strong> Insert explicit limitation of liability and statutory financial advice disclaimer required by relevant financial authorities.
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              4. Termination & Service Modifications
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              We reserve the right to modify or discontinue any part of the service with reasonable notice. You may cease using FinTrack at any time by closing your account.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              5. Questions or Feedback
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              For legal inquiries regarding these Terms of Service, please reach out via our Help page or contact <code>fintrack37@gmail.com</code>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
