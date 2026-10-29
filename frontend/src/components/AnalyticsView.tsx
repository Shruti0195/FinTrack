import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Info,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';
import {
  fetchAnalyticsOverview,
  downloadAnalyticsPdfReport,
  type AnalyticsOverviewResponse,
  type FinancialHealthScoreData
} from '../api/analytics';
import { PeriodCapsule } from './PeriodCapsule';
import { GoalsInfoTooltip } from './GoalsInfoTooltip';
import { useTour } from '../tour';
import { analyticsTourSteps } from '../tour/tourRegistry';
import { SampleDataBadge } from '../tour/sampleData';

interface AnalyticsViewProps {
  periodType: 'monthly' | 'quarterly' | 'half_year' | 'yearly';
  selectedYear: number;
  selectedMonth: number;
  selectedQuarter: number;
  selectedHalf: number;
  periodLabel?: string;
  onNavigateTab: (tab: string) => void;
}

// Indian Rupee currency formatter
const formatINR = (val: number, compact: boolean = false): string => {
  if (compact) {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 10000000) return `${sign}₹${(absVal / 10000000).toFixed(1)}Cr`;
    if (absVal >= 100000) return `${sign}₹${(absVal / 100000).toFixed(1)}L`;
    if (absVal >= 1000) return `${sign}₹${Math.round(absVal / 1000)}k`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

// Single Concise Information Popover Component
interface FinancialHealthInfoPopoverProps {
  healthScore?: FinancialHealthScoreData;
}

const FinancialHealthInfoPopover: React.FC<FinancialHealthInfoPopoverProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-label="How Financial Health Score is calculated"
        title="View score breakdown"
        style={{
          border: 'none',
          background: 'var(--card-subtle)',
          padding: '4px',
          cursor: 'pointer',
          color: 'var(--secondary-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
        data-tour="analytics-health-info-icon"
        className="info-icon-btn"
      >
        <Info size={15} />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            width: '280px',
            maxWidth: 'calc(100vw - 40px)',
            backgroundColor: 'var(--card)',
            color: 'var(--main-text)',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.25), 0 8px 12px -6px rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--border)',
            zIndex: 100,
            fontSize: '12px',
            lineHeight: 1.45,
            pointerEvents: 'auto'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)', marginBottom: '4px' }}>
            How Score is Calculated
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--secondary-text)' }}>
            Calculated across four key factors (100 pts total):
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>Savings Rate</div>
                <div style={{ fontSize: '11px', color: 'var(--secondary-text)', lineHeight: 1.3 }}>Saving 30%+ of income earns full points</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--accent)', flexShrink: 0 }}>35 pts</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>Budget Adherence</div>
                <div style={{ fontSize: '11px', color: 'var(--secondary-text)', lineHeight: 1.3 }}>Staying within set budget limits</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--accent)', flexShrink: 0 }}>30 pts</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>Expense Stability</div>
                <div style={{ fontSize: '11px', color: 'var(--secondary-text)', lineHeight: 1.3 }}>Spending increase &le; 10% vs prior 3-month avg</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--accent)', flexShrink: 0 }}>20 pts</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>Essential vs Lifestyle</div>
                <div style={{ fontSize: '11px', color: 'var(--secondary-text)', lineHeight: 1.3 }}>Keeping lifestyle spending &le; 30%</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--accent)', flexShrink: 0 }}>15 pts</span>
            </div>
          </div>

          <div
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)',
              fontSize: '10.5px',
              color: 'var(--secondary-text)',
              lineHeight: 1.35
            }}
          >
            Factors without data are left out and the score is scaled to 100.
          </div>
        </div>
      )}
    </div>
  );
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  periodType,
  selectedYear,
  selectedMonth,
  selectedQuarter,
  selectedHalf,
  periodLabel,
  onNavigateTab
}) => {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mixTab, setMixTab] = useState<'categories' | 'single_expenses'>('categories');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { registerPageSteps, isTourActive } = useTour();

  useEffect(() => {
    registerPageSteps('analytics', analyticsTourSteps);
  }, [registerPageSteps]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = {
      period_type: periodType,
      year: selectedYear
    };
    if (periodType === 'monthly') params.month = selectedMonth;
    if (periodType === 'quarterly') params.quarter = selectedQuarter;
    if (periodType === 'half_year') params.half = selectedHalf;

    fetchAnalyticsOverview(params as any)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
        setError(err.response?.data?.detail || 'Failed to load analytics data. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [periodType, selectedYear, selectedMonth, selectedQuarter, selectedHalf]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleSampleDataChange = () => {
      loadData();
    };
    window.addEventListener('fintrack:sample-data-changed', handleSampleDataChange);
    return () => {
      window.removeEventListener('fintrack:sample-data-changed', handleSampleDataChange);
    };
  }, [loadData]);

  // PDF Report Download Handler
  const handleDownloadReport = async () => {
    if (isDownloading) return;
    if (isTourActive || (typeof document !== 'undefined' && document.body.classList.contains('tour-active-sample'))) {
      setDownloadError('PDF report download is disabled during the guided tour.');
      return;
    }
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const params: Record<string, string | number> = {
        period_type: periodType,
        year: selectedYear,
      };
      if (periodType === 'monthly') params.month = selectedMonth;
      if (periodType === 'quarterly') params.quarter = selectedQuarter;
      if (periodType === 'half_year') params.half = selectedHalf;

      const { blob, filename } = await downloadAnalyticsPdfReport(params as any);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Failed to download report:', err);
      let message = 'Failed to prepare your report. Please retry.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.detail) message = parsed.detail;
        } catch {
          // Keep default message if text parsing fails
        }
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.message) {
        message = err.message;
      }
      setDownloadError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Skeleton Card */}
          <div
            className="card-box"
            style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--secondary-text)' }}>
              <RefreshCw size={20} className="animate-spin" />
              <span>Analyzing financial trends and calculating health score...</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="card-box" style={{ height: '240px' }} />
            <div className="card-box" style={{ height: '240px' }} />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px', width: '100%' }}>
        <div
          className="card-box"
          style={{
            padding: '36px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            borderColor: 'var(--danger)'
          }}
        >
          <AlertCircle size={36} color="var(--danger)" />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Unable to load Analytics
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--secondary-text)', maxWidth: '460px', margin: 0 }}>
            {error || 'Something went wrong while retrieving financial analytics.'}
          </p>
          <button
            onClick={loadData}
            className="btn-primary"
            style={{
              marginTop: '8px',
              padding: '8px 18px',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Empty / Insufficient Data State
  if (!data.has_enough_data) {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px', width: '100%' }}>
        <div
          className="card-box"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--light-accent)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px'
            }}
          >
            <Sparkles size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Ready to track your Financial Health
          </h2>
          <p
            style={{
              fontSize: '14.5px',
              color: 'var(--secondary-text)',
              maxWidth: '520px',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            Add a few more weeks of entries to see your score. FinTrack requires at least 10 entries across 2 different weeks to calculate your Financial Health Score and analytics.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={() => onNavigateTab('income')}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={16} />
              <span>Add Income</span>
            </button>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="btn-outline"
              style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Receipt size={16} />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { health_score, trends, expense_mix, top_5_categories, top_5_expenses, comparison } = data;
  const scoreVal = health_score.score ?? 0;

  // Circular gauge calculations
  const circleRadius = 42;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeOffset = circumference - (circumference * scoreVal) / 100;

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '28px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {/* Page Title & Subtitle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div data-tour="analytics-header-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  letterSpacing: '-0.02em',
                  margin: 0
                }}
              >
                Financial Analytics
              </h1>
              <SampleDataBadge section="analytics" />
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginTop: '4px', margin: 0 }}>
              Category allocations, period performance, and Financial Health Score for {data.period_label}.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <PeriodCapsule
                periodType={periodType}
                periodLabel={data.period_label || periodLabel || ''}
              />

              {(() => {
                const totalIncomeVal = data.comparison?.find(c => c.key === 'income')?.current_value || 0;
                const totalExpensesVal = data.comparison?.find(c => c.key === 'expenses')?.current_value || 0;
                const hasEntriesInPeriod = totalIncomeVal > 0 || totalExpensesVal > 0;

                return (
                  <button
                    data-tour="analytics-download-report-btn"
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={isDownloading || !hasEntriesInPeriod}
                    title={!hasEntriesInPeriod ? "Add entries for this period to download a report." : "Download PDF financial report"}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '8px 14px',
                      borderRadius: '8px',
                      cursor: !hasEntriesInPeriod || isDownloading ? 'not-allowed' : 'pointer',
                      opacity: !hasEntriesInPeriod ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      height: '38px',
                      backgroundColor: !hasEntriesInPeriod ? 'var(--card-subtle)' : 'var(--card)',
                      color: !hasEntriesInPeriod ? 'var(--secondary-text)' : 'var(--primary)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (hasEntriesInPeriod && !isDownloading) {
                        e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasEntriesInPeriod && !isDownloading) {
                        e.currentTarget.style.backgroundColor = 'var(--card)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }
                    }}
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" style={{ color: 'var(--accent)' }} />
                        <span>Preparing your report...</span>
                      </>
                    ) : (
                      <>
                        <Download size={15} style={{ color: 'var(--accent)' }} />
                        <span>Download report (PDF)</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </div>

            {(() => {
              const totalIncomeVal = data.comparison?.find(c => c.key === 'income')?.current_value || 0;
              const totalExpensesVal = data.comparison?.find(c => c.key === 'expenses')?.current_value || 0;
              const hasEntriesInPeriod = totalIncomeVal > 0 || totalExpensesVal > 0;
              if (!hasEntriesInPeriod) {
                return (
                  <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                    Add entries for this period to download a report.
                  </span>
                );
              }
              return null;
            })()}

            {downloadError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--danger)',
                  marginTop: '2px',
                }}
              >
                <AlertCircle size={13} />
                <span>{downloadError}</span>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: 0
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. FINANCIAL HEALTH SCORE (Focused, Concise & Non-Cluttered) */}
      {/* ========================================================= */}
      <section data-tour="analytics-health-score" className="card-box" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Row: Circular Score Meter + Status + Title + Single (i) Info Symbol */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
              
              {/* Circular Meter */}
              <div style={{ position: 'relative', width: '104px', height: '104px', flexShrink: 0 }}>
                <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="52"
                    cy="52"
                    r={circleRadius}
                    fill="transparent"
                    stroke="var(--border)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="52"
                    cy="52"
                    r={circleRadius}
                    fill="transparent"
                    stroke={health_score.status_color}
                    strokeWidth="9"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                    {health_score.score !== null ? health_score.score : '--'}
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--secondary-text)', fontWeight: 600, marginTop: '2px' }}>
                    out of 100
                  </span>
                </div>
              </div>

              {/* Status Pill, Title & the Single (i) Symbol */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: `${health_score.status_color}18`,
                      color: health_score.status_color,
                      border: `1px solid ${health_score.status_color}40`,
                      display: 'inline-block'
                    }}
                  >
                    {health_score.status_label}
                  </span>
                  <SampleDataBadge section="analytics-health" />

                  {/* ONLY ONE Info Symbol with Concise Breakdown */}
                  <FinancialHealthInfoPopover healthScore={health_score} />
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px 0' }}>
                  Financial Health Score
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--secondary-text)', margin: 0, lineHeight: 1.4 }}>
                  {health_score.missing_factor_note || 'Calculated from your verified income, budgets, and expenses.'}
                </p>
              </div>
            </div>

            {/* Subtle takeaway pill if available */}
            {trends.savings_takeaway && (
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  fontSize: '12.5px',
                  color: 'var(--secondary-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent)',
                    flexShrink: 0
                  }}
                />
                <span>{trends.savings_takeaway}</span>
              </div>
            )}
          </div>

          {/* 2 to 3 Short Plain-Language Notes Under Score */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '10px'
            }}
          >
            {health_score.score_notes.map((note, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: 'var(--primary)',
                  padding: '10px 14px',
                  backgroundColor: 'var(--card-subtle)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}
              >
                <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span>{note}</span>
              </div>
            ))}
          </div>

          {/* Gentle Improvement Recommendation */}
          <div
            style={{
              backgroundColor: 'var(--light-accent)',
              border: '1px solid var(--accent)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--accent)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Sparkles size={17} style={{ flexShrink: 0 }} />
            <span>{health_score.improvement_line}</span>
          </div>

          {/* Four Factors & Points Breakdown */}
          <div
            data-tour="analytics-health-factors"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px'
            }}
          >
            {health_score.factors && health_score.factors.length > 0 ? (
              health_score.factors.map((factor, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-subtle)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)' }}>
                      {factor.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                      Max {factor.max_points} pts
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                    {factor.earned_points} / {factor.max_points} pts
                  </div>
                </div>
              ))
            ) : (
              [
                { name: 'Savings Rate', pts: '35 pts max' },
                { name: 'Budget Adherence', pts: '30 pts max' },
                { name: 'Expense Stability', pts: '20 pts max' },
                { name: 'Essential vs Lifestyle', pts: '15 pts max' }
              ].map((factor, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-subtle)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)' }}>{factor.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>{factor.pts}</span>
                </div>
              ))
            )}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. SPENDING & SAVING TRENDS */}
      {/* ========================================================= */}
      <section data-tour="analytics-trends-chart" className="card-box" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                Spending & Saving Trends
              </h3>
              <SampleDataBadge section="analytics-trends" />
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px', margin: 0 }}>
              Monthly overview of your income, expenses, and net savings over time.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10B981' }} />
              <span style={{ color: 'var(--secondary-text)', fontWeight: 500 }}>Income</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#EF4444' }} />
              <span style={{ color: 'var(--secondary-text)', fontWeight: 500 }}>Expenses</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3B82F6' }} />
              <span style={{ color: 'var(--secondary-text)', fontWeight: 500 }}>Savings</span>
            </div>
          </div>
        </div>

        {trends.monthly_trends && trends.monthly_trends.length > 0 ? (
          <div>
            {(() => {
              const maxVal = Math.max(...trends.monthly_trends.map(t => Math.max(t.income, t.expenses, t.savings, 1000)));
              const chartHeight = 180;
              const yBase = 140;
              const maxBarHeight = 100;
              const totalItems = trends.monthly_trends.length;

              return (
                <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                  <svg
                    viewBox={`0 0 ${Math.max(600, totalItems * 95)} ${chartHeight}`}
                    style={{ width: '100%', minWidth: `${Math.max(500, totalItems * 85)}px`, height: '180px', display: 'block' }}
                  >
                    {/* Horizontal Grid lines */}
                    <line x1="45" y1="30" x2="100%" y2="30" stroke="var(--border)" strokeDasharray="3,3" opacity="0.6" />
                    <line x1="45" y1="85" x2="100%" y2="85" stroke="var(--border)" strokeDasharray="3,3" opacity="0.6" />
                    <line x1="45" y1={yBase} x2="100%" y2={yBase} stroke="var(--border)" strokeWidth="1.2" />

                    {/* Y-Axis Value Labels */}
                    <text x="40" y="34" textAnchor="end" fontSize="10.5" fill="var(--secondary-text)">
                      {formatINR(maxVal, true)}
                    </text>
                    <text x="40" y="89" textAnchor="end" fontSize="10.5" fill="var(--secondary-text)">
                      {formatINR(maxVal / 2, true)}
                    </text>
                    <text x="40" y={yBase + 4} textAnchor="end" fontSize="10.5" fill="var(--secondary-text)">
                      ₹0
                    </text>

                    {/* Bars per Month */}
                    {trends.monthly_trends.map((t, idx) => {
                      const startX = 60 + idx * 85;
                      const barW = 16;
                      const gap = 4;

                      const incH = Math.max(4, (t.income / maxVal) * maxBarHeight);
                      const expH = Math.max(4, (t.expenses / maxVal) * maxBarHeight);
                      const savH = Math.max(4, (Math.max(0, t.savings) / maxVal) * maxBarHeight);

                      const incY = yBase - incH;
                      const expY = yBase - expH;
                      const savY = yBase - savH;

                      return (
                        <g key={idx}>
                          {/* Income Bar */}
                          <rect
                            x={startX}
                            y={incY}
                            width={barW}
                            height={incH}
                            rx="3"
                            fill="#10B981"
                          >
                            <title>{`${t.month_name}: Income ${formatINR(t.income)}`}</title>
                          </rect>

                          {/* Expense Bar */}
                          <rect
                            x={startX + barW + gap}
                            y={expY}
                            width={barW}
                            height={expH}
                            rx="3"
                            fill="#EF4444"
                          >
                            <title>{`${t.month_name}: Expenses ${formatINR(t.expenses)}`}</title>
                          </rect>

                          {/* Savings Bar */}
                          <rect
                            x={startX + (barW + gap) * 2}
                            y={savY}
                            width={barW}
                            height={savH}
                            rx="3"
                            fill="#3B82F6"
                          >
                            <title>{`${t.month_name}: Savings ${formatINR(t.savings)} (${t.savings_rate}%)`}</title>
                          </rect>

                          {/* Savings Rate text above group */}
                          <text
                            x={startX + barW + gap + barW / 2}
                            y={Math.min(incY, expY, savY) - 6}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="600"
                            fill="var(--accent)"
                          >
                            {t.savings_rate}%
                          </text>

                          {/* Month Label */}
                          <text
                            x={startX + barW + gap + barW / 2}
                            y={yBase + 18}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="600"
                            fill="var(--secondary-text)"
                          >
                            {t.month_name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13px' }}>
            No monthly trend data recorded yet for this period.
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 3. WHERE THE MONEY GOES */}
      {/* ========================================================= */}
      <section data-tour="analytics-where-money-goes" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
        
        {/* Category Expense Mix */}
        <div className="card-box" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                  Expense Mix by Category
                </h3>
                <SampleDataBadge section="analytics-mix" />
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px', margin: 0 }}>
                Breakdown of where your money was spent across categories in this period.
              </p>
            </div>
            <PieChart size={18} color="var(--accent)" />
          </div>

          {expense_mix.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13px' }}>
              No expense categories recorded for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Segmented Horizontal Bar */}
              <div
                style={{
                  height: '14px',
                  width: '100%',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  display: 'flex',
                  backgroundColor: 'var(--border)'
                }}
              >
                {expense_mix.map((cat, i) => (
                  <div
                    key={i}
                    title={`${cat.category_name}: ${cat.percentage}% (${formatINR(cat.amount)})`}
                    style={{
                      width: `${cat.percentage}%`,
                      height: '100%',
                      backgroundColor: cat.color,
                      transition: 'width 0.3s ease'
                    }}
                  />
                ))}
              </div>

              {/* Category List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {expense_mix.map((cat, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--card-subtle)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: cat.color,
                          flexShrink: 0
                        }}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--primary)',
                          maxWidth: '90px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {cat.category_name}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatINR(cat.amount)}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--secondary-text)' }}>
                        {cat.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top 5 Categories & Top 5 Single Expenses */}
        <div className="card-box" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              Top Outflows
            </h3>
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: 'var(--card-subtle)',
                padding: '3px',
                borderRadius: '8px'
              }}
            >
              <button
                onClick={() => setMixTab('categories')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: mixTab === 'categories' ? 'var(--card)' : 'transparent',
                  color: mixTab === 'categories' ? 'var(--primary)' : 'var(--secondary-text)',
                  boxShadow: mixTab === 'categories' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Top 5 Categories
              </button>
              <button
                onClick={() => setMixTab('single_expenses')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: mixTab === 'single_expenses' ? 'var(--card)' : 'transparent',
                  color: mixTab === 'single_expenses' ? 'var(--primary)' : 'var(--secondary-text)',
                  boxShadow: mixTab === 'single_expenses' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Top 5 Single Expenses
              </button>
            </div>
          </div>

          {mixTab === 'categories' ? (
            top_5_categories.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13px' }}>
                No category data recorded for this period.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {top_5_categories.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: 'var(--card-subtle)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--border)',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--secondary-text)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                          {c.category_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                          {c.transaction_count} transactions {c.is_essential ? '• Essential' : '• Lifestyle'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatINR(c.amount)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                        {c.percentage}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : top_5_expenses.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13px' }}>
              No single expense entries found for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {top_5_expenses.map((tx, i) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--card-subtle)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--border)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--secondary-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                        {tx.category_name} • {tx.transaction_date}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F59E0B' }}>
                    {formatINR(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>

      {/* ========================================================= */}
      {/* 4. THIS PERIOD VERSUS PREVIOUS PERIOD */}
      {/* ========================================================= */}
      <section data-tour="analytics-comparison" className="card-box" style={{ padding: '22px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              Period-over-Period Performance
            </h3>
            <SampleDataBadge section="analytics-comparison" />
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px', margin: 0 }}>
            Comparing current results directly with the immediate prior period. Green marks positive progress; red highlights areas of caution.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {comparison.map((c, i) => {
            const hasChange = c.change_pct !== 0;
            const isGood = c.is_good;
            const badgeColor = isGood ? 'var(--accent)' : '#EF4444';
            const badgeBg = isGood ? 'var(--light-accent)' : '#EF444415';

            return (
              <div
                key={i}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary-text)' }}>
                      {c.label}
                    </span>
                    {c.key === 'savings' && (
                      <GoalsInfoTooltip size={13} align="left" />
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      backgroundColor: badgeBg,
                      color: badgeColor,
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {c.change_label === 'New' ? null : (c.change_pct ?? 0) > 0 ? (
                      <ArrowUpRight size={13} />
                    ) : (c.change_pct ?? 0) < 0 ? (
                      <ArrowDownRight size={13} />
                    ) : null}
                    <span>{c.change_label}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                    {c.formatted_current}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    Prior: {c.formatted_previous}
                    {hasChange && c.change_label !== 'New' && (
                      <span style={{ marginLeft: '6px', color: badgeColor, fontWeight: 600 }}>
                        ({c.change_amount >= 0 ? '+' : ''}{c.label.includes('Rate') ? `${c.change_amount.toFixed(1)}%` : formatINR(c.change_amount, true)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
