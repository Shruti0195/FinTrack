import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  X,
  Check,
  Shield,
  AlertCircle
} from 'lucide-react';
import { changeUserPassword, requestPasswordReset } from '../api/settings';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onSuccess
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isNewFocused, setIsNewFocused] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [forgotStatus, setForgotStatus] = useState<{ loading: boolean; msg?: string; error?: string }>({ loading: false });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsNewFocused(false);
      setFeedback(null);
      setFieldErrors({});
      setForgotStatus({ loading: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Constraint: At least 6 characters long (like registration & forgot password)
  const allRulesMet = newPassword.length >= 6;
  const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isButtonDisabled = !currentPassword || !newPassword || !confirmPassword || !allRulesMet || !isMatching || updating;

  // "Comes and goes" logic: show rule only when new password is focused, disappears when focus leaves
  const showRules = isNewFocused;

  // Strength calculation based on length
  let strengthLabel = 'Weak';
  let strengthColor = '#EF4444';
  let strengthPercent = 33;
  if (newPassword.length === 0) {
    strengthLabel = 'None';
    strengthColor = 'var(--border)';
    strengthPercent = 0;
  } else if (newPassword.length >= 10) {
    strengthLabel = 'Strong';
    strengthColor = 'var(--accent)';
    strengthPercent = 100;
  } else if (newPassword.length >= 6) {
    strengthLabel = 'Fair';
    strengthColor = '#F59E0B';
    strengthPercent = 66;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setFieldErrors({});

    const errors: { current?: string; new?: string; confirm?: string } = {};
    if (!currentPassword) {
      errors.current = 'Please enter your current password.';
    }
    if (!newPassword) {
      errors.new = 'Please enter a new password.';
    } else if (!allRulesMet) {
      errors.new = 'Password must be at least 6 characters long.';
    } else if (newPassword === currentPassword) {
      errors.new = 'New password cannot be the same as your current password.';
    }
    if (!confirmPassword) {
      errors.confirm = 'Please confirm your new password.';
    } else if (confirmPassword !== newPassword) {
      errors.confirm = 'New passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (typeof document !== 'undefined' && document.body.classList.contains('tour-active-sample')) {
      setFeedback({
        type: 'error',
        msg: 'Changing password is disabled during the guided tour.'
      });
      return;
    }

    setUpdating(true);
    try {
      const res = await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      // Update local storage auth token so current device stays logged in
      if (res.access_token) {
        localStorage.setItem('token', res.access_token);
      }

      setFeedback({
        type: 'success',
        msg: 'Your password has been updated. All other logged-in devices and browsers have been signed out.'
      });

      // Clear the form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 429) {
        setFeedback({
          type: 'warning',
          msg: typeof detail === 'string' ? detail : 'Too many incorrect attempts. Please wait 15 minutes before trying again, or use the reset link.'
        });
      } else if (detail === "That current password isn't right") {
        setFieldErrors({ current: "That current password isn't right" });
      } else if (typeof detail === 'string') {
        if (detail.toLowerCase().includes('same as your current')) {
          setFieldErrors({ new: detail });
        } else if (detail.toLowerCase().includes('do not match')) {
          setFieldErrors({ confirm: detail });
        } else {
          setFeedback({ type: 'error', msg: detail });
        }
      } else {
        setFeedback({ type: 'error', msg: 'Failed to update password. Please check your details.' });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!userEmail) return;
    setForgotStatus({ loading: true });
    try {
      await requestPasswordReset(userEmail);
      setForgotStatus({
        loading: false,
        msg: `Reset link sent to ${userEmail}. Check your inbox.`
      });
    } catch (err: any) {
      setForgotStatus({
        loading: false,
        error: 'Failed to send reset link. Please try again.'
      });
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
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
        padding: '16px'
      }}
    >
      <div
        className="card-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-modal-title"
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          width: '100%',
          maxWidth: '460px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--light-accent)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={20} />
            </div>
            <div>
              <h2 id="change-password-modal-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                Change Password
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--secondary-text)', margin: '2px 0 0' }}>
                Safely update your account credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close change password modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--secondary-text)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* Feedback Banner */}
          {feedback && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: feedback.type === 'success' 
                ? 'var(--light-accent)' 
                : feedback.type === 'warning' 
                ? 'rgba(245, 158, 11, 0.12)' 
                : 'var(--light-danger)',
              border: feedback.type === 'success' 
                ? '1px solid var(--accent)' 
                : feedback.type === 'warning' 
                ? '1px solid #F59E0B' 
                : '1px solid var(--danger)',
              color: feedback.type === 'success' 
                ? 'var(--accent)' 
                : feedback.type === 'warning' 
                ? '#D97706' 
                : 'var(--danger)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {feedback.type === 'success' ? (
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              ) : feedback.type === 'warning' ? (
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
              ) : (
                <XCircle size={18} style={{ flexShrink: 0 }} />
              )}
              <span style={{ lineHeight: 1.4 }}>{feedback.msg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Field 1: Current Password */}
            <div>
              <label htmlFor="popup-current-password" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
                <input
                  id="popup-current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (fieldErrors.current) {
                      setFieldErrors(prev => ({ ...prev, current: undefined }));
                    }
                  }}
                  className="input-field"
                  style={{
                    height: '40px',
                    paddingLeft: '38px',
                    paddingRight: '38px',
                    borderColor: fieldErrors.current ? '#EF4444' : undefined
                  }}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  title={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {fieldErrors.current && (
                <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.current}
                </div>
              )}

              {/* Forgot password link */}
              <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotStatus.loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    cursor: forgotStatus.loading ? 'wait' : 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {forgotStatus.loading ? 'Sending reset link...' : 'Forgot your current password?'}
                </button>
                {forgotStatus.msg && (
                  <span style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 500 }}>
                    {forgotStatus.msg}
                  </span>
                )}
                {forgotStatus.error && (
                  <span style={{ fontSize: '11.5px', color: '#EF4444', fontWeight: 500 }}>
                    {forgotStatus.error}
                  </span>
                )}
              </div>
            </div>

            {/* Field 2: New Password */}
            <div>
              <label htmlFor="popup-new-password" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
                <input
                  id="popup-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onFocus={() => setIsNewFocused(true)}
                  onBlur={() => setIsNewFocused(false)}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.new) {
                      setFieldErrors(prev => ({ ...prev, new: undefined }));
                    }
                  }}
                  className="input-field"
                  style={{
                    height: '40px',
                    paddingLeft: '38px',
                    paddingRight: '38px',
                    borderColor: fieldErrors.new ? '#EF4444' : undefined
                  }}
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  title={showNewPassword ? 'Hide new password' : 'Show new password'}
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {fieldErrors.new && (
                <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.new}
                </div>
              )}

              {/* Password strength: appears when typing */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Strength:</span>
                    <span
                      aria-live="polite"
                      style={{ fontSize: '11px', fontWeight: 700, color: strengthColor }}
                    >
                      {strengthLabel}
                    </span>
                  </div>
                  <div style={{
                    height: '4px',
                    backgroundColor: 'var(--card-subtle)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${strengthPercent}%`,
                      backgroundColor: strengthColor,
                      transition: 'all 0.25s ease'
                    }} />
                  </div>
                </div>
              )}

              {/* "Comes and goes" Rule: Smoothly appears when focused or typing, and disappears when not needed */}
              {showRules && (
                <div
                  aria-live="polite"
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--card-subtle)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  {allRulesMet ? (
                    <CheckCircle2 size={13} color="var(--accent)" />
                  ) : (
                    <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border)', display: 'inline-block' }} />
                  )}
                  <span style={{ fontSize: '11.5px', color: allRulesMet ? 'var(--accent)' : 'var(--secondary-text)', fontWeight: allRulesMet ? 600 : 400 }}>
                    At least 6 characters
                  </span>
                </div>
              )}

              {/* When rule is met and not focused, show compact 1-line confirmation */}
              {!showRules && allRulesMet && (
                <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent)', fontSize: '11.5px', fontWeight: 600 }}>
                  <Check size={13} />
                  <span>At least 6 characters</span>
                </div>
              )}
            </div>

            {/* Field 3: Confirm New Password */}
            <div>
              <label htmlFor="popup-confirm-password" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
                <input
                  id="popup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm) {
                      setFieldErrors(prev => ({ ...prev, confirm: undefined }));
                    }
                  }}
                  className="input-field"
                  style={{
                    height: '40px',
                    paddingLeft: '38px',
                    paddingRight: '38px',
                    borderColor: fieldErrors.confirm ? '#EF4444' : undefined
                  }}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {fieldErrors.confirm && (
                <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.confirm}
                </div>
              )}
              {confirmPassword.length > 0 && !isMatching && !fieldErrors.confirm && (
                <div style={{ color: '#EF4444', fontSize: '11.5px', marginTop: '4px' }}>
                  Passwords do not match.
                </div>
              )}
              {confirmPassword.length > 0 && isMatching && (
                <div style={{ color: 'var(--accent)', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Check size={13} />
                  <span>Passwords match</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline"
                style={{
                  padding: '9px 16px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="btn-primary"
                style={{
                  padding: '9px 20px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-btn)',
                  cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                  opacity: isButtonDisabled ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--accent)',
                  color: '#FFFFFF'
                }}
              >
                <Lock size={14} />
                <span>{updating ? 'Updating password...' : 'Update password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
