import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  CheckCircle2, 
  Send, 
  RefreshCw, 
  XCircle, 
  Inbox,
  MessageSquare,
  X,
  History,
  AlertCircle
} from 'lucide-react';
import { 
  fetchSupportReports, 
  fetchSupportReportDetail,
  createSupportReport, 
  type SupportReportItem, 
  type UserReportDetail,
  type ReportType 
} from '../api/help';
import { GettingStartedChecklist } from '../components/GettingStartedChecklist';

interface HelpPageProps {
  onNavigateTab: (tab: string) => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  onNavigateTab,
  onOpenPrivacy,
  onOpenTerms
}) => {
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

  // Detail Modal State
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<UserReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleOpenDetail = async (id: string) => {
    setSelectedReportId(id);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const data = await fetchSupportReportDetail(id);
      setReportDetail(data);
    } catch (err: any) {
      setDetailError('Failed to load report detail. Please retry.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const getUserStatusBadge = (st: string) => {
    const s = st.toLowerCase();
    if (s === 'open') {
      return { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' };
    }
    if (s === 'in progress' || s === 'in_progress') {
      return { bg: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)' };
    }
    if (s === 'resolved') {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
    }
    return { bg: 'rgba(100, 116, 139, 0.15)', color: '#64748B', border: 'rgba(100, 116, 139, 0.3)' };
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
    loadReports();
  }, []);

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
      <GettingStartedChecklist onNavigateTab={onNavigateTab} />



      {/* 2. REPORT A PROBLEM OR SUGGEST SOMETHING */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                const statusSt = getUserStatusBadge(item.status);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleOpenDetail(item.id);
                      }
                    }}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--card-subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease, transform 0.1s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>
                          #{item.report_number || '101'}
                        </span>
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
                          fontWeight: 700,
                          fontSize: '14px',
                          color: 'var(--main-text)',
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
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          backgroundColor: statusSt.bg,
                          color: statusSt.color,
                          border: `1px solid ${statusSt.border}`
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '13px',
                      color: 'var(--secondary-text)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {item.description}
                    </div>

                    {item.admin_reply && (
                      <div style={{
                        marginTop: '4px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--main-text)'
                      }}>
                        <MessageSquare size={14} color="#10B981" />
                        <span><strong>FinTrack team replied:</strong> {item.admin_reply.slice(0, 80)}{item.admin_reply.length > 80 ? '...' : ''}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* User Report Detail Modal */}
            {selectedReportId && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px'
              }}>
                <div style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  maxWidth: '560px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Modal Header */}
                  <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--card)',
                    zIndex: 1
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#3B82F6' }}>
                        #{reportDetail?.report_number || '...'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--main-text)' }}>
                        Report Details
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedReportId(null);
                        setReportDetail(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--secondary-text)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {loadingDetail ? (
                      <div style={{ padding: '36px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13.5px' }}>
                        Loading details...
                      </div>
                    ) : detailError ? (
                      <div style={{ padding: '24px', textAlign: 'center' }}>
                        <AlertCircle size={28} color="#EF4444" style={{ marginBottom: '8px' }} />
                        <div style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{detailError}</div>
                        <button
                          onClick={() => handleOpenDetail(selectedReportId)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--card-subtle)',
                            border: '1px solid var(--border)',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    ) : reportDetail ? (
                      <>
                        {/* Report Header Card */}
                        <div style={{
                          padding: '16px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--card-subtle)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--main-text)' }}>
                              {reportDetail.title}
                            </div>
                            <span style={{
                              ...getUserStatusBadge(reportDetail.status),
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              {reportDetail.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--secondary-text)' }}>
                            <span>{reportDetail.report_type}</span>
                            {reportDetail.page && (
                              <>
                                <span>•</span>
                                <span>Page: {reportDetail.page}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(reportDetail.created_at).toLocaleDateString()}</span>
                          </div>

                          {/* Message Body */}
                          <div style={{
                            padding: '12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            fontSize: '13px',
                            color: 'var(--main-text)',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {reportDetail.description}
                          </div>
                        </div>

                        {/* Admin Team Reply (if any) */}
                        {reportDetail.admin_reply && (
                          <div style={{
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid #10B981',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={16} color="#10B981" />
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                                Response from FinTrack Team
                              </span>
                            </div>
                            <div style={{
                              fontSize: '13.5px',
                              color: 'var(--main-text)',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap'
                            }}>
                              {reportDetail.admin_reply}
                            </div>
                            {reportDetail.admin_reply_at && (
                              <div style={{ fontSize: '11px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                                Replied {new Date(reportDetail.admin_reply_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Closed Reason Notice (if closed) */}
                        {reportDetail.status === 'Closed' && reportDetail.closed_reason && (
                          <div style={{
                            padding: '12px 14px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--card-subtle)',
                            border: '1px solid var(--border)',
                            fontSize: '12.5px',
                            color: 'var(--secondary-text)'
                          }}>
                            <strong>Closing outcome:</strong> {reportDetail.closed_reason}
                          </div>
                        )}

                        {/* Status History Timeline */}
                        {reportDetail.history && reportDetail.history.length > 0 && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                              <History size={14} color="#3B82F6" />
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--main-text)' }}>
                                Status Timeline
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {reportDetail.history.map((hist, idx) => (
                                <div key={hist.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#3B82F6',
                                    marginTop: '5px',
                                    flexShrink: 0
                                  }} />
                                  <div style={{ flex: 1, fontSize: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span style={{ fontWeight: 600, color: 'var(--main-text)' }}>
                                        {hist.actor_name}
                                      </span>
                                      <span style={{ color: 'var(--secondary-text)', fontSize: '11px' }}>
                                        {new Date(hist.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <div style={{ color: 'var(--secondary-text)', marginTop: '2px' }}>
                                      {hist.message || hist.event_type}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--card-subtle)',
                          fontSize: '11.5px',
                          color: 'var(--secondary-text)',
                          lineHeight: 1.4
                        }}>
                          ℹ️ Reports cannot be modified or deleted after sending. Our team reviews all submissions.
                        </div>
                      </>
                    ) : null}
                  </div>

                  {/* Modal Footer */}
                  <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: 'var(--card)'
                  }}>
                    <button
                      onClick={() => {
                        setSelectedReportId(null);
                        setReportDetail(null);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-btn)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card-subtle)',
                        color: 'var(--main-text)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Close
                    </button>
                  </div>

                </div>
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
