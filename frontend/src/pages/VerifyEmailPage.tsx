import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, TrendingUp } from 'lucide-react';
import api from '../api/client';

interface VerifyEmailPageProps {
  onOpenLogin: () => void;
  onGoHome: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onOpenLogin, onGoHome }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email address and activating your account...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in URL.');
      return;
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully! Your account is now active.');
      })
      .catch((err) => {
        setStatus('error');
        const detail = err.response?.data?.detail || 'Verification link is invalid or has expired.';
        setMessage(detail);
      });
  }, []);

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        padding: '36px 28px',
        textAlign: 'center'
      }}>
        {/* Logo icon */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#FFFFFF'
        }}>
          <TrendingUp size={24} strokeWidth={2.5} />
        </div>

        {status === 'verifying' && (
          <div>
            <Loader2 size={36} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              Activating Account
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--secondary-text)' }}>
              {message}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--light-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: 'var(--accent)'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              Account Activated!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '24px', lineHeight: 1.5 }}>
              {message}
            </p>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                onOpenLogin();
              }}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              Sign In to Your Dashboard
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--light-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: 'var(--danger)'
            }}>
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              Activation Failed
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '24px', lineHeight: 1.5 }}>
              {message}
            </p>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                onGoHome();
              }}
              className="btn-outline"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
