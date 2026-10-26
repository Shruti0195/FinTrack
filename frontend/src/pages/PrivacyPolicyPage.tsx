import React from 'react';
import { ArrowLeft, Shield, Sun, Moon, TrendingUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PrivacyPolicyPageProps {
  onGoBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onGoBack }) => {
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
            <Shield size={20} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Privacy Policy
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
              1. Overview & Commitment
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              At FinTrack, your privacy and data security are our top priorities. This Privacy Policy outlines what information we collect, how it is used, and the measures we take to protect your personal financial records.
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
              <strong>[PLACEHOLDER]</strong> Replace this section with official legal details regarding company entity, contact jurisdiction, and privacy officer credentials.
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              2. Data We Collect
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              We collect information that you directly provide when registering an account, recording income, logging expenses, configuring category budgets, and setting financial goals. We do not sell your personal or financial data to third-party advertisers.
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
              <strong>[PLACEHOLDER]</strong> Insert specific disclosures regarding cookies, analytics tracking, log files, device information, and storage protocols.
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              3. Who Can See Your Financial Data
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              Only you have access to view and manage your entries, budgets, and savings goals. FinTrack administrators can view aggregate system counts (such as total registered users) but cannot view individual transactions, custom categories, or financial targets.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              4. Data Retention & Deletion
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              You may export your income and expense records at any time using the CSV export tool. If you request account closure or data deletion, your personal data will be completely purged from our databases.
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
              <strong>[PLACEHOLDER]</strong> Insert formal GDPR / CCPA / local data protection compliance wording and timelines for data deletion upon request.
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              5. Contact Us
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14.5px' }}>
              If you have any questions or concerns regarding our privacy practices, please contact us via the in-app Help & Support page or email us at <code>fintrack37@gmail.com</code>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
