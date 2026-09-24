import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ArrowRight, Mail, Lock, User as UserIcon } from 'lucide-react';
import api from '../api/client';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setEmailAlertsEnabled(true);
    setError(null);
    setSuccessMsg(null);
  };

  useEffect(() => {
    resetForm();
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setPassword('');
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'register') {
        const submittedEmail = email.trim();
        await api.post('/auth/register', {
          name: name.trim(),
          email: submittedEmail,
          password,
          email_alerts_enabled: emailAlertsEnabled,
        });

        setName('');
        setEmail('');
        setPassword('');
        setSuccessMsg(`Account created! A verification email has been sent to ${submittedEmail}. Please check your inbox and click the activation link to activate your account.`);
        
        setTimeout(() => {
          switchMode('login');
        }, 4000);

      } else if (mode === 'forgot') {
        await api.post('/auth/forgot-password', {
          email: email.trim(),
        });
        setEmail('');
        setSuccessMsg('If this email is registered in FinTrack, a password reset link has been sent to your inbox.');

      } else {
        const formData = new URLSearchParams();
        formData.append('username', email.trim());
        formData.append('password', password);

        const res = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        localStorage.setItem('token', res.data.access_token);
        setSuccessMsg('Login successful! Redirecting...');
        resetForm();

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify your details.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-card)',
        width: '100%',
        maxWidth: '440px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header bar */}
        <div style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 700 }}>
              {mode === 'login' && 'Welcome Back to FinTrack'}
              {mode === 'register' && 'Create Your FinTrack Account'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '2px' }}>
              {mode === 'login' && 'Access your financial dashboard'}
              {mode === 'register' && 'Start tracking income, budgets & health score'}
              {mode === 'forgot' && 'Enter your email to receive a secure reset link'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher (Only shown on Login / Register) */}
        {mode !== 'forgot' && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--card-subtle)'
          }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                color: mode === 'login' ? 'var(--accent)' : 'var(--secondary-text)',
                borderBottom: mode === 'login' ? '2px solid var(--accent)' : '2px solid transparent',
                backgroundColor: mode === 'login' ? 'var(--card)' : 'transparent'
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                color: mode === 'register' ? 'var(--accent)' : 'var(--secondary-text)',
                borderBottom: mode === 'register' ? '2px solid var(--accent)' : '2px solid transparent',
                backgroundColor: mode === 'register' ? 'var(--card)' : 'transparent'
              }}
            >
              Register
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid var(--danger)'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'var(--light-accent)',
              color: 'var(--accent)',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid var(--accent)'
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sweni Shah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}

          {/* Forgot password link on login tab */}
          {mode === 'login' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <span
                onClick={() => switchMode('forgot')}
                style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
              >
                Forgot password?
              </span>
            </div>
          )}

          {mode === 'register' && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              margin: '14px 0 20px'
            }}>
              <input
                type="checkbox"
                id="email_alerts"
                checked={emailAlertsEnabled}
                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                style={{
                  marginTop: '3px',
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--accent)',
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="email_alerts" style={{ fontSize: '12.5px', color: 'var(--main-text)', cursor: 'pointer', lineHeight: 1.4 }}>
                <b>Enable email alerts</b>
                <div style={{ color: 'var(--secondary-text)', fontSize: '11.5px', marginTop: '2px' }}>
                  Receive automatic notifications when you reach 80% or 100% of your category budgets.
                </div>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: mode === 'forgot' ? '12px' : '0' }}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Log In to Account' : mode === 'register' ? 'Complete Registration' : 'Send Reset Link'}
            <ArrowRight size={16} />
          </button>

          {/* Footer switcher links */}
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12.5px', color: 'var(--secondary-text)' }}>
            {mode === 'login' && (
              <>Don't have an account? <span onClick={() => switchMode('register')} style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Register here</span></>
            )}
            {mode === 'register' && (
              <>Already registered? <span onClick={() => switchMode('login')} style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Sign in here</span></>
            )}
            {mode === 'forgot' && (
              <>Remember your password? <span onClick={() => switchMode('login')} style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Back to Log In</span></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
