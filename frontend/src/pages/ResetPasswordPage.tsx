import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Lock, TrendingUp } from 'lucide-react';
import api from '../api/client';

interface ResetPasswordPageProps {
  onOpenLogin: () => void;
  onGoHome: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onOpenLogin, onGoHome }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Missing password reset token in URL.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password
      });
      setSuccess(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to reset password. The link may have expired.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        padding: '36px 28px',
        textAlign: 'center'
      }}>
        {/* Brand Icon */}
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

        {success ? (
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
              Password Reset Complete!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '24px', lineHeight: 1.5 }}>
              Your password has been securely updated in FinTrack. You can now log in with your new credentials.
            </p>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                onOpenLogin();
              }}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              Log In to Account
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
              Set New Password
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginBottom: '22px' }}>
              Please enter and confirm your new secure password.
            </p>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: 'var(--light-danger)',
                color: 'var(--danger)',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'left',
                border: '1px solid var(--danger)'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  onGoHome();
                }}
                className="btn-outline"
                style={{ width: '100%', padding: '10px', marginTop: '10px', fontSize: '13px' }}
              >
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
