import React, { useState } from 'react';
import { BellOff, X } from 'lucide-react';

interface PauseAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (duration: '1_day' | '1_week' | '1_month' | 'indefinite') => Promise<void>;
  type: 'budget' | 'goal';
}

const DURATION_OPTIONS: { id: '1_day' | '1_week' | '1_month' | 'indefinite'; label: string; desc: string }[] = [
  { id: '1_day', label: '1 day', desc: 'Resume automatically tomorrow' },
  { id: '1_week', label: '1 week', desc: 'Resume automatically next week' },
  { id: '1_month', label: '1 month', desc: 'Resume in 30 days' },
  { id: 'indefinite', label: 'Until I turn it back on', desc: 'Stay paused until manually resumed' },
];

export const PauseAlertsModal: React.FC<PauseAlertsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<'1_day' | '1_week' | '1_month' | 'indefinite'>('1_day');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handlePause = async () => {
    try {
      setSaving(true);
      await onConfirm(selectedDuration);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const titleText = type === 'budget' ? 'Pause budget alerts' : 'Pause goal alerts';
  const subtitleText =
    type === 'budget'
      ? 'Alerts will not be sent while paused. Any budget thresholds reached during this time will not send notifications now or after resuming.'
      : 'Alerts will not be sent while paused. Any goal milestones reached during this time will not send notifications now or after resuming.';

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
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
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
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BellOff size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--primary)' }}>
                {titleText}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
                Choose how long to pause alerts
              </p>
            </div>
          </div>
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

        {/* Friendly explanation */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--card-subtle)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--main-text)',
          }}
        >
          {subtitleText}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DURATION_OPTIONS.map((opt) => {
            const isSelected = selectedDuration === opt.id;
            return (
              <label
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--card-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="radio"
                    name="pauseDuration"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => setSelectedDuration(opt.id)}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Action Buttons */}
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
            onClick={handlePause}
            disabled={saving}
            className="btn btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
          >
            {saving ? 'Pausing...' : 'Pause Alerts'}
          </button>
        </div>
      </div>
    </div>
  );
};
