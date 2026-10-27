import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Plus, Info, RotateCcw } from 'lucide-react';
import type { Goal } from '../api/goals';
import { updateGoalCardAlerts, getGoalAlertSettings } from '../api/goals';

export function formatGoalAlertPreview(
  milestones: number[],
  deadlineDays: number | null,
  inactivityDays: number | null,
  inApp: boolean,
  email: boolean,
  isPerGoal = true
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
    milestoneStr = `${sorted.slice(0, -1).map((s) => `${s}%`).join(', ')} and ${sorted[sorted.length - 1]}%`;
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
  else if (deadlineDays === 0) deadlinePart = ', on the deadline day';

  let inactPart = '';
  if (inactivityDays && inactivityDays > 0) {
    inactPart = `, and after ${inactivityDays} days without an addition`;
  }

  return `You'll get ${channelStr} at ${milestoneStr} progress${deadlinePart}${inactPart}.`;
}

export function formatGoalCardBellSummary(
  milestones?: number[] | null,
  inApp?: boolean | null,
  email?: boolean | null,
  isPaused?: boolean
): string {
  if (isPaused) {
    return 'Paused';
  }
  const appOn = inApp ?? true;
  const emailOn = email ?? true;
  if (!appOn && !emailOn) {
    return 'No alerts';
  }
  const mList = milestones && milestones.length > 0 ? [...milestones].sort((a, b) => a - b) : [25, 50, 75, 100];
  const mStr = mList.map((m) => `${m}%`).join(', ');

  let chStr = 'App + Email';
  if (appOn && !emailOn) chStr = 'App';
  else if (!appOn && emailOn) chStr = 'Email';

  return `${mStr} · ${chStr}`;
}

interface GoalAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  isPagePaused?: boolean;
  onSaved?: () => void;
}

const QUICK_MILESTONES = [25, 50, 75, 100];

const DEADLINE_OPTIONS = [
  { value: 7, label: '7 days before' },
  { value: 3, label: '3 days before' },
  { value: 0, label: 'On the deadline day' },
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
  goal,
  isPagePaused = false,
  onSaved,
}) => {
  const [milestones, setMilestones] = useState<number[]>([25, 50, 75, 100]);
  const [deadlineReminder, setDeadlineReminder] = useState<number>(7);
  const [inactivityNudge, setInactivityNudge] = useState<number>(30);
  const [inApp, setInApp] = useState<boolean>(true);
  const [email, setEmail] = useState<boolean>(true);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [showConfirmApplyAll, setShowConfirmApplyAll] = useState<boolean>(false);

  const [customInput, setCustomInput] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setCustomError('');
      setSuccessMsg('');
      setShowConfirmApplyAll(false);
      setApplyToAll(false);

      if (goal) {
        setMilestones(goal.custom_milestone_thresholds || [25, 50, 75, 100]);
        setDeadlineReminder(
          goal.custom_deadline_reminder_days !== null && goal.custom_deadline_reminder_days !== undefined
            ? goal.custom_deadline_reminder_days
            : -1
        );
        setInactivityNudge(
          goal.custom_inactivity_nudge_days !== null && goal.custom_inactivity_nudge_days !== undefined
            ? goal.custom_inactivity_nudge_days
            : -1
        );
        setInApp(goal.custom_alert_in_app ?? true);
        setEmail(goal.custom_alert_email ?? true);
      } else {
        getGoalAlertSettings()
          .then((data) => {
            setMilestones(data.milestone_thresholds || [25, 50, 75, 100]);
            setDeadlineReminder(
              data.deadline_reminder_days !== null && data.deadline_reminder_days !== undefined
                ? data.deadline_reminder_days
                : 7
            );
            setInactivityNudge(
              data.inactivity_nudge_days !== null && data.inactivity_nudge_days !== undefined
                ? data.inactivity_nudge_days
                : 30
            );
            setInApp(data.in_app ?? true);
            setEmail(data.email ?? true);
          })
          .catch(() => {
            setMilestones([25, 50, 75, 100]);
            setDeadlineReminder(7);
            setInactivityNudge(30);
            setInApp(true);
            setEmail(true);
          });
      }
    }
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const toggleMilestone = (pct: number) => {
    setCustomError('');
    if (milestones.includes(pct)) {
      setMilestones(milestones.filter((m) => m !== pct));
    } else {
      if (milestones.length >= 5) {
        setCustomError('Up to 5 milestone alerts allowed.');
        return;
      }
      setMilestones([...milestones, pct].sort((a, b) => a - b));
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError('');
    const val = parseInt(customInput.trim(), 10);
    if (isNaN(val) || val < 1 || val > 100) {
      setCustomError('Enter a number between 1 and 100.');
      return;
    }
    if (milestones.includes(val)) {
      setCustomError(`${val}% is already added.`);
      return;
    }
    if (milestones.length >= 5) {
      setCustomError('Up to 5 milestone alerts allowed.');
      return;
    }
    setMilestones([...milestones, val].sort((a, b) => a - b));
    setCustomInput('');
  };

  const removeMilestone = (pct: number) => {
    setMilestones(milestones.filter((m) => m !== pct));
  };

  const handleResetToDefault = () => {
    setMilestones([25, 50, 75, 100]);
    setDeadlineReminder(7);
    setInactivityNudge(30);
    setInApp(true);
    setEmail(true);
    setCustomError('');
  };

  const handleSaveClick = async () => {
    if (applyToAll && !showConfirmApplyAll) {
      setShowConfirmApplyAll(true);
      return;
    }
    await executeSave();
  };

  const executeSave = async () => {
    if (!goal) return;
    try {
      setSaving(true);
      setCustomError('');
      await updateGoalCardAlerts(goal.id, {
        milestone_thresholds: milestones,
        deadline_reminder_days: deadlineReminder === -1 ? null : deadlineReminder,
        inactivity_nudge_days: inactivityNudge === -1 ? null : inactivityNudge,
        in_app: inApp,
        email,
        apply_to_all: applyToAll,
      });

      setSuccessMsg(
        applyToAll ? 'Alert settings applied to all your goals.' : 'Alert settings updated for this goal.'
      );
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 700);
    } catch {
      setCustomError('Failed to save alert settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isBothOff = !inApp && !email;
  const deadlineDaysParam = deadlineReminder === -1 ? null : deadlineReminder;
  const inactivityDaysParam = inactivityNudge === -1 ? null : inactivityNudge;
  const previewText = formatGoalAlertPreview(
    milestones,
    deadlineDaysParam,
    inactivityDaysParam,
    inApp,
    email,
    true
  );
  const goalTitle = goal?.title || 'Goal';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--primary)' }}>
                Alert settings · {goalTitle}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
                {isPagePaused ? 'Alerts are currently paused on the Goals page' : 'Customize when and how you are notified'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResetToDefault}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="Reset to default (25%, 50%, 75%, 100% · 7d reminder · 30d nudge)"
            >
              <RotateCcw size={13} />
              Reset to default
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--secondary-text)',
                padding: '4px',
                borderRadius: '6px',
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Success / Error notification */}
        {successMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {customError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{customError}</span>
          </div>
        )}

        {/* Confirmation view for apply to all */}
        {showConfirmApplyAll ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--warning)',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              <AlertCircle size={18} />
              <span>Replace alert settings on other goals?</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--main-text)', lineHeight: 1.5 }}>
              This replaces the alert settings on your other goals with these settings.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmApplyAll(false)}
                className="btn btn-outline"
                style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                disabled={saving}
              >
                Back
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 1, padding: '8px', fontSize: '13px' }}
              >
                {saving ? 'Applying...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 1. Milestone alerts */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  marginBottom: '8px',
                }}
              >
                Milestone alerts: (progress % achieved)
              </label>

              {/* Quick choices */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {QUICK_MILESTONES.map((pct) => {
                  const isSel = milestones.includes(pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => toggleMilestone(pct)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        border: isSel ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: isSel ? 'var(--accent)' : 'var(--card-subtle)',
                        color: isSel ? '#FFFFFF' : 'var(--main-text)',
                        cursor: 'pointer',
                        transition: '0.15s ease',
                      }}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>

              {/* Custom number */}
              <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Custom % (1-100)"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card-subtle)',
                    color: 'var(--main-text)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-outline"
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </form>

              {/* Active Badges */}
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {milestones.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                    No milestone selected. Choose at least one or add a custom percentage.
                  </span>
                ) : (
                  milestones.map((pct) => (
                    <span
                      key={pct}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {pct}%
                      <button
                        type="button"
                        onClick={() => removeMilestone(pct)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        aria-label={`Remove ${pct}%`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 2. Deadline Reminders */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  marginBottom: '8px',
                }}
              >
                Deadline reminders:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {DEADLINE_OPTIONS.map((opt) => {
                  const isSel = deadlineReminder === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDeadlineReminder(opt.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontWeight: isSel ? 600 : 500,
                        border: isSel ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: isSel ? 'rgba(16, 185, 129, 0.1)' : 'var(--card-subtle)',
                        color: isSel ? 'var(--accent)' : 'var(--main-text)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: '0.15s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Gentle Nudge Inactivity */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--primary)',
                  }}
                >
                  Gentle inactivity nudge:
                </label>
                <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                  A kind, supportive check-in
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {INACTIVITY_OPTIONS.map((opt) => {
                  const isSel = inactivityNudge === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInactivityNudge(opt.value)}
                      style={{
                        padding: '8px 8px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontWeight: isSel ? 600 : 500,
                        border: isSel ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: isSel ? 'rgba(16, 185, 129, 0.1)' : 'var(--card-subtle)',
                        color: isSel ? 'var(--accent)' : 'var(--main-text)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: '0.15s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. How to be told: Switches */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  marginBottom: '8px',
                }}
              >
                How to be told:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* In-app switch */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--card-subtle)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                      In-app notification
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                      Bell badge and notification dropdown
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={inApp}
                      onChange={(e) => setInApp(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: inApp ? 'var(--accent)' : 'var(--border)',
                        borderRadius: '24px',
                        transition: '0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          content: '""',
                          height: '18px',
                          width: '18px',
                          left: inApp ? '21px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '50%',
                          transition: '0.2s ease',
                        }}
                      />
                    </span>
                  </label>
                </div>

                {/* Email switch */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'var(--card-subtle)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                      Email
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                      Celebratory progress and reminder emails
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={email}
                      onChange={(e) => setEmail(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: email ? 'var(--accent)' : 'var(--border)',
                        borderRadius: '24px',
                        transition: '0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          content: '""',
                          height: '18px',
                          width: '18px',
                          left: email ? '21px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '50%',
                          transition: '0.2s ease',
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 5. Preview line or Gentle note */}
            {isBothOff ? (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'var(--warning)',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>You won't be notified about this goal.</span>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--main-text)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <Info size={16} color="var(--accent)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{previewText}</span>
              </div>
            )}

            {/* 6. Apply to all checkbox */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 2px',
              }}
            >
              <input
                type="checkbox"
                id="applyToAllGoals"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label
                htmlFor="applyToAllGoals"
                style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', userSelect: 'none' }}
              >
                Apply these settings to all my goals
              </label>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
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
