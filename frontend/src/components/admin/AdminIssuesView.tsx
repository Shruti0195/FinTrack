import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Check,
  RotateCcw,
  User,
  Mail,
  StickyNote,
  X,
  Trash2,
  History,
  Inbox
} from 'lucide-react';
import {
  fetchAdminIssues,
  fetchAdminIssueDetail,
  updateAdminIssue,
  createAdminIssueNote,
  reopenAdminIssue,
  deleteSpamAdminIssue,
  runRetentionCleanup,
  type AdminIssueListItem,
  type AdminIssueDetailItem,
  type AdminIssueCounts
} from '../../api/admin';

type StatusTab = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const CLOSED_REASONS = [
  'Duplicate',
  'Not a bug',
  "Can't reproduce",
  "Won't do",
  'Other'
];

export interface AdminIssuesViewProps {
  initialIssueId?: string | null;
  onClearInitialIssueId?: () => void;
}

export const AdminIssuesView: React.FC<AdminIssuesViewProps> = ({
  initialIssueId,
  onClearInitialIssueId
}) => {
  // Filters & State
  const [activeTab, setActiveTab] = useState<StatusTab>('open');
  const [issues, setIssues] = useState<AdminIssueListItem[]>([]);
  const [counts, setCounts] = useState<AdminIssueCounts>({
    all: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Drawer state
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail] = useState<AdminIssueDetailItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Update form state inside detail drawer
  const [newStatus, setNewStatus] = useState<string>('Open');
  const [closedReason, setClosedReason] = useState<string>('Duplicate');
  const [userReply, setUserReply] = useState<string>('');
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Internal Notes state
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Reopen & Delete state
  const [reopening, setReopening] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingSpam, setDeletingSpam] = useState(false);

  // Retention cleanup state
  const [cleaningRetention, setCleaningRetention] = useState(false);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminIssues({
        status: activeTab,
        search: searchQuery.trim() || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        page_filter: pageFilter !== 'all' ? pageFilter : undefined,
        sort: sortOrder,
        page: currentPage,
        page_size: 15
      });
      setIssues(res.items);
      setCounts(res.counts);
      setTotalPages(res.total_pages);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load reported issues. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [activeTab, searchQuery, typeFilter, pageFilter, sortOrder, currentPage]);

  // Load single issue detail
  const loadDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      setDetailError(null);
      setUpdateFeedback(null);
      setNoteFeedback(null);
      const data = await fetchAdminIssueDetail(id);
      setIssueDetail(data);
      setNewStatus(data.status);
      setClosedReason(data.closed_reason || 'Duplicate');
      setUserReply(data.admin_reply || '');
    } catch (err: any) {
      setDetailError(err.response?.data?.detail || 'Failed to load report detail.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenDetail = (issueId: string) => {
    setSelectedIssueId(issueId);
    loadDetail(issueId);
  };

  useEffect(() => {
    if (initialIssueId) {
      handleOpenDetail(initialIssueId);
      if (onClearInitialIssueId) {
        onClearInitialIssueId();
      }
    }
  }, [initialIssueId]);

  const handleCloseDetail = () => {
    setSelectedIssueId(null);
    setIssueDetail(null);
    setShowDeleteConfirm(false);
  };

  // Submit Status & Reply Update
  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDetail) return;

    if (newStatus === 'Closed' && !closedReason) {
      setUpdateFeedback({ msg: 'Please select a reason for closing this report.', type: 'error' });
      return;
    }

    setSavingUpdate(true);
    setUpdateFeedback(null);
    try {
      const updated = await updateAdminIssue(issueDetail.id, {
        status: newStatus,
        closed_reason: newStatus === 'Closed' ? closedReason : undefined,
        reply: userReply.trim() || undefined,
        last_updated_at: issueDetail.updated_at
      });
      setIssueDetail(updated);
      setUpdateFeedback({
        msg: `Report updated to ${updated.status} successfully.${userReply.trim() ? ' Reply sent to user.' : ''}`,
        type: 'success'
      });
      // Refresh list in background
      loadIssues();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setUpdateFeedback({
          msg: err.response?.data?.detail || 'Another administrator updated this report. Please refresh before saving.',
          type: 'error'
        });
      } else {
        setUpdateFeedback({
          msg: err.response?.data?.detail || 'Failed to update report.',
          type: 'error'
        });
      }
    } finally {
      setSavingUpdate(false);
    }
  };

  // Add Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDetail || !newNote.trim()) return;

    setSavingNote(true);
    setNoteFeedback(null);
    try {
      const noteItem = await createAdminIssueNote(issueDetail.id, newNote.trim());
      setIssueDetail(prev => prev ? {
        ...prev,
        notes: [...prev.notes, noteItem]
      } : null);
      setNewNote('');
      setNoteFeedback({ msg: 'Internal note saved.', type: 'success' });
      // Reload detail to refresh timeline
      loadDetail(issueDetail.id);
    } catch (err: any) {
      setNoteFeedback({ msg: err.response?.data?.detail || 'Failed to save note.', type: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  // Reopen Issue
  const handleReopen = async () => {
    if (!issueDetail) return;
    setReopening(true);
    setUpdateFeedback(null);
    try {
      const reopened = await reopenAdminIssue(issueDetail.id);
      setIssueDetail(reopened);
      setNewStatus('Open');
      setUpdateFeedback({ msg: 'Report reopened successfully.', type: 'success' });
      loadIssues();
    } catch (err: any) {
      setUpdateFeedback({ msg: err.response?.data?.detail || 'Failed to reopen report.', type: 'error' });
    } finally {
      setReopening(false);
    }
  };

  // Delete Spam
  const handleDeleteSpam = async () => {
    if (!issueDetail) return;
    setDeletingSpam(true);
    try {
      await deleteSpamAdminIssue(issueDetail.id);
      handleCloseDetail();
      loadIssues();
    } catch (err: any) {
      setUpdateFeedback({ msg: err.response?.data?.detail || 'Failed to delete report.', type: 'error' });
      setDeletingSpam(false);
    }
  };

  // Retention Cleanup
  const handleRetentionCleanup = async () => {
    setCleaningRetention(true);
    setRetentionMessage(null);
    try {
      const res = await runRetentionCleanup();
      setRetentionMessage(res.message);
      loadIssues();
      setTimeout(() => setRetentionMessage(null), 5000);
    } catch (err: any) {
      setRetentionMessage('Failed to run retention cleanup.');
    } finally {
      setCleaningRetention(false);
    }
  };

  // Badges styling helpers
  const getStatusBadge = (st: string) => {
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

  const getTypeBadge = (type: string) => {
    if (type === 'Something is broken') {
      return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
    }
    if (type === 'I have a question') {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' };
    }
    return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981' };
  };

  // Known pages for filter dropdown
  const uniquePages = Array.from(new Set(issues.map(i => i.page).filter(Boolean))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, color: 'var(--main-text)', letterSpacing: '-0.02em' }}>
            Reported Issues & Help Requests
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--secondary-text)' }}>
            Review, investigate, reply to user inquiries, and track resolution timelines.
          </p>
        </div>

        {/* Retention Cleanup Button */}
        <button
          onClick={handleRetentionCleanup}
          disabled={cleaningRetention}
          title="Remove Resolved/Closed reports older than 12 months"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--card)',
            color: 'var(--secondary-text)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-btn)',
            border: '1px solid var(--border)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: cleaningRetention ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--main-text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary-text)'}
        >
          <Clock size={15} />
          <span>{cleaningRetention ? 'Cleaning...' : 'Cleanup >12mo Old'}</span>
        </button>
      </div>

      {/* Retention notification */}
      {retentionMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10B981',
          color: '#10B981',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} />
          <span>{retentionMessage}</span>
        </div>
      )}

      {/* 2. Top Status Tabs with Counts */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'all', label: 'All', count: counts.all },
          { key: 'open', label: 'Open', count: counts.open, highlight: true },
          { key: 'in_progress', label: 'In progress', count: counts.in_progress },
          { key: 'resolved', label: 'Resolved', count: counts.resolved },
          { key: 'closed', label: 'Closed', count: counts.closed }
        ].map(tab => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as StatusTab);
                setCurrentPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: isSelected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-subtle)',
                color: isSelected ? '#10B981' : 'var(--secondary-text)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '12px',
                backgroundColor: isSelected ? '#10B981' : 'var(--border)',
                color: isSelected ? '#FFFFFF' : 'var(--secondary-text)',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search and Filters Bar */}
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--card-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 14px',
          flex: 1,
          minWidth: '240px',
          maxWidth: '380px'
        }}>
          <Search size={16} color="var(--secondary-text)" />
          <input
            type="text"
            placeholder="Search title, description, reporter, #101..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--main-text)',
              fontSize: '13px',
              width: '100%'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                fontSize: '12.5px',
                outline: 'none'
              }}
            >
              <option value="all">All Types</option>
              <option value="Something is broken">Something is broken</option>
              <option value="I have a question">I have a question</option>
              <option value="I have a suggestion">I have a suggestion</option>
            </select>
          </div>

          {/* Page Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Page:</span>
            <select
              value={pageFilter}
              onChange={(e) => {
                setPageFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                fontSize: '12.5px',
                outline: 'none'
              }}
            >
              <option value="all">All Pages</option>
              {uniquePages.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'newest' | 'oldest');
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                fontSize: '12.5px',
                outline: 'none'
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

        </div>
      </div>

      {/* 4. Table / Cards View */}
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '14px' }}>
            Loading reported issues...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#EF4444" style={{ marginBottom: '8px' }} />
            <div style={{ color: '#EF4444', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              {error}
            </div>
            <button
              onClick={loadIssues}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-btn)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : issues.length === 0 ? (
          <div style={{ padding: '54px 20px', textAlign: 'center' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              {activeTab === 'open' ? <CheckCircle2 size={24} /> : <Inbox size={24} />}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--main-text)', marginBottom: '4px' }}>
              {activeTab === 'open' ? 'No open issues. Nice work.' : `No ${activeTab.replace('_', ' ')} issues found.`}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
              {searchQuery ? `No reports match your current filter or query "${searchQuery}".` : 'All reports have been reviewed.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--secondary-text)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '12px 18px' }}>#</th>
                  <th style={{ padding: '12px 18px' }}>Title & Type</th>
                  <th style={{ padding: '12px 18px' }}>Page</th>
                  <th style={{ padding: '12px 18px' }}>Reporter</th>
                  <th style={{ padding: '12px 18px' }}>Date</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(item => {
                  const isOpen = item.status === 'Open';
                  const statusSt = getStatusBadge(item.status);
                  const typeSt = getTypeBadge(item.report_type);
                  const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetail(item.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleOpenDetail(item.id);
                        }
                      }}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease',
                        borderLeft: isOpen ? '4px solid #3B82F6' : '4px solid transparent',
                        backgroundColor: isOpen ? 'rgba(59, 130, 246, 0.03)' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isOpen ? 'rgba(59, 130, 246, 0.03)' : 'transparent'}
                    >
                      {/* Report Number */}
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#3B82F6', fontSize: '13px' }}>
                        #{item.report_number}
                      </td>

                      {/* Title & Type */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: isOpen ? 700 : 600, color: 'var(--main-text)' }}>
                            {item.title}
                          </span>
                          <span style={{
                            alignSelf: 'flex-start',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: typeSt.bg,
                            color: typeSt.color
                          }}>
                            {item.report_type}
                          </span>
                        </div>
                      </td>

                      {/* Page */}
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--secondary-text)' }}>
                        {item.page ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--card-subtle)',
                            border: '1px solid var(--border)',
                            fontSize: '11.5px',
                            fontWeight: 600
                          }}>
                            {item.page}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Reporter Name & Email */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--main-text)' }}>
                            {item.reporter_name}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                            {item.reporter_email}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: 'var(--secondary-text)', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: statusSt.bg,
                          color: statusSt.color,
                          border: `1px solid ${statusSt.border}`
                        }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--card-subtle)'
          }}>
            <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)' }}>
              Showing {issues.length} of {totalCount} reports (Page {currentPage} of {totalPages})
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  color: currentPage === 1 ? 'var(--secondary-text)' : 'var(--main-text)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  color: currentPage === totalPages ? 'var(--secondary-text)' : 'var(--main-text)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. ISSUE DETAIL SIDE PANEL / MODAL DRAWER */}
      {/* ========================================================= */}
      {selectedIssueId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%',
            maxWidth: '620px',
            height: '100%',
            backgroundColor: 'var(--card)',
            borderLeft: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--card)',
              zIndex: 10
            }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#3B82F6' }}>
                  #{issueDetail?.report_number || '...'}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
                  Issue Detail
                </h2>
              </div>
              <button
                onClick={handleCloseDetail}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            {loadingDetail ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '14px' }}>
                Loading report details...
              </div>
            ) : detailError ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <AlertCircle size={28} color="#EF4444" style={{ marginBottom: '8px' }} />
                <div style={{ color: '#EF4444', fontSize: '13.5px', marginBottom: '12px' }}>{detailError}</div>
                <button
                  onClick={() => loadDetail(selectedIssueId)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--card-subtle)',
                    border: '1px solid var(--border)',
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : issueDetail ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* A. Report Overview Card */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--main-text)', lineHeight: 1.3 }}>
                      {issueDetail.title}
                    </h3>
                    <span style={{
                      ...getStatusBadge(issueDetail.status),
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {issueDetail.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      ...getTypeBadge(issueDetail.report_type),
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '8px'
                    }}>
                      {issueDetail.report_type}
                    </span>
                    {issueDetail.page && (
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        color: 'var(--secondary-text)'
                      }}>
                        Page: {issueDetail.page}
                      </span>
                    )}
                  </div>

                  {/* Full Description */}
                  <div style={{
                    fontSize: '13.5px',
                    color: 'var(--main-text)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)'
                  }}>
                    {issueDetail.description}
                  </div>

                  {/* Reporter Contact Info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    paddingTop: '6px',
                    fontSize: '12px',
                    color: 'var(--secondary-text)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--main-text)' }}>
                        <User size={13} /> {issueDetail.reporter_name}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} /> {issueDetail.reporter_email}
                      </span>
                    </div>
                    <span>
                      Sent {new Date(issueDetail.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* B. Update Status & User Reply Form */}
                <div style={{
                  padding: '20px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: 'var(--main-text)' }}>
                    Handle Report & Reply
                  </h4>

                  {/* Feedback Message */}
                  {updateFeedback && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: updateFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${updateFeedback.type === 'success' ? '#10B981' : '#EF4444'}`,
                      color: updateFeedback.type === 'success' ? '#10B981' : '#EF4444',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      marginBottom: '16px'
                    }}>
                      {updateFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{updateFeedback.msg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveUpdate}>
                    {/* Status Radio / Selector */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                        Status
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {(['Open', 'In progress', 'Resolved', 'Closed'] as const).map(st => {
                          const isSelected = newStatus === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setNewStatus(st)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid #10B981' : '1px solid var(--border)',
                                backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-subtle)',
                                color: isSelected ? '#10B981' : 'var(--main-text)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textAlign: 'center'
                              }}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Closing Reason Dropdown (Required if status is Closed) */}
                    {newStatus === 'Closed' && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                          Reason for Closing <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <select
                          value={closedReason}
                          onChange={(e) => setClosedReason(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--card-subtle)',
                            color: 'var(--main-text)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        >
                          {CLOSED_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Reply to User */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)' }}>
                          Reply to User
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                          {userReply.length}/1500 chars {newStatus === 'Resolved' || newStatus === 'Closed' ? '(Recommended)' : '(Optional)'}
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={1500}
                        placeholder="Write a message that will be shown to the user on their Help page and emailed upon resolution/closing..."
                        value={userReply}
                        onChange={(e) => setUserReply(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--card-subtle)',
                          color: 'var(--main-text)',
                          fontSize: '13px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      {/* Reopen button (if resolved/closed) */}
                      {(issueDetail.status === 'Resolved' || issueDetail.status === 'Closed') ? (
                        <button
                          type="button"
                          onClick={handleReopen}
                          disabled={reopening}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-btn)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--card-subtle)',
                            color: 'var(--main-text)',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: reopening ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <RotateCcw size={14} />
                          <span>{reopening ? 'Reopening...' : 'Move Back to Open'}</span>
                        </button>
                      ) : <div />}

                      <button
                        type="submit"
                        disabled={savingUpdate}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 18px',
                          borderRadius: 'var(--radius-btn)',
                          border: 'none',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: savingUpdate ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                          opacity: savingUpdate ? 0.6 : 1
                        }}
                      >
                        <Check size={16} />
                        <span>{savingUpdate ? 'Saving...' : 'Save & Update'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* C. Internal Notes (Admin-only) */}
                <div style={{
                  padding: '20px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <StickyNote size={16} color="#F59E0B" />
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--main-text)' }}>
                      Internal Notes (Admin Only)
                    </h4>
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--secondary-text)' }}>
                    Notes are strictly private to admins and never visible to the user. Existing notes cannot be edited.
                  </p>

                  {/* Feedback */}
                  {noteFeedback && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: noteFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: noteFeedback.type === 'success' ? '#10B981' : '#EF4444',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '12px'
                    }}>
                      <span>{noteFeedback.msg}</span>
                    </div>
                  )}

                  {/* Notes List */}
                  {issueDetail.notes.length === 0 ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontStyle: 'italic', marginBottom: '14px' }}>
                      No internal notes yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                      {issueDetail.notes.map(note => (
                        <div
                          key={note.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--card-subtle)',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--main-text)' }}>
                              {note.admin_name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                              {new Date(note.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--main-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {note.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                      rows={2}
                      placeholder="Add an internal note for your admin team..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card-subtle)',
                        color: 'var(--main-text)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ alignSelf: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={savingNote || !newNote.trim()}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--card-subtle)',
                          color: 'var(--main-text)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: savingNote || !newNote.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {savingNote ? 'Adding...' : 'Add Note'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* D. Full History Timeline */}
                <div style={{
                  padding: '20px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <History size={16} color="#3B82F6" />
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--main-text)' }}>
                      History &amp; Audit Timeline
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {issueDetail.history.map((hist, idx) => (
                      <div
                        key={hist.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: hist.is_internal ? '#F59E0B' : '#3B82F6',
                          marginTop: '5px',
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1, fontSize: '12.5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--main-text)' }}>
                              {hist.actor_name}
                              {hist.is_internal && (
                                <span style={{
                                  marginLeft: '6px',
                                  fontSize: '10px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#F59E0B'
                                }}>
                                  internal
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                              {new Date(hist.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ color: 'var(--secondary-text)', marginTop: '2px', lineHeight: 1.4 }}>
                            {hist.message || hist.event_type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* E. Spam Deletion Zone */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>
                      Delete Spam Report
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                      Allowed only for spam. Normal reports must be closed, not deleted.
                    </div>
                  </div>

                  {showDeleteConfirm ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>
                        Permanent removal. Confirm?
                      </span>
                      <button
                        onClick={handleDeleteSpam}
                        disabled={deletingSpam}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: deletingSpam ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {deletingSpam ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: 'var(--secondary-text)',
                          border: '1px solid var(--border)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        backgroundColor: 'transparent',
                        color: '#EF4444',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete (Spam Only)</span>
                    </button>
                  )}
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

    </div>
  );
};
