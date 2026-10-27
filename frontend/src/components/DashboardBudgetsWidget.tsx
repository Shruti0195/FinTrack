import React, { useEffect, useState, useCallback } from 'react';
import { ChevronRight, AlertCircle, RefreshCw, PlusCircle, PieChart } from 'lucide-react';
import { getBudgets, type Budget } from '../api/budgets';

export interface DashboardBudgetsWidgetProps {
  periodType: 'monthly' | 'quarterly' | 'half_year' | 'yearly';
  selectedYear: number;
  selectedMonth: number;
  onNavigateTab: (tab: string) => void;
  onBudgetsLoaded?: (budgets: Budget[]) => void;
  refreshTrigger?: number;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

export const DashboardBudgetsWidget: React.FC<DashboardBudgetsWidgetProps> = ({
  periodType,
  selectedYear,
  selectedMonth,
  onNavigateTab,
  onBudgetsLoaded,
  refreshTrigger,
}) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine query month & year
  const isMonthly = periodType === 'monthly';
  const now = new Date();
  const queryMonth = isMonthly ? selectedMonth : now.getMonth() + 1;
  const queryYear = isMonthly ? selectedYear : now.getFullYear();

  const title = isMonthly
    ? `Budgets (${MONTH_NAMES[queryMonth]})`
    : 'Budgets, this month';

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBudgets({
        month: queryMonth,
        year: queryYear,
      });
      const list = Array.isArray(data) ? data : [];
      setBudgets(list);
      if (onBudgetsLoaded) {
        onBudgetsLoaded(list);
      }
    } catch {
      setError('Failed to load budgets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [queryMonth, queryYear, onBudgetsLoaded]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets, refreshTrigger]);

  // Sort most urgent first: highest percentage_used descending
  const urgentBudgets = [...budgets]
    .sort((a, b) => (b.percentage_used || 0) - (a.percentage_used || 0))
    .slice(0, 4);

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
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>{title}</div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
            Closest to limit · Most urgent first
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('budgets')}
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
          <span>View all budgets</span>
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
              onClick={loadBudgets}
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
        ) : urgentBudgets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--secondary-text)' }}>
            <PieChart size={32} style={{ opacity: 0.35, margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
              No budgets yet
            </div>
            <p style={{ fontSize: '12px', margin: '0 0 14px', color: 'var(--secondary-text)' }}>
              Set category limits to keep your expenses in check.
            </p>
            <button
              onClick={() => onNavigateTab('budgets')}
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
              <span>Set a budget</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {urgentBudgets.map(b => {
              const pct = Math.round(b.percentage_used || 0);
              const isOver = pct >= 100 || b.status === 'exceeded';
              const isApproaching = pct >= 80 && pct < 100;
              const statusColor = isOver ? 'var(--danger)' : isApproaching ? 'var(--warning)' : 'var(--accent)';
              const statusLabel = isOver ? 'Over budget' : isApproaching ? 'Approaching' : 'On track';

              return (
                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>
                        {b.category_name}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: isOver ? 'var(--light-danger)' : isApproaching ? 'rgba(245, 158, 11, 0.12)' : 'var(--light-accent)',
                          color: statusColor
                        }}
                      >
                        {statusLabel} ({pct}%)
                      </span>
                    </div>

                    <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)' }}>
                      <b style={{ color: isOver ? 'var(--danger)' : 'var(--primary)' }}>{formatINR(b.spent_amount)}</b>
                      {' / '}
                      {formatINR(b.limit_amount)}
                    </span>
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
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                        backgroundColor: statusColor,
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
      {!loading && !error && urgentBudgets.length > 0 && (
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
            Showing top {urgentBudgets.length} of {budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {budgets.filter(b => (b.percentage_used || 0) >= 100).length > 0
              ? `${budgets.filter(b => (b.percentage_used || 0) >= 100).length} exceeded`
              : 'All within limit'}
          </span>
        </div>
      )}
    </div>
  );
};
