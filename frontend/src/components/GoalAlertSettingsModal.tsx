import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Plus, Info } from 'lucide-react';
import { getGoalAlertSettings, updateGoalAlertSettings } from '../api/goals';

export function formatGoalAlertPreview(
  milestones: number[], 
  deadlineDays: number | null, 
  inactivityDays: number | null, 
  inApp: boolean, 
  email: boolean,
  isPerGoal = false
): string {
  if (!inApp && !email) {
    return isPerGoal 
      ? "You won't be notified about this goal." 
      : "You won't be notified about your goals.";
  }

  const sorted = [...milestones].sort((a, b) => a - b);
  let milestoneStr = '';
  if (sorted.length === 0) {
    milestoneStr = 'no selected milestones';
  } else if (sorted.length === 1) {
    milestoneStr = `${sorted[0]}%`;
  } else if (sorted.length === 2) {
    milestoneStr = `${sorted[0]}% and ${sorted[1]}%`;
  } else {
    milestoneStr = `${sorted.slice(0, -1).map(s => `${s}%`).join(', ')} and ${sorted[sorted.length - 1]}%`;
  }

  let channelStr = '';
  if (inApp && email) {
    channelStr = 'an in-app notification and an email';
  } else if (inApp) {
    channelStr = 'an in-app notification';
  } else {
    channelStr = 'an email';
  }

  let deadlinePart = '';
  if (deadlineDays === 7) deadlinePart = ', 7 days before the deadline';
  else if (deadlineDays === 3) deadlinePart = ', 3 days before the deadline';
  else if (deadlineDays === 0) deadlinePart = ', on deadline day';

  let inactPart = '';
  if (inactivityDays && inactivityDays > 0) {
    inactPart = `, and after ${inactivityDays} days of inactivity`;
  }

  return `You'll get ${channelStr} at ${milestoneStr} progress${deadlinePart}${inactPart}.`;
}

interface GoalAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const QUICK_MILESTONES = [25, 50, 75, 100];

const DEADLINE_OPTIONS = [
  { value: 7, label: '7 days before' },
  { value: 3, label: '3 days before' },
  { value: 0, label: 'On deadline day' },
  { value: -1, label: 'None' },
];

const INACTIVITY_OPTIONS = [
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: -1, label: 'Off' },
];

export const GoalAlertSettingsModal: React.FC<GoalAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [milestones, setMilestones] = useState<number[]>([25, 50, 75, 100]);
  const [deadlineReminder, setDeadlineReminder] = useState<number>(7);
  const [inactivityNudge, setInactivityNudge] = useState<number>(30);
  const [inApp, setInApp] = useState<boolean>(true);
  const [email, setEmail] = useState<boolean>(true);
  const [customInput, setCustomInput] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setCustomError('');
      setSuccessMsg('');
      getGoalAlertSettings()
        .then((data) => {
          setMilestones(data.milestone_thresholds || [25, 50, 75, 100]);
          setDeadlineReminder(data.deadline_reminder_days !== null && data.deadline_reminder_days !== undefined ? data.deadline_reminder_days : 7);
          setInactivityNudge(data.inactivity_nudge_days !== null && data.inactivity_nudge_days !== undefined ? data.inactivity_nudge_days : 30);
          setInApp(data.in_app ?? true);
          setEmail(data.email ?? true);
        })
        .catch(() => {
          setMilestones([25, 50, 75, 100]);
          setDeadlineReminder(7);
          setInactivityNudge(30);
          setInApp(true);
          setEmail(true);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMilestone = (m: number) => {
    setCustomError('');
    if (milestones.includes(m)) {
      setMilestones(milestones.filter((x) => x !== m));
    } else {
      if (milestones.length >= 5) {
        setCustomError('You can set up to 5 milestone thresholds.');
        return;
      }
      setMilestones([...milestones, m].sort((a, b) => a - b));
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError('');
    const val = parseInt(customInput.trim(), 10);
    if (isNaN(val) || val < 1 || val > 100) {
      setCustomError('Please enter a milestone number between 1 and 100.');
      return;
    }
    if (milestones.includes(val)) {
      setCustomError(`${val}% is already added.`);
      return;
    }
    if (milestones.length >= 5) {
      setCustomError('You can set up to 5 milestone thresholds.');
      return;
    }
    setMilestones([...milestones, val].sort((a, b) => a - b));
    setCustomInput('');
  };

  const handleRemoveMilestone = (m: number) => {
    setMilestones(milestones.filter((x) => x !== m));
  };

  const handleSave = async () => {
    setSaving(true);
    setCustomError('');
    try {
      await updateGoalAlertSettings({
        milestone_thresholds: milestones.length > 0 ? milestones : [25, 50, 75, 100],
        deadline_reminder_days: deadlineReminder === -1 ? null : deadlineReminder,
        inactivity_nudge_days: inactivityNudge === -1 ? null : inactivityNudge,
        in_app: inApp,
        email: email
      });
      setSuccessMsg('Goal alert settings saved successfully!');
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setCustomError(err.response?.data?.detail || 'Failed to save goal alert settings.');
    } finally {
      setSaving(false);
    }
  };

  const isBothOff = !inApp && !email;
  const deadlineDaysClean = deadlineReminder === -1 ? null : deadlineReminder;
  const inactDaysClean = inactivityNudge === -1 ? null : inactivityNudge;
  const previewText = formatGoalAlertPreview(milestones, deadlineDaysClean, inactDaysClean, inApp, email, false);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 110,
      padding: '16px'
    }}>
      <div className="card-box" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '24px',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
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
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                Goal Alert Settings
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--secondary-text)', margin: 0 }}>
                Default milestone and reminder settings for all goals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)' }}>
            Loading goal alert settings...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {successMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--light-accent)',
                color: 'var(--accent)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {customError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--light-danger)',
                color: 'var(--danger)',
                fontSize: '12.5px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{customError}</span>
              </div>
            )}

            {/* 1. Milestone alerts */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                Milestone alerts (Progress %)
              </label>

              {/* Quick choices */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {QUICK_MILESTONES.map((m) => {
                  const isSelected = milestones.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMilestone(m)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: isSelected ? 'var(--light-accent)' : 'var(--card-subtle)',
                        color: isSelected ? 'var(--accent)' : 'var(--main-text)',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {m}%
                    </button>
                  );
                })}
              </div>

              {/* Custom input */}
              <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Custom milestone (1-100)"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="input-field"
                  style={{ height: '38px', fontSize: '13px', flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={!customInput || milestones.length >= 5}
                  className="btn btn-outline"
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </form>

              {/* Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Selected (up to 5):</span>
                {milestones.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--danger)', fontStyle: 'italic' }}>None selected</span>
                ) : (
                  milestones.map((m) => (
                    <span
                      key={m}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--card-subtle)',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent)',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      {m}%
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(m)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--secondary-text)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 2. Deadline reminders */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                Deadline reminders
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {DEADLINE_OPTIONS.map((opt) => {
                  const isSelected = deadlineReminder === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDeadlineReminder(opt.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: isSelected ? 'var(--light-accent)' : 'var(--card-subtle)',
                        color: isSelected ? 'var(--accent)' : 'var(--main-text)',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 700 : 500,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Gentle nudge when inactive */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                Gentle nudge when inactive
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {INACTIVITY_OPTIONS.map((opt) => {
                  const isSelected = inactivityNudge === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInactivityNudge(opt.value)}
                      style={{
                        padding: '8px 8px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: isSelected ? 'var(--light-accent)' : 'var(--card-subtle)',
                        color: isSelected ? 'var(--accent)' : 'var(--main-text)',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 700 : 500,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. How to be told */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '10px' }}>
                How to be told
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'var(--card-subtle)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>
                      In-app notification
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                      Bell notification and celebration milestone alert
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={inApp}
                      onChange={(e) => setInApp(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: inApp ? 'var(--accent)' : 'var(--border)',
                      borderRadius: '24px',
                      transition: '0.2s ease'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: inApp ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '50%',
                        transition: '0.2s ease'
                      }} />
                    </span>
                  </label>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'var(--card-subtle)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>
                      Email
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                      Celebratory progress and deadline reminder emails
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={email}
                      onChange={(e) => setEmail(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: email ? 'var(--accent)' : 'var(--border)',
                      borderRadius: '24px',
                      transition: '0.2s ease'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: email ? '23px' : '3px',
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

            {/* 5. Preview or Gentle Warning */}
            {isBothOff ? (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--warning)',
                fontSize: '12.5px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>You won't be notified about goals.</span>
              </div>
            ) : (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--main-text)',
                fontSize: '12.5px',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <Info size={16} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{previewText}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
