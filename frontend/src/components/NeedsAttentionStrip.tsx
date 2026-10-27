import React from 'react';
import { AlertTriangle, Clock, Calendar, ArrowRight } from 'lucide-react';
import type { Budget } from '../api/budgets';
import type { Goal } from '../api/goals';
import type { DashboardTransactionItem } from './DashboardView';

export interface NeedsAttentionStripProps {
  budgets: Budget[];
  goals: Goal[];
  recentTransactions?: DashboardTransactionItem[];
  onNavigateTab: (tab: string) => void;
  onOpenAddExpense: () => void;
}

interface AttentionItem {
  id: string;
  type: 'budget' | 'goal' | 'inactivity';
  message: string;
  actionText: string;
  onClick: () => void;
  severity: 'danger' | 'warning';
}

export const NeedsAttentionStrip: React.FC<NeedsAttentionStripProps> = ({
  budgets,
  goals,
  recentTransactions,
  onNavigateTab,
  onOpenAddExpense,
}) => {
  const items: AttentionItem[] = [];

  // 1. Check over-limit budgets (sorted by highest percentage over 100%)
  const overBudgets = budgets
    .filter((b) => (b.percentage_used || 0) >= 100 || b.status === 'exceeded')
    .sort((a, b) => (b.percentage_used || 0) - (a.percentage_used || 0));

  for (const b of overBudgets) {
    if (items.length >= 3) break;
    const pct = Math.round(b.percentage_used || 100);
    items.push({
      id: `budget-${b.id || b.category_id}`,
      type: 'budget',
      message: `${b.category_name} budget is over its limit (${pct}% used)`,
      actionText: 'Review budget',
      onClick: () => onNavigateTab('budgets'),
      severity: 'danger',
    });
  }

  // 2. Check urgent goals (deadline in 7 days or less, or passed)
  if (items.length < 3) {
    const urgentGoals = goals
      .filter(
        (g) =>
          g.status === 'active' &&
          g.deadline &&
          g.days_remaining !== null &&
          g.days_remaining !== undefined &&
          g.days_remaining <= 7
      )
      .sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0));

    for (const g of urgentGoals) {
      if (items.length >= 3) break;
      const days = g.days_remaining ?? 0;
      let msg = '';
      if (days < 0) {
        msg = `"${g.title}" goal deadline has passed`;
      } else if (days === 0) {
        msg = `"${g.title}" goal is due today`;
      } else if (days === 1) {
        msg = `"${g.title}" goal deadline is in 1 day`;
      } else {
        msg = `"${g.title}" goal deadline is in ${days} days`;
      }

      items.push({
        id: `goal-${g.id}`,
        type: 'goal',
        message: msg,
        actionText: 'View goal',
        onClick: () => onNavigateTab('goals'),
        severity: days < 0 ? 'danger' : 'warning',
      });
    }
  }

  // 3. Check 7-day inactivity reminder
  if (items.length < 3 && recentTransactions && recentTransactions.length > 0) {
    const latestTx = recentTransactions[0];
    if (latestTx?.transaction_date) {
      const txTime = new Date(latestTx.transaction_date).getTime();
      const nowTime = Date.now();
      const diffDays = Math.floor((nowTime - txTime) / (1000 * 60 * 60 * 24));
      if (diffDays >= 7) {
        items.push({
          id: 'inactivity-reminder',
          type: 'inactivity',
          message: `No income or expenses recorded in the last ${diffDays} days`,
          actionText: 'Add an entry',
          onClick: onOpenAddExpense,
          severity: 'warning',
        });
      }
    }
  }

  // If nothing needs attention, don't show the strip at all
  if (items.length === 0) {
    return null;
  }

  const hasDanger = items.some((it) => it.severity === 'danger');

  return (
    <div
      className="card-box"
      style={{
        padding: '14px 18px',
        marginBottom: '20px',
        borderLeft: `4px solid ${hasDanger ? 'var(--danger)' : '#F59E0B'}`,
        backgroundColor: hasDanger ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)',
      }}
      role="region"
      aria-label="Items needing attention"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <AlertTriangle
          size={16}
          style={{ color: hasDanger ? 'var(--danger)' : '#F59E0B', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Needs Attention
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              {item.type === 'budget' && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--danger)',
                    flexShrink: 0,
                  }}
                />
              )}
              {item.type === 'goal' && (
                <Clock
                  size={13}
                  style={{
                    color: item.severity === 'danger' ? 'var(--danger)' : '#F59E0B',
                    flexShrink: 0,
                  }}
                />
              )}
              {item.type === 'inactivity' && (
                <Calendar size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
              )}
              <span
                style={{
                  color: 'var(--primary)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.message}
              </span>
            </div>

            <button
              onClick={item.onClick}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 6px',
                color: item.severity === 'danger' ? 'var(--danger)' : 'var(--accent)',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <span>{item.actionText}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default NeedsAttentionStrip;
