import React from 'react';
import { ArrowLeft, FileText, TrendingUp } from 'lucide-react';
import { AppFooter } from '../components/AppFooter';

interface TermsPageProps {
  onGoBack?: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onGoBack }) => {
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
          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>FinTrack</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '820px',
        width: '100%',
        margin: '0 auto',
        padding: '40px 20px',
        lineHeight: 1.7,
        flex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Terms of Service
          </h1>
        </div>
        <p style={{ color: 'var(--secondary-text)', fontSize: '13.5px', marginBottom: '28px' }}>
          Effective Date: October 2026 • Version 1.0
        </p>

        <div className="card-box" style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              1. Acceptance of Terms
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              By creating an account or accessing the FinTrack personal finance platform, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue your use of the application.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              2. User Accounts & Security
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              You are responsible for maintaining the confidentiality of your account password and authentication tokens. Any action performed through your credentials is your responsibility. Please notify us immediately at <code>fintrack37@gmail.com</code> if you detect any unauthorized access.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              3. Important Financial Disclaimer (Not Advice)
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              FinTrack is a personal record-keeping, budgeting, and financial awareness tool. All metrics—including the Financial Health Score, budget alerts, and spending trend visualizers—are calculated strictly from user-provided numbers for self-informational purposes. FinTrack is not a bank, broker, or financial advisor, and does not provide investment, tax, or legal guidance.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              4. AI Assistant Read-Only Terms
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              The FinTrack AI Assistant operates on strict read-only parameters. It is intended to help you summarize and navigate your own financial records. The Assistant cannot execute financial transactions or modify your database records. You acknowledge that AI-generated responses should not be considered certified accounting or investment advice.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              5. Acceptable Use & Conduct
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              You agree to use FinTrack only for lawful personal finance tracking purposes. You may not attempt to reverse engineer, disrupt, inject malicious payloads, bypass authentication mechanisms, or exceed reasonable automated rate limits.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              6. Account Termination & Closure
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              You may terminate your account at any time. We reserve the right to suspend or disable accounts that violate these terms or exhibit abusive behavior that threatens the security or performance of other users.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              7. Contact & Support
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              If you have any questions or feedback regarding these Terms of Service, please reach out via our in-app Help & Support page or email us at <code>fintrack37@gmail.com</code>.
            </p>
          </div>
        </div>
      </main>

      <AppFooter onNavigateTab={(tab) => { window.location.hash = `#${tab}`; }} />
    </div>
  );
};
