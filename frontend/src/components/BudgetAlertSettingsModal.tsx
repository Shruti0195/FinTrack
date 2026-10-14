import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Plus, Info } from 'lucide-react';
import { getBudgetAlertSettings, updateBudgetAlertSettings } from '../api/budgets';

export function formatBudgetAlertPreview(thresholds: number[], inApp: boolean, email: boolean, isPerBudget = false): string {
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

interface BudgetAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const QUICK_PERCENTAGES = [50, 75, 80, 90, 100];

export const BudgetAlertSettingsModal: React.FC<BudgetAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [thresholds, setThresholds] = useState<number[]>([80, 100]);
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
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleThreshold = (pct: number) => {
    setCustomError('');
    if (thresholds.includes(pct)) {
      setThresholds(thresholds.filter((t) => t !== pct));
    } else {
      if (thresholds.length >= 5) {
        setCustomError('You can set up to 5 alert thresholds.');
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
      setCustomError('Please enter a number between 1 and 150.');
      return;
    }
    if (thresholds.includes(val)) {
      setCustomError(`${val}% is already added.`);
      return;
    }
    if (thresholds.length >= 5) {
      setCustomError('You can set up to 5 alert thresholds.');
      return;
    }
    setThresholds([...thresholds, val].sort((a, b) => a - b));
    setCustomInput('');
  };

  const handleRemoveThreshold = (pct: number) => {
    setThresholds(thresholds.filter((t) => t !== pct));
  };

  const handleSave = async () => {
    setSaving(true);
    setCustomError('');
    try {
      await updateBudgetAlertSettings({
        thresholds: thresholds.length > 0 ? thresholds : [80, 100],
        in_app: inApp,
        email: email
      });
      setSuccessMsg('Budget alert settings saved successfully!');
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setCustomError(err.response?.data?.detail || 'Failed to save alert settings.');
    } finally {
      setSaving(false);
    }
  };

  const isBothOff = !inApp && !email;
  const previewText = formatBudgetAlertPreview(thresholds, inApp, email, false);

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
        maxWidth: '480px',
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
                Budget Alert Settings
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--secondary-text)', margin: 0 }}>
                Default settings applied to all your budgets
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
            Loading alert settings...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

            {/* 1. Alert me at (Percentages) */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                Alert me at (% of budget used)
              </label>

              {/* Quick choices */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {QUICK_PERCENTAGES.map((pct) => {
                  const isSelected = thresholds.includes(pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => toggleThreshold(pct)}
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
                      {pct}%
                    </button>
                  );
                })}
              </div>

              {/* Custom percentage input */}
              <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="number"
                  min="1"
                  max="150"
                  placeholder="Custom number (1-150)"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="input-field"
                  style={{ height: '38px', fontSize: '13px', flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={!customInput || thresholds.length >= 5}
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

              {/* Selected Thresholds Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Selected (up to 5):</span>
                {thresholds.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--danger)', fontStyle: 'italic' }}>None selected</span>
                ) : (
                  thresholds.map((pct) => (
                    <span
                      key={pct}
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
                      {pct}%
                      <button
                        type="button"
                        onClick={() => handleRemoveThreshold(pct)}
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

            {/* 2. How to be told (Switches) */}
            <div>
              <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '10px' }}>
                How to be told
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* In-app switch */}
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
                      Bell badge and notification tray alert
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

                {/* Email switch */}
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
                      Helpful email advisory when thresholds are reached
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

            {/* 3. Preview line or Gentle note */}
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
                <span>You won't be notified about budgets.</span>
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
