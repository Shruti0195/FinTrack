import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Plus, Info, RotateCcw } from 'lucide-react';
import type { Budget } from '../api/budgets';
import { updateBudgetCardAlerts, getBudgetAlertSettings } from '../api/budgets';

export function formatBudgetAlertPreview(thresholds: number[], inApp: boolean, email: boolean, isPerBudget = true): string {
  if (!inApp && !email) {
    return isPerBudget 
      ? "You won't be notified about this budget." 
      : "You won't be notified about your budgets.";
  }
  const sorted = [...thresholds].sort((a, b) => a - b);
  let thresholdStr = '';
  if (sorted.length === 0) {
    thresholdStr = 'no selected percentage';
  } else if (sorted.length === 1) {
    thresholdStr = `${sorted[0]}%`;
  } else if (sorted.length === 2) {
    thresholdStr = `${sorted[0]}% and ${sorted[1]}%`;
  } else {
    thresholdStr = `${sorted.slice(0, -1).map(s => `${s}%`).join(', ')} and ${sorted[sorted.length - 1]}%`;
  }

  let channelStr = '';
  if (inApp && email) {
    channelStr = 'an in-app notification and an email';
  } else if (inApp) {
    channelStr = 'an in-app notification';
  } else {
    channelStr = 'an email';
  }

  return `You'll get ${channelStr} when you reach ${thresholdStr} of ${isPerBudget ? 'this budget' : 'a budget'}.`;
}

export function formatBudgetCardBellSummary(
  thresholds?: number[] | null,
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
  const tList = thresholds && thresholds.length > 0 ? [...thresholds].sort((a, b) => a - b) : [80, 100];
  const tStr = tList.map((t) => `${t}%`).join(', ');

  let chStr = 'App + Email';
  if (appOn && !emailOn) chStr = 'App';
  else if (!appOn && emailOn) chStr = 'Email';

  return `${tStr} · ${chStr}`;
}

interface BudgetAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget | null;
  isPagePaused?: boolean;
  onSaved?: () => void;
}

const QUICK_PERCENTAGES = [50, 75, 80, 90, 100];

export const BudgetAlertSettingsModal: React.FC<BudgetAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  budget,
  isPagePaused = false,
  onSaved,
}) => {
  const [thresholds, setThresholds] = useState<number[]>([80, 100]);
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

      if (budget) {
        setThresholds(budget.custom_alert_thresholds || [80, 100]);
        setInApp(budget.custom_alert_in_app ?? true);
        setEmail(budget.custom_alert_email ?? true);
      } else {
        // Fallback to defaults
        getBudgetAlertSettings()
          .then((data) => {
            setThresholds(data.thresholds || [80, 100]);
            setInApp(data.in_app ?? true);
            setEmail(data.email ?? true);
          })
          .catch(() => {
            setThresholds([80, 100]);
            setInApp(true);
            setEmail(true);
          });
      }
    }
  }, [isOpen, budget]);

  if (!isOpen) return null;

  const toggleThreshold = (pct: number) => {
    setCustomError('');
    if (thresholds.includes(pct)) {
      setThresholds(thresholds.filter((t) => t !== pct));
    } else {
      if (thresholds.length >= 5) {
        setCustomError('Up to 5 alerts allowed.');
        return;
      }
      setThresholds([...thresholds, pct].sort((a, b) => a - b));
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError('');
    const val = parseInt(customInput.trim(), 10);
    if (isNaN(val) || val < 1 || val > 150) {
      setCustomError('Enter a number between 1 and 150.');
      return;
    }
    if (thresholds.includes(val)) {
      setCustomError(`${val}% is already added.`);
      return;
    }
    if (thresholds.length >= 5) {
      setCustomError('Up to 5 alerts allowed.');
      return;
    }
    setThresholds([...thresholds, val].sort((a, b) => a - b));
    setCustomInput('');
  };

  const removeThreshold = (pct: number) => {
    setThresholds(thresholds.filter((t) => t !== pct));
  };

  const handleResetToDefault = () => {
    setThresholds([80, 100]);
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
    if (!budget) return;
    try {
      setSaving(true);
      setCustomError('');
      await updateBudgetCardAlerts(budget.id, {
        thresholds,
        in_app: inApp,
        email,
        apply_to_all: applyToAll,
      });

      setSuccessMsg(
        applyToAll
          ? 'Alert settings applied to all your budgets.'
          : 'Alert settings updated for this budget.'
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
  const previewText = formatBudgetAlertPreview(thresholds, inApp, email, true);
  const categoryName = budget?.category_name || 'Budget';

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
          maxWidth: '500px',
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
                Alert settings · {categoryName}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
                {isPagePaused ? 'Alerts are currently paused on the Budgets page' : 'Customize when and how you are notified'}
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
              title="Reset to default (80%, 100% · App & Email)"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 600, fontSize: '14px' }}>
              <AlertCircle size={18} />
              <span>Replace alert settings on other budgets?</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--main-text)', lineHeight: 1.5 }}>
              This replaces the alert settings on your other budgets with these settings.
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
            {/* 1. Alert me at: Percentages */}
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
                Alert me at: (% of budget used)
              </label>

              {/* Quick choices */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {QUICK_PERCENTAGES.map((pct) => {
                  const isSel = thresholds.includes(pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => toggleThreshold(pct)}
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

              {/* Custom Number Input */}
              <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Custom % (1-150)"
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

              {/* Active Threshold Badges */}
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {thresholds.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                    No percentage selected. Choose at least one or add a custom percentage.
                  </span>
                ) : (
                  thresholds.map((pct) => (
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
                        onClick={() => removeThreshold(pct)}
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

            {/* 2. How to be told: Switches */}
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
                      Helpful email advisory when thresholds are reached
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

            {/* 3. Preview line or Gentle note */}
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
                <span>You won't be notified about this budget.</span>
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

            {/* 4. Apply to all checkbox */}
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
                id="applyToAllBudgets"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label
                htmlFor="applyToAllBudgets"
                style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', userSelect: 'none' }}
              >
                Apply these settings to all my budgets
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
