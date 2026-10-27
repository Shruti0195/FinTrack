import React, { useEffect, useState, useCallback } from 'react';
import { ChevronRight, AlertCircle, RefreshCw, PlusCircle, Target, Plus } from 'lucide-react';
import { getGoals, type Goal } from '../api/goals';
import { GoalsInfoTooltip } from './GoalsInfoTooltip';

export interface DashboardGoalsWidgetProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddMoney: (goal: Goal) => void;
  onGoalsLoaded?: (goals: Goal[]) => void;
  refreshTrigger?: number;
}

const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const formatTimeLeft = (days?: number | null, deadlineStr?: string | null): { text: string; isUrgent: boolean } => {
  if (!deadlineStr || days === null || days === undefined) {
    return { text: 'No deadline', isUrgent: false };
  }
  if (days < 0) {
    return { text: 'Deadline passed', isUrgent: true };
  }
  if (days === 0) {
    return { text: 'Due today', isUrgent: true };
  }
  if (days === 1) {
    return { text: '1 day left', isUrgent: true };
  }
  if (days <= 7) {
    return { text: `${days} days left`, isUrgent: true };
  }
  if (days <= 30) {
    return { text: `${days} days left`, isUrgent: false };
  }
  const months = Math.round(days / 30);
  return { text: `${months} ${months === 1 ? 'month' : 'months'} left`, isUrgent: false };
};

export const DashboardGoalsWidget: React.FC<DashboardGoalsWidgetProps> = ({
  onNavigateTab,
  onOpenAddMoney,
  onGoalsLoaded,
  refreshTrigger,
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGoals('active');
      const list = Array.isArray(data) ? data : [];
      setGoals(list);
      if (onGoalsLoaded) {
        onGoalsLoaded(list);
      }
    } catch {
      setError('Failed to load goals. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onGoalsLoaded]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals, refreshTrigger]);

  // Sort active goals with nearest deadline first:
  // 1) Goals with deadline, ascending by days_remaining
  // 2) Goals without deadline
  const sortedGoals = [...goals]
    .filter(g => g.status === 'active')
    .sort((a, b) => {
      const hasA = a.deadline !== null && a.deadline !== undefined;
      const hasB = b.deadline !== null && b.deadline !== undefined;
      if (hasA && hasB) {
        return (a.days_remaining ?? 99999) - (b.days_remaining ?? 99999);
      }
      if (hasA) return -1;
      if (hasB) return 1;
      return 0;
    })
    .slice(0, 3);

  return (
    <div
      className="card-box"
      style={{
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '340px',
        height: '100%'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>Savings Goals</span>
            <GoalsInfoTooltip size={14} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
            Active goals · Nearest deadline first
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('goals')}
          style={{
            fontSize: '12.5px',
            color: 'var(--accent)',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: 0
          }}
        >
          <span>View all goals</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px 0' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', height: '14px', backgroundColor: 'var(--card-subtle)', borderRadius: '4px' }} />
                <div style={{ height: '6px', backgroundColor: 'var(--card-subtle)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={loadGoals}
              className="btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                borderRadius: 'var(--radius-btn)',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        ) : sortedGoals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--secondary-text)' }}>
            <Target size={32} style={{ opacity: 0.35, margin: '0 auto 10px', display: 'block', color: 'var(--accent)' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
              No goals yet
            </div>
            <p style={{ fontSize: '12px', margin: '0 0 14px', color: 'var(--secondary-text)' }}>
              Create a savings target to build discipline and momentum.
            </p>
            <button
              onClick={() => onNavigateTab('goals')}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                borderRadius: 'var(--radius-btn)'
              }}
            >
              <PlusCircle size={14} />
              <span>Create a goal</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sortedGoals.map(goal => {
              const pct = Math.min(100, Math.round(goal.percentage || 0));
              const timeLeft = formatTimeLeft(goal.days_remaining, goal.deadline);
              const isCompleted = goal.status === 'completed' || (goal.remaining_amount <= 0);

              return (
                <div key={goal.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Title & Saved info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>
                        {goal.title}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: timeLeft.isUrgent ? 'var(--danger)' : 'var(--secondary-text)',
                          fontWeight: timeLeft.isUrgent ? 600 : 400
                        }}
                      >
                        · {timeLeft.text}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                        <b style={{ color: 'var(--accent)' }}>{formatINR(goal.saved_amount)}</b>
                        {' of '}
                        {formatINR(goal.target_amount)}
                      </span>

                      {/* Small Add Money Button */}
                      <button
                        onClick={() => onOpenAddMoney(goal)}
                        disabled={isCompleted}
                        title={isCompleted ? 'Goal already completed' : 'Add money to goal'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--card-subtle)',
                          color: 'var(--accent)',
                          cursor: isCompleted ? 'not-allowed' : 'pointer',
                          opacity: isCompleted ? 0.5 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Plus size={11} strokeWidth={2.5} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: '7px',
                      backgroundColor: 'var(--border)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: goal.color || 'var(--accent)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer count indicator */}
      {!loading && !error && sortedGoals.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border)',
            fontSize: '11.5px',
            color: 'var(--secondary-text)'
          }}
        >
          <span>
            Showing {sortedGoals.length} of {goals.length} active {goals.length === 1 ? 'goal' : 'goals'}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
            Keep saving!
          </span>
        </div>
      )}
    </div>
  );
};
