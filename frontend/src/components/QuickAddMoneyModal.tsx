import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { addGoalContribution, type Goal } from '../api/goals';

export interface QuickAddMoneyModalProps {
  goal: Goal | null;
  onClose: () => void;
  onSuccess: (amount: number, updatedGoal: Goal) => void;
}

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

export const QuickAddMoneyModal: React.FC<QuickAddMoneyModalProps> = ({
  goal,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goal) {
      setAmount('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [goal]);

  if (!goal) return null;

  const isCompleted = goal.status === 'completed' || goal.remaining_amount <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCompleted) {
      setError('This goal is already fully achieved!');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid contribution amount greater than ₹0.');
      return;
    }

    if (amt > goal.remaining_amount) {
      setError(`Cannot add ${formatINR(amt)}. Remaining amount to reach target is ${formatINR(goal.remaining_amount)}.`);
      return;
    }

    setSubmitting(true);
    try {
      const updatedGoal = await addGoalContribution(goal.id, {
        amount: amt,
        note: note.trim() || undefined,
        contributed_at: date || undefined
      });
      onSuccess(amt, updatedGoal);
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Failed to record contribution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-money-modal-title"
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--card-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--light-accent)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
            </span>
            <h3 id="add-money-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              Add Money to {goal.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary-text)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Goal summary pill */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--card-subtle)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12.5px'
          }}
        >
          <span style={{ color: 'var(--secondary-text)' }}>
            Saved: <b style={{ color: 'var(--primary)' }}>{formatINR(goal.saved_amount)}</b> of {formatINR(goal.target_amount)}
          </span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Remaining: {formatINR(goal.remaining_amount)}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div
              style={{
                backgroundColor: 'var(--light-danger)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Amount */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
              Contribution Amount (₹) *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--secondary-text)' }}>
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="1"
                max={goal.remaining_amount}
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '28px', height: '42px', fontSize: '16px', fontWeight: 700, width: '100%' }}
                required
                autoFocus
                disabled={isCompleted}
              />
            </div>
          </div>

          {/* Note */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
              Note <span style={{ fontWeight: 400, color: 'var(--secondary-text)' }}>(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bonus, Monthly savings"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field"
              style={{ height: '38px', fontSize: '13px', width: '100%' }}
              disabled={isCompleted}
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              style={{ height: '38px', fontSize: '13px', width: '100%' }}
              disabled={isCompleted}
              required
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isCompleted}
              className="btn-primary"
              style={{ height: '38px', padding: '0 20px', fontSize: '13px', fontWeight: 600 }}
            >
              {submitting ? 'Saving...' : 'Add Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
