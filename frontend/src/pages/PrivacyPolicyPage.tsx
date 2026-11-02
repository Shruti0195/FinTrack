import React from 'react';
import { ArrowLeft, Shield, TrendingUp } from 'lucide-react';
import { AppFooter } from '../components/AppFooter';

interface PrivacyPolicyPageProps {
  onGoBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onGoBack }) => {
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
            <Shield size={20} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Privacy Policy
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
              1. Overview & Commitment
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              At FinTrack, your financial privacy and security are fundamental principles. This Privacy Policy outlines what information we collect, how it is processed to provide personal finance tools, and how we protect your personal financial records. We do not sell, rent, or trade your personal data to advertisers or third parties.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              2. Information We Collect
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', marginBottom: '8px' }}>
              We collect information that you directly provide when using the platform:
            </p>
            <ul style={{ color: 'var(--secondary-text)', fontSize: '13.5px', lineHeight: 1.6, paddingLeft: '20px', margin: 0 }}>
              <li><strong>Account Credentials:</strong> Full name, verified email address, and securely hashed passwords.</li>
              <li><strong>Financial Entries:</strong> Income records, categorized expenses, transaction dates, descriptions, payment methods, and monthly budget limits.</li>
              <li><strong>Savings Goals:</strong> Goal titles, target amounts, contribution history, and target dates.</li>
              <li><strong>Technical Metadata:</strong> Device session tokens, IP address, and browser timestamps strictly for authentication and security rate-limiting.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              3. How We Use Your Information
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              Your financial records are used exclusively to provide you with your personal budgeting charts, calculate your 4-factor Financial Health Score, monitor budget overspending thresholds, and generate your downloadable monthly PDF reports. We do not perform automated profiling or share entries across accounts.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              4. AI Assistant & Read-Only Privacy Standards
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', marginBottom: '8px' }}>
              FinTrack features an integrated AI Assistant powered by Google Gemini to help you query your financial history using plain language:
            </p>
            <ul style={{ color: 'var(--secondary-text)', fontSize: '13.5px', lineHeight: 1.6, paddingLeft: '20px', margin: 0 }}>
              <li><strong>Strict Read-Only Enforcement:</strong> The AI Assistant has strictly read-only capabilities. It cannot add, edit, or delete transactions, budgets, or goals.</li>
              <li><strong>Zero Persistent Chat Storage:</strong> Your conversations with the assistant are never stored on our server database. Messages live only in your active browser session (`sessionStorage`) and are permanently cleared when you close the tab or log out.</li>
              <li><strong>Anonymized Tool Lookups:</strong> The AI model never receives personal credentials, full names, or account passwords. It communicates only with read-only database tools bound to your authenticated session.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              5. Data Ownership & Right to Deletion
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              You maintain 100% ownership over your data. You may export your complete expense records to CSV at any time from the Expenses view. If you choose to close your account, all associated transactions, goals, budgets, and user records are permanently deleted from our databases.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              6. Security & Encryption
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS/HTTPS). User passwords are encrypted using salted bcrypt hashing, and authenticated sessions are protected by cryptographically signed JWT tokens with automated invalidation.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              7. Contact Us
            </h2>
            <p style={{ color: 'var(--secondary-text)', fontSize: '14px', margin: 0 }}>
              If you have any questions or concerns regarding our privacy practices, please contact us via the in-app Help & Support page or email our team at <code>fintrack37@gmail.com</code>.
            </p>
          </div>
        </div>
      </main>

      <AppFooter onNavigateTab={(tab) => { window.location.hash = `#${tab}`; }} />
    </div>
  );
};
