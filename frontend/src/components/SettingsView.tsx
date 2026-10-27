import React, { useState, useEffect } from 'react';
import {
  Bell,
  FileText,
  User as UserIcon,
  Check,
  Save,
  AlertCircle,
  Lock,
  Shield
} from 'lucide-react';
import api from '../api/client';
import { ChangePasswordModal } from './ChangePasswordModal';

export interface UserSettings {
  name: string;
  email: string;
  email_alerts_enabled: boolean;
  email_budget_alerts: boolean;
  goal_milestone_notifs: boolean;
  monthly_report_notifs: boolean;
}

export interface SettingsViewProps {
  initialName?: string;
  onProfileUpdate?: (updatedUser: { name: string; email?: string }) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialName, onProfileUpdate }) => {
  const [profile, setProfile] = useState<UserSettings>({
    name: initialName || '',
    email: '',
    email_alerts_enabled: true,
    email_budget_alerts: true,
    goal_milestone_notifs: true,
    monthly_report_notifs: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    api.get('/user/settings/profile')
      .then((res) => {
        setProfile({
          name: res.data.name || initialName || '',
          email: res.data.email || '',
          email_alerts_enabled: res.data.email_alerts_enabled ?? true,
          email_budget_alerts: res.data.email_budget_alerts ?? true,
          goal_milestone_notifs: res.data.goal_milestone_notifs ?? true,
          monthly_report_notifs: res.data.monthly_report_notifs ?? true,
        });
      })
      .catch((err) => {
        console.error('Failed to load user settings:', err);
      })
      .finally(() => setLoading(false));
  }, [initialName]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.patch('/user/settings/profile', {
        name: profile.name,
        email_alerts_enabled: profile.email_alerts_enabled,
        email_budget_alerts: profile.email_budget_alerts,
        goal_milestone_notifs: profile.goal_milestone_notifs,
        monthly_report_notifs: profile.monthly_report_notifs,
      });

      const updatedName = res.data.name || profile.name;
      setProfile((prev) => ({
        ...prev,
        ...res.data
      }));
      setFeedback({ msg: 'Profile and notification settings saved successfully!', type: 'success' });

      if (onProfileUpdate) {
        onProfileUpdate({ name: updatedName, email: res.data.email || profile.email });
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.detail || 'Failed to update settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)' }}>
        Loading settings & preferences...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Settings & Preferences
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginTop: '4px', marginBottom: 0 }}>
          Manage your account profile, notification alerts, and security credentials.
        </p>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-btn)',
          backgroundColor: feedback.type === 'success' ? 'var(--light-accent)' : 'var(--light-danger)',
          border: feedback.type === 'success' ? '1px solid var(--accent)' : '1px solid var(--danger)',
          color: feedback.type === 'success' ? 'var(--accent)' : 'var(--danger)',
          fontSize: '13.5px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {feedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* GENERAL SETTINGS FORM */}
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* 1. PROFILE DETAILS SECTION */}
        <div className="card-box" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
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
              <UserIcon size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                Profile Details
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', margin: 0 }}>
                Your account personal identity details.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="input-field"
                style={{ height: '42px' }}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                Email Address (Read-only)
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="input-field"
                style={{ height: '42px', opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'var(--card-subtle)' }}
              />
            </div>
          </div>
        </div>

        {/* 2. SECURITY SECTION */}
        <div className="card-box" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--light-accent)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Shield size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                  Security
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', margin: '2px 0 0' }}>
                  Manage your password and secure your active sessions.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: 'var(--radius-btn)',
                cursor: 'pointer',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                backgroundColor: 'transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--light-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Lock size={15} />
              <span>Change password</span>
            </button>
          </div>
        </div>

        {/* 3. NOTIFICATION PREFERENCES SECTION */}
        <div className="card-box" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
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
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                Notification Preferences
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', margin: 0 }}>
                Control which quiet alerts you receive via email and in the app.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Monthly Financial Report Switch */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '10px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, paddingRight: '16px' }}>
                <FileText size={18} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                    Monthly Financial Report Notifications
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    Receive a notification alert when your monthly savings & financial health report is ready to review.
                  </div>
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profile.monthly_report_notifs}
                  onChange={(e) => setProfile((p) => ({ ...p, monthly_report_notifs: e.target.checked }))}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: profile.monthly_report_notifs ? 'var(--accent)' : 'var(--border)',
                  borderRadius: '24px',
                  transition: '0.2s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: profile.monthly_report_notifs ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    transition: '0.2s ease'
                  }} />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userEmail={profile.email}
      />
    </div>
  );
};
