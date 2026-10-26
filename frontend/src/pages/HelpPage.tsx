import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  XCircle,
  Inbox
} from 'lucide-react';
import { 
  fetchChecklistStatus, 
  dismissChecklist, 
  fetchSupportReports, 
  createSupportReport, 
  type ChecklistStatus, 
  type SupportReportItem, 
  type ReportType 
} from '../api/help';

interface HelpPageProps {
  onNavigateTab: (tab: string) => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  actionButtons?: Array<{
    label: string;
    tab: string;
  }>;
}

const FAQS: FaqItem[] = [
  {
    id: 'health-score',
    question: 'How is my Financial Health Score calculated?',
    answer: "Four factors determine your score: savings rate (35 pts), budget adherence (30 pts), expense stability (20 pts), and essential versus non-essential spending (15 pts). Factors that cannot be calculated yet are omitted and the total is scaled to 100. You can review your detailed score breakdown and insights anytime in Analytics.",
    actionButtons: [
      { label: 'Go to Analytics', tab: 'analytics' }
    ]
  },
  {
    id: 'alerts',
    question: 'How do I change when I get budget or goal alerts?',
    answer: "Budget alerts are set on the Budgets page and goal alerts on the Goals page, under Alert settings. You can pick your percentage thresholds, toggle in-app and email alerts, and set custom overrides for individual budgets or goals.",
    actionButtons: [
      { label: 'Go to Budgets', tab: 'budgets' },
      { label: 'Go to Goals', tab: 'goals' }
    ]
  },
  {
    id: 'period-selector',
    question: 'How do I switch between monthly, quarterly, half-yearly and yearly views?',
    answer: "Use the date selector in the top bar. You can toggle between Monthly, Quarterly, Half-Year, or Yearly views, and select specific months or years to see your historical finances."
  },
  {
    id: 'csv-export',
    question: 'How do I download my income or expense list?',
    answer: "Use the Export CSV button on the Income and Expenses pages. It downloads exactly what you're currently viewing, including all active period selections and category filters."
  },
  {
    id: 'change-password',
    question: 'How do I change my password?',
    answer: "In Settings. Navigate to your Settings page to manage your profile and security credentials.",
    actionButtons: [
      { label: 'Go to Settings', tab: 'settings' }
    ]
  },
  {
    id: 'privacy-data',
    question: 'Who can see my data?',
    answer: "Only you. The people who run FinTrack can see overall counts, such as how many people use the app, but never your entries, budgets or goals."
  }
];

export const HelpPage: React.FC<HelpPageProps> = ({
  onNavigateTab,
  onOpenPrivacy,
  onOpenTerms
}) => {
  // Checklist State
  const [checklist, setChecklist] = useState<ChecklistStatus | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [isDismissingChecklist, setIsDismissingChecklist] = useState(false);

  // FAQ State (only one open at a time)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Support Form State
  const [reportType, setReportType] = useState<ReportType>('Something is broken');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportPage, setReportPage] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [formErrors, setFormErrors] = useState<{ title?: string; description?: string }>({});
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  // Reports List State
  const [reports, setReports] = useState<SupportReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Load Checklist
  const loadChecklist = async () => {
    try {
      setLoadingChecklist(true);
      setChecklistError(null);
      const data = await fetchChecklistStatus();
      setChecklist(data);
    } catch (err: any) {
      setChecklistError('Failed to load checklist. Please retry.');
    } finally {
      setLoadingChecklist(false);
    }
  };

  // Load Reports
  const loadReports = async () => {
    try {
      setLoadingReports(true);
      setReportsError(null);
      const data = await fetchSupportReports();
      setReports(data);
    } catch (err: any) {
      setReportsError('Failed to load your previous reports. Please retry.');
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadChecklist();
    loadReports();
  }, []);

  // Dismiss Checklist
  const handleDismissChecklist = async () => {
    try {
      setIsDismissingChecklist(true);
      await dismissChecklist();
      setChecklist(prev => prev ? { ...prev, is_dismissed: true } : null);
    } catch (err) {
      // Fallback local dismiss
      setChecklist(prev => prev ? { ...prev, is_dismissed: true } : null);
    } finally {
      setIsDismissingChecklist(false);
    }
  };

  // FAQ Accordion Keyboard & Click Handler
  const toggleFaq = (index: number) => {
    setOpenFaqIndex(prev => (prev === index ? null : index));
  };

  const handleFaqKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFaq(index);
    }
  };

  // Submit Support Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccessMessage(null);
    setSubmitErrorMessage(null);

    const errors: { title?: string; description?: string } = {};
    if (!reportTitle.trim() || reportTitle.trim().length < 3) {
      errors.title = 'Please enter a title (at least 3 characters).';
    }
    if (!reportDescription.trim() || reportDescription.trim().length < 10) {
      errors.description = 'Please provide a description (at least 10 characters).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      setSubmittingReport(true);
      const created = await createSupportReport({
        report_type: reportType,
        title: reportTitle.trim(),
        description: reportDescription.trim(),
        page: reportPage.trim() || undefined
      });

      setSubmitSuccessMessage("Thanks, we've received this. Our team will review your report.");
      setReportTitle('');
      setReportDescription('');
      setReportPage('');
      // Prepend to reports list
      setReports(prev => [created, ...prev]);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setSubmitErrorMessage('You have reached the daily limit of 5 reports. Please try again tomorrow.');
      } else if (err.response?.data?.detail) {
        setSubmitErrorMessage(err.response.data.detail);
      } else {
        setSubmitErrorMessage('Failed to send your report. Please check your connection and try again.');
      }
    } finally {
      setSubmittingReport(false);
    }
  };

  const steps = [
    {
      id: 'income',
      title: 'Add your first income',
      desc: 'Log a salary or inflow to track where your money starts.',
      isDone: checklist?.has_income ?? false,
      tab: 'income',
      btnText: 'Go to Income'
    },
    {
      id: 'expense',
      title: 'Add your first expense',
      desc: 'Record a spending entry to monitor your category outflows.',
      isDone: checklist?.has_expense ?? false,
      tab: 'expenses',
      btnText: 'Go to Expenses'
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
  const isDismissed = checklist?.is_dismissed ?? false;

  return (
    <div style={{
      maxWidth: '960px',
      width: '100%',
      margin: '0 auto',
      padding: '32px 24px 64px',
      display: 'flex',
      flexDirection: 'column',
      gap: '36px'
    }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'var(--light-accent)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HelpCircle size={22} />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--primary)',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Help & Support
          </h1>
        </div>
        <p style={{
          fontSize: '14.5px',
          color: 'var(--secondary-text)',
          margin: 0,
          lineHeight: 1.5
        }}>
          Get unstuck, explore frequently asked questions, or send us a report if something goes wrong.
        </p>
      </div>

      {/* 1. GETTING STARTED CHECKLIST */}
      {!isDismissed && (
        <section className="card-box" style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px' }}>
                Getting started checklist
              </h2>
              <div style={{ fontSize: '13.5px', color: 'var(--secondary-text)' }}>
                {loadingChecklist ? (
                  <span>Checking your progress...</span>
                ) : (
                  <span>{completedCount} of 5 done</span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '180px',
              height: '8px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                height: '100%',
                width: `${(completedCount / 5) * 100}%`,
                backgroundColor: 'var(--accent)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {loadingChecklist ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '14px' }}>
              Loading your setup checklist...
            </div>
          ) : checklistError ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '13.5px' }}>
                <AlertCircle size={16} />
                <span>{checklistError}</span>
              </div>
              <button
                onClick={loadChecklist}
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: '12.5px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* All Completed Congratulation Banner */}
              {isAllDone && (
                <div style={{
                  backgroundColor: 'var(--light-accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={20} color="var(--accent)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--primary)' }}>
                        All 5 steps completed!
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
                        You're all set up to make smart financial decisions.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleDismissChecklist}
                    disabled={isDismissingChecklist}
                    className="btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-btn)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--accent)',
                      color: '#FFFFFF'
                    }}
                  >
                    {isDismissingChecklist ? 'Dismissing...' : 'Dismiss Checklist'}
                  </button>
                </div>
              )}

              {/* Steps List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {steps.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: step.isDone ? 'var(--card-subtle)' : 'var(--card)',
                      border: '1px solid var(--border)',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      {step.isDone ? (
                        <CheckCircle2 size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
                      ) : (
                        <Circle size={20} color="var(--secondary-text)" style={{ flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: step.isDone ? 'var(--secondary-text)' : 'var(--primary)',
                          textDecoration: step.isDone ? 'line-through' : 'none'
                        }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                          {step.desc}
                        </div>
                      </div>
                    </div>

                    <div>
                      {step.isDone ? (
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--accent)',
                          fontWeight: 600,
                          backgroundColor: 'var(--light-accent)',
                          padding: '4px 10px',
                          borderRadius: '12px'
                        }}>
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => onNavigateTab(step.tab)}
                          className="btn-outline"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-btn)',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{step.btnText}</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* 2. FREQUENTLY ASKED QUESTIONS */}
      <section className="card-box" style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '24px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px' }}>
            Frequently asked questions
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', margin: 0 }}>
            Quick answers to help you navigate and understand FinTrack.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={faq.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-subtle)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <button
                  type="button"
                  id={`faq-btn-${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => toggleFaq(index)}
                  onKeyDown={(e) => handleFaqKeyDown(e, index)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--primary)',
                    fontSize: '14.5px',
                    fontWeight: 600
                  }}
                >
                  <span>{faq.question}</span>
                  <div style={{ color: 'var(--secondary-text)', flexShrink: 0 }}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-btn-${index}`}
                    style={{
                      padding: '0 18px 16px',
                      color: 'var(--secondary-text)',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--border)'
                    }}
                  >
                    <p style={{ marginTop: '12px', marginBottom: faq.actionButtons ? '14px' : '0' }}>
                      {faq.answer}
                    </p>

                    {faq.actionButtons && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {faq.actionButtons.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => onNavigateTab(btn.tab)}
                            className="btn-outline"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              borderRadius: 'var(--radius-btn)',
                              cursor: 'pointer'
                            }}
                          >
                            <span>{btn.label}</span>
                            <ArrowRight size={13} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. REPORT A PROBLEM OR SUGGEST SOMETHING */}
      <section className="card-box" style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '24px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px' }}>
            Report a problem or suggest something
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', margin: 0 }}>
            Tell us what happened or how we can make FinTrack better.
          </p>
        </div>

        {/* Inline Success Banner */}
        {submitSuccessMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: 'var(--light-accent)',
            border: '1px solid var(--accent)',
            borderRadius: '8px',
            color: 'var(--primary)',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={18} color="var(--accent)" />
            <span>{submitSuccessMessage}</span>
          </div>
        )}

        {/* Inline Global Error Banner */}
        {submitErrorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            color: '#EF4444',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            <XCircle size={18} />
            <span>{submitErrorMessage}</span>
          </div>
        )}

        {/* Support Form */}
        <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Row: Type and Optional Page */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label htmlFor="report-type" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--primary)',
                marginBottom: '6px'
              }}>
                Type
              </label>
              <select
                id="report-type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card-subtle)',
                  color: 'var(--main-text)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              >
                <option value="Something is broken">Something is broken</option>
                <option value="I have a question">I have a question</option>
                <option value="I have a suggestion">I have a suggestion</option>
              </select>
            </div>

            <div>
              <label htmlFor="report-page" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--primary)',
                marginBottom: '6px'
              }}>
                Which page were you on? <span style={{ fontWeight: 400, color: 'var(--secondary-text)' }}>(Optional)</span>
              </label>
              <select
                id="report-page"
                value={reportPage}
                onChange={(e) => setReportPage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card-subtle)',
                  color: 'var(--main-text)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              >
                <option value="">Select a page...</option>
                <option value="Dashboard">Dashboard</option>
                <option value="Analytics">Analytics</option>
                <option value="Income">Income</option>
                <option value="Expenses">Expenses</option>
                <option value="Budgets">Budgets</option>
                <option value="Goals">Goals</option>
                <option value="Settings">Settings</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="report-title" style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--primary)',
              marginBottom: '6px'
            }}>
              Title
            </label>
            <input
              id="report-title"
              type="text"
              placeholder="Brief summary of what happened"
              maxLength={100}
              value={reportTitle}
              onChange={(e) => {
                setReportTitle(e.target.value);
                if (formErrors.title) {
                  setFormErrors(prev => ({ ...prev, title: undefined }));
                }
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-input)',
                border: formErrors.title ? '1px solid #EF4444' : '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                fontSize: '13.5px',
                outline: 'none'
              }}
            />
            {formErrors.title && (
              <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                {formErrors.title}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="report-description" style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--primary)'
              }}>
                Description
              </label>
              <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                {reportDescription.length} / 1000
              </span>
            </div>
            <textarea
              id="report-description"
              rows={4}
              placeholder="Describe the issue or suggestion in detail..."
              maxLength={1000}
              value={reportDescription}
              onChange={(e) => {
                setReportDescription(e.target.value);
                if (formErrors.description) {
                  setFormErrors(prev => ({ ...prev, description: undefined }));
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-input)',
                border: formErrors.description ? '1px solid #EF4444' : '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                fontSize: '13.5px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '90px'
              }}
            />
            {formErrors.description && (
              <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                {formErrors.description}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={submittingReport}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: 'var(--radius-btn)',
                cursor: submittingReport ? 'not-allowed' : 'pointer',
                opacity: submittingReport ? 0.7 : 1,
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF'
              }}
            >
              <Send size={15} />
              <span>{submittingReport ? 'Sending...' : 'Send report'}</span>
            </button>
          </div>
        </form>

        {/* "Your reports" List */}
        <div style={{ marginTop: '36px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              Your reports
            </h3>
            <button
              onClick={loadReports}
              title="Refresh reports"
              aria-label="Refresh reports"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--secondary-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loadingReports ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13.5px' }}>
              Loading your reports...
            </div>
          ) : reportsError ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ color: '#EF4444', fontSize: '13px' }}>{reportsError}</span>
              <button
                onClick={loadReports}
                className="btn-outline"
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : reports.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--secondary-text)',
              fontSize: '13.5px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '8px',
              border: '1px dashed var(--border)'
            }}>
              <Inbox size={28} style={{ opacity: 0.5, marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
              Reports you send will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reports.map((item) => {
                const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                const typeColor = item.report_type === 'Something is broken'
                  ? '#EF4444'
                  : item.report_type === 'I have a question'
                  ? '#F59E0B'
                  : 'var(--accent)';

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--card-subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: `${typeColor}1A`,
                          color: typeColor
                        }}>
                          {item.report_type}
                        </span>
                        <span style={{
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: 'var(--primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.title}
                        </span>
                        {item.page && (
                          <span style={{
                            fontSize: '11px',
                            color: 'var(--secondary-text)',
                            backgroundColor: 'var(--card)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)'
                          }}>
                            {item.page}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                          {dateStr}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--light-accent)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '12.5px',
                      color: 'var(--secondary-text)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {item.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. ABOUT AND LEGAL (Small text at bottom) */}
      <footer style={{
        textAlign: 'center',
        padding: '16px 0 0',
        borderTop: '1px solid var(--border)',
        fontSize: '12.5px',
        color: 'var(--secondary-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <span>FinTrack v1.0.0</span>
        <span>•</span>
        <button
          type="button"
          onClick={() => {
            if (onOpenPrivacy) {
              onOpenPrivacy();
            } else {
              window.location.hash = '#privacy';
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '12.5px',
            color: 'var(--accent)',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Privacy Policy
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => {
            if (onOpenTerms) {
              onOpenTerms();
            } else {
              window.location.hash = '#terms';
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '12.5px',
            color: 'var(--accent)',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Terms of Service
        </button>
      </footer>
    </div>
  );
};
