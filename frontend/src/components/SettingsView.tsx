import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Target,
  FileText,
  ShieldCheck,
  User as UserIcon,
  Check,
  Save,
  AlertCircle,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';

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
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialName, onProfileUpdate }) => {
  const { theme, setTheme } = useTheme();

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

      // Notify parent component so header, avatar, and greetings update immediately without page refresh
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '28px 20px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
          Settings & Preferences
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginTop: '4px' }}>
          Manage your account profile, notification alerts, and theme preferences.
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
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {feedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1. PROFILE DETAILS SECTION (At the Top) */}
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

        {/* 2. NOTIFICATIONS SECTION (Second) */}
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
            
            {/* Toggle 1: Email Budget Alerts */}
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
                <Mail size={18} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                    Email Budget Alerts (80% & 100%)
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    Receive a friendly email advisory when a category reaches 80% or 100% of its budget limit. Sent at most once per category per month.
                  </div>
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profile.email_budget_alerts && profile.email_alerts_enabled}
                  onChange={(e) => setProfile((p) => ({
                    ...p,
                    email_budget_alerts: e.target.checked,
                    email_alerts_enabled: e.target.checked
                  }))}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: (profile.email_budget_alerts && profile.email_alerts_enabled) ? 'var(--accent)' : 'var(--border)',
                  borderRadius: '24px',
                  transition: '0.2s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: (profile.email_budget_alerts && profile.email_alerts_enabled) ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    transition: '0.2s ease'
                  }} />
                </span>
              </label>
            </div>

            {/* Toggle 2: Goal Milestone Notifications */}
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
                <Target size={18} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                    Goal Milestone Notifications
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    Receive celebration and progress alerts when your savings goals reach 25%, 50%, 75%, or 100% completion.
                  </div>
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profile.goal_milestone_notifs}
                  onChange={(e) => setProfile((p) => ({ ...p, goal_milestone_notifs: e.target.checked }))}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: profile.goal_milestone_notifs ? 'var(--accent)' : 'var(--border)',
                  borderRadius: '24px',
                  transition: '0.2s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: profile.goal_milestone_notifs ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    transition: '0.2s ease'
                  }} />
                </span>
              </label>
            </div>

            {/* Toggle 3: Monthly Financial Report Ready */}
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

            {/* In-App Budget Alerts Badge (Always On) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '10px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <ShieldCheck size={18} color="var(--accent)" />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                    In-App Budget & System Alerts
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)' }}>
                    In-app bell badge & threshold notifications remain active to keep your account safe.
                  </div>
                </div>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--light-accent)',
                color: 'var(--accent)',
                fontSize: '11.5px',
                fontWeight: 700
              }}>
                Always Enabled
              </span>
            </div>

          </div>
        </div>

        {/* 3. APPEARANCE & THEME SECTION (Moved from Navbar) */}
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
              <Palette size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                Appearance & Theme
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', margin: 0 }}>
                Choose your preferred interface theme for FinTrack.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {/* Light Mode Option Card */}
            <div
              onClick={() => setTheme('light')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '18px',
                borderRadius: '12px',
                border: theme === 'light' ? '2px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: theme === 'light' ? 'var(--light-accent)' : 'var(--card-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: theme === 'light' ? '#FFFFFF' : 'var(--card)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
                flexShrink: 0
              }}>
                <Sun size={22} strokeWidth={2.3} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
                    Light Mode
                  </span>
                  {theme === 'light' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      backgroundColor: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid var(--accent)'
                    }}>
                      <Check size={12} strokeWidth={3} />
                      Active
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--secondary-text)', margin: 0, lineHeight: 1.4 }}>
                  Clean, bright interface with emerald accents and crisp contrast.
                </p>
              </div>
            </div>

            {/* Dark Mode Option Card */}
            <div
              onClick={() => setTheme('dark')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '18px',
                borderRadius: '12px',
                border: theme === 'dark' ? '2px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: theme === 'dark' ? '#0F172A' : 'var(--card)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
                flexShrink: 0
              }}>
                <Moon size={22} strokeWidth={2.3} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
                    Dark Mode
                  </span>
                  {theme === 'dark' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      backgroundColor: 'var(--card)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid var(--accent)'
                    }}>
                      <Check size={12} strokeWidth={3} />
                      Active
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--secondary-text)', margin: 0, lineHeight: 1.4 }}>
                  Deep slate and navy contrast, reducing eye strain in low-light environments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ padding: '10px 26px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
