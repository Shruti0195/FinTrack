import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Sparkles, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchChecklistStatus, dismissChecklist, type ChecklistStatus } from '../api/help';

export interface GettingStartedChecklistProps {
  onNavigateTab: (tab: string) => void;
  style?: React.CSSProperties;
  onDismissed?: () => void;
}

export const GettingStartedChecklist: React.FC<GettingStartedChecklistProps> = ({
  onNavigateTab,
  style,
  onDismissed,
}) => {
  const [checklist, setChecklist] = useState<ChecklistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChecklistStatus();
      setChecklist(data);
    } catch {
      setError('Failed to load checklist. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, []);

  const handleDismiss = async () => {
    try {
      setDismissing(true);
      await dismissChecklist();
      setChecklist(prev => (prev ? { ...prev, is_dismissed: true } : null));
      if (onDismissed) onDismissed();
    } catch {
      // Fallback optimistic dismiss
      setChecklist(prev => (prev ? { ...prev, is_dismissed: true } : null));
      if (onDismissed) onDismissed();
    } finally {
      setDismissing(false);
    }
  };

  if (!loading && (!checklist || checklist.is_dismissed)) {
    return null;
  }

  const steps = [
    {
      id: 'income',
      title: 'Add your first income',
      desc: 'Record a salary, freelance gig, or any incoming funds.',
      isDone: checklist?.has_income ?? false,
      tab: 'income',
      btnText: 'Add income'
    },
    {
      id: 'expense',
      title: 'Add your first expense',
      desc: 'Track a coffee, bill, grocery, or any day-to-day outflow.',
      isDone: checklist?.has_expense ?? false,
      tab: 'expenses',
      btnText: 'Add expense'
    },
    {
      id: 'budget',
      title: 'Set a budget',
      desc: 'Set category spending limits to keep your expenses in check.',
      isDone: checklist?.has_budget ?? false,
      tab: 'budgets',
      btnText: 'Go to Budgets'
    },
    {
      id: 'goal',
      title: 'Create a goal',
      desc: 'Define a savings milestone to build discipline and momentum.',
      isDone: checklist?.has_goal ?? false,
      tab: 'goals',
      btnText: 'Go to Goals'
    },
    {
      id: 'analytics',
      title: 'Look at Analytics',
      desc: 'Inspect your Financial Health Score, savings rate, and mix.',
      isDone: checklist?.has_viewed_analytics ?? false,
      tab: 'analytics',
      btnText: 'Go to Analytics'
    }
  ];

  const completedCount = checklist?.completed_count ?? 0;
  const isAllDone = checklist?.all_completed ?? false;

  return (
    <section
      className="card-box"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px',
        ...style
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px' }}>
            Getting started checklist
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
            {loading ? <span>Checking your progress...</span> : <span>{completedCount} of 5 done</span>}
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '160px',
            height: '8px',
            backgroundColor: 'var(--card-subtle)',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(completedCount / 5) * 100}%`,
              backgroundColor: 'var(--accent)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '18px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13px' }}>
          Loading your setup checklist...
        </div>
      ) : error ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: 'var(--card-subtle)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '13px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button
            onClick={loadChecklist}
            className="btn-outline"
            style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <>
          {/* All Completed Banner */}
          {isAllDone && (
            <div
              style={{
                backgroundColor: 'var(--light-accent)',
                border: '1px solid var(--accent)',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="var(--accent)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                    All 5 steps completed!
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)' }}>
                    You're all set up to manage your finances with FinTrack.
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                disabled={dismissing}
                className="btn-primary"
                style={{
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer',
                  backgroundColor: 'var(--accent)',
                  color: '#FFFFFF'
                }}
              >
                {dismissing ? 'Dismissing...' : 'Dismiss'}
              </button>
            </div>
          )}

          {/* Steps List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {steps.map(step => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: step.isDone ? 'var(--card-subtle)' : 'var(--card)',
                  border: '1px solid var(--border)',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {step.isDone ? (
                    <CheckCircle2 size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                  ) : (
                    <Circle size={18} color="var(--secondary-text)" style={{ flexShrink: 0 }} />
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: step.isDone ? 'var(--secondary-text)' : 'var(--primary)',
                        textDecoration: step.isDone ? 'line-through' : 'none'
                      }}
                    >
                      {step.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>{step.desc}</div>
                  </div>
                </div>

                <div>
                  {step.isDone ? (
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        backgroundColor: 'var(--light-accent)',
                        padding: '3px 9px',
                        borderRadius: '12px'
                      }}
                    >
                      Done
                    </span>
                  ) : (
                    <button
                      onClick={() => onNavigateTab(step.tab)}
                      className="btn-outline"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-btn)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{step.btnText}</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
