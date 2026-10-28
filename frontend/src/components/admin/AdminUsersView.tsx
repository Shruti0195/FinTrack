import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  X,
  Mail,
  KeyRound
} from 'lucide-react';
import { 
  fetchAdminUsers, 
  updateAdminUserStatus, 
  resendAdminUserVerification,
  sendAdminUserPasswordReset,
  type AdminUserItem, 
  type UserListParams 
} from '../../api/admin';

interface AdminUsersViewProps {
  currentAdminEmail?: string;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ currentAdminEmail }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'email' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation Modal State (Enable/Disable)
  const [confirmTarget, setConfirmTarget] = useState<{ user: AdminUserItem; targetActive: boolean } | null>(null);

  // User Support Actions Modal State (Resend Verification / Password Reset)
  const [supportActionTarget, setSupportActionTarget] = useState<{
    user: AdminUserItem;
    type: 'resend_verification' | 'password_reset';
  } | null>(null);

  const handleExecuteSupportAction = async () => {
    if (!supportActionTarget) return;
    const { user, type } = supportActionTarget;

    try {
      setActionLoading(user.id);
      if (type === 'resend_verification') {
        const res = await resendAdminUserVerification(user.id);
        setToastMessage({
          type: 'success',
          text: res.message || `Verification link sent to ${user.email}.`
        });
      } else {
        const res = await sendAdminUserPasswordReset(user.id);
        setToastMessage({
          type: 'success',
          text: res.message || `Password reset link sent to ${user.email}.`
        });
      }
      setSupportActionTarget(null);
    } catch (err: any) {
      console.error('Failed to execute support action:', err);
      const msg = err?.response?.data?.detail || 'Failed to execute support action.';
      setToastMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: UserListParams = {
        page,
        page_size: pageSize,
        search: searchTerm.trim() || undefined,
        status: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      const data = await fetchAdminUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err?.response?.data?.detail || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Auto-hide toast messages
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSort = (field: 'created_at' | 'name' | 'email' | 'status') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' || field === 'email' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const handleConfirmToggle = async () => {
    if (!confirmTarget) return;
    const { user, targetActive } = confirmTarget;

    try {
      setActionLoading(user.id);
      await updateAdminUserStatus(user.id, targetActive);
      setToastMessage({
        type: 'success',
        text: targetActive 
          ? `Successfully enabled ${user.name}'s account.`
          : `Successfully disabled ${user.name}'s account.`
      });
      setConfirmTarget(null);
      // Reload users list
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to update user status:', err);
      const msg = err?.response?.data?.detail || 'Failed to update user status.';
      setToastMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '84px',
          right: '32px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: toastMessage.type === 'success' ? '#10B981' : '#EF4444',
          color: '#FFFFFF',
          fontSize: '13.5px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              marginLeft: '8px',
              padding: '2px'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--main-text)',
              letterSpacing: '-0.02em'
            }}>
              User Directory
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {total} {total === 1 ? 'User' : 'Users'} Registered
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--secondary-text)' }}>
            Manage platform members and security statuses. User balances, incomes, and transactions remain strictly private.
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            backgroundColor: 'var(--card)',
            color: 'var(--main-text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-btn)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Search & Filters Toolbar */}
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        
        {/* Search Input Box */}
        <div style={{
          position: 'relative',
          flex: '1 1 280px',
          maxWidth: '420px'
        }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--secondary-text)',
            pointerEvents: 'none'
          }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '9px 36px 9px 36px',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-input)',
              color: 'var(--main-text)',
              fontSize: '13.5px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10B981'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--secondary-text)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Segmented Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 600 }}>Status:</span>
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--card-subtle)',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid var(--border)'
          }}>
            {(['all', 'active', 'disabled'] as const).map((st) => {
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 600 : 500,
                    backgroundColor: isSelected ? 'var(--card)' : 'transparent',
                    color: isSelected ? '#10B981' : 'var(--secondary-text)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Main Table Card */}
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        
        {loading && users.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--secondary-text)' }}>
            <RefreshCw size={24} style={{ color: '#10B981', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <div style={{ fontSize: '13.5px' }}>Loading user directory...</div>
          </div>
        ) : error && users.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: 'var(--danger)', marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--main-text)' }}>Failed to load users</div>
            <div style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '4px' }}>{error}</div>
            <button
              onClick={loadUsers}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-btn)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          /* Friendly Empty State */
          <div style={{
            padding: '64px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(100, 116, 139, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--secondary-text)',
              marginBottom: '16px'
            }}>
              <Users size={28} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--main-text)' }}>
              No users found
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--secondary-text)', maxWidth: '360px' }}>
              {searchTerm 
                ? `We couldn't find anyone matching "${searchTerm}". Try a different name or email.`
                : `There are currently no users matching the "${statusFilter}" status filter.`}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPage(1);
                }}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#10B981',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13.5px'
            }}>
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
                  {/* Name Column */}
                  <th 
                    onClick={() => handleSort('name')}
                    style={{ padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>User</span>
                      {sortBy === 'name' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} color="#10B981" /> : <ChevronDown size={14} color="#10B981" />
                      )}
                    </div>
                  </th>

                  {/* Email Column */}
                  <th 
                    onClick={() => handleSort('email')}
                    style={{ padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Email</span>
                      {sortBy === 'email' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} color="#10B981" /> : <ChevronDown size={14} color="#10B981" />
                      )}
                    </div>
                  </th>

                  {/* Status Column */}
                  <th 
                    onClick={() => handleSort('status')}
                    style={{ padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Status</span>
                      {sortBy === 'status' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} color="#10B981" /> : <ChevronDown size={14} color="#10B981" />
                      )}
                    </div>
                  </th>

                  {/* Date Joined Column */}
                  <th 
                    onClick={() => handleSort('created_at')}
                    style={{ padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Joined Date</span>
                      {sortBy === 'created_at' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} color="#10B981" /> : <ChevronDown size={14} color="#10B981" />
                      )}
                    </div>
                  </th>

                  {/* Action Column */}
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>
                    Support & Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => {
                  const isCurrentAdmin = currentAdminEmail && u.email.toLowerCase() === currentAdminEmail.toLowerCase();
                  const isAdminRole = u.role === 'ADMIN';
                  const isBusy = actionLoading === u.id;
                  const formattedDate = new Date(u.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.1s ease',
                        opacity: u.is_active ? 1 : 0.72
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Name & Initials */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: isAdminRole ? '#0F172A' : 'rgba(16, 185, 129, 0.12)',
                            color: isAdminRole ? '#10B981' : '#10B981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--main-text)' }}>
                                {u.name}
                              </span>
                              {isAdminRole && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#FFFFFF',
                                  backgroundColor: '#0F172A',
                                  border: '1px solid #10B981',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  ADMIN
                                </span>
                              )}
                              {isCurrentAdmin && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: 'var(--secondary-text)',
                                  backgroundColor: 'rgba(100, 116, 139, 0.1)',
                                  padding: '1px 5px',
                                  borderRadius: '4px'
                                }}>
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 20px', color: 'var(--secondary-text)' }}>
                        {u.email}
                      </td>

                      {/* Status (Active & Verified) */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: u.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: u.is_active ? '#10B981' : '#EF4444'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: u.is_active ? '#10B981' : '#EF4444'
                            }} />
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: u.is_verified ? '#10B981' : '#F59E0B'
                          }}>
                            {u.is_verified ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                            <span>{u.is_verified ? 'Verified' : 'Unverified'}</span>
                          </span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td style={{ padding: '14px 20px', color: 'var(--secondary-text)' }}>
                        {formattedDate}
                      </td>

                      {/* Support & Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {isCurrentAdmin ? (
                          <span style={{ fontSize: '11.5px', color: 'var(--secondary-text)', fontStyle: 'italic' }}>
                            Your Account
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                            {/* 1. Resend Verification Link */}
                            <button
                              type="button"
                              onClick={() => setSupportActionTarget({ user: u, type: 'resend_verification' })}
                              disabled={isBusy}
                              title={u.is_verified ? "Resend verification link (user already verified)" : "Resend account activation email"}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-btn, 6px)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                border: '1px solid',
                                backgroundColor: u.is_verified ? 'transparent' : 'rgba(16, 185, 129, 0.12)',
                                borderColor: u.is_verified ? 'var(--border)' : 'rgba(16, 185, 129, 0.4)',
                                color: u.is_verified ? 'var(--main-text)' : '#10B981',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#10B981';
                                e.currentTarget.style.color = '#10B981';
                                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = u.is_verified ? 'transparent' : 'rgba(16, 185, 129, 0.12)';
                                e.currentTarget.style.borderColor = u.is_verified ? 'var(--border)' : 'rgba(16, 185, 129, 0.4)';
                                e.currentTarget.style.color = u.is_verified ? 'var(--main-text)' : '#10B981';
                              }}
                            >
                              <Mail size={13} />
                              <span>Verify Link</span>
                            </button>

                            {/* 2. Send Password Reset */}
                            <button
                              type="button"
                              onClick={() => setSupportActionTarget({ user: u, type: 'password_reset' })}
                              disabled={isBusy}
                              title="Send secure password reset link to user email"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-btn, 6px)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                border: '1px solid rgba(139, 92, 246, 0.35)',
                                backgroundColor: 'rgba(139, 92, 246, 0.08)',
                                color: '#8B5CF6',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#8B5CF6';
                                e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.18)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                              }}
                            >
                              <KeyRound size={13} />
                              <span>Reset Pwd</span>
                            </button>

                            {/* 3. Enable / Disable Status */}
                            <button
                              type="button"
                              onClick={() => setConfirmTarget({ user: u, targetActive: !u.is_active })}
                              disabled={isBusy}
                              title={u.is_active ? "Disable user account" : "Enable user account"}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-btn, 6px)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                border: '1px solid',
                                backgroundColor: u.is_active 
                                  ? 'transparent' 
                                  : 'rgba(16, 185, 129, 0.1)',
                                borderColor: u.is_active 
                                  ? 'rgba(239, 68, 68, 0.4)' 
                                  : '#10B981',
                                color: u.is_active 
                                  ? '#EF4444' 
                                  : '#10B981',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (u.is_active) {
                                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                } else {
                                  e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.18)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = u.is_active 
                                  ? 'transparent' 
                                  : 'rgba(16, 185, 129, 0.1)';
                              }}
                            >
                              {u.is_active ? (
                                <>
                                  <UserX size={13} />
                                  <span>Disable</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck size={13} />
                                  <span>Enable</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12.5px',
            color: 'var(--secondary-text)'
          }}>
            <div>
              Showing <strong style={{ color: 'var(--main-text)' }}>{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong style={{ color: 'var(--main-text)' }}>{Math.min(page * pageSize, total)}</strong> of{' '}
              <strong style={{ color: 'var(--main-text)' }}>{total}</strong> users
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Rows Per Page Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--main-text)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev Page Button */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  color: page <= 1 ? 'var(--secondary-text)' : 'var(--main-text)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span style={{ padding: '0 4px', fontWeight: 600, color: 'var(--main-text)' }}>
                Page {page} of {totalPages}
              </span>

              {/* Next Page Button */}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  color: page >= totalPages ? 'var(--secondary-text)' : 'var(--main-text)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Support Action Confirmation Modal (Resend Verification / Password Reset) */}
      {supportActionTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card, 12px)',
            padding: '28px',
            maxWidth: '460px',
            width: '90%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: supportActionTarget.type === 'resend_verification' 
                  ? 'rgba(16, 185, 129, 0.12)' 
                  : 'rgba(139, 92, 246, 0.12)',
                color: supportActionTarget.type === 'resend_verification' ? '#10B981' : '#8B5CF6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {supportActionTarget.type === 'resend_verification' ? (
                  <Mail size={22} />
                ) : (
                  <KeyRound size={22} />
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--main-text)' }}>
                  {supportActionTarget.type === 'resend_verification'
                    ? 'Resend Verification Email?'
                    : 'Send Password Reset Link?'}
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                  Target: <strong>{supportActionTarget.user.name}</strong> ({supportActionTarget.user.email})
                </div>
              </div>
            </div>

            <div style={{
              margin: '0 0 24px',
              fontSize: '13.5px',
              color: 'var(--main-text)',
              lineHeight: 1.5,
              backgroundColor: 'var(--card-subtle)',
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {supportActionTarget.type === 'resend_verification' ? (
                <>
                  This will generate a fresh account activation link and email it to <strong>{supportActionTarget.user.email}</strong>.
                  {supportActionTarget.user.is_verified && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
                      Note: This user is already marked as verified, but a fresh link can still be dispatched if requested.
                    </div>
                  )}
                </>
              ) : (
                <>
                  This will invalidate any previously issued unused password reset tokens and email a secure, single-use password reset link to <strong>{supportActionTarget.user.email}</strong>.
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSupportActionTarget(null)}
                disabled={actionLoading !== null}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--secondary-text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-btn, 8px)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteSupportAction}
                disabled={actionLoading !== null}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: supportActionTarget.type === 'resend_verification' ? '#10B981' : '#8B5CF6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn, 8px)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: actionLoading !== null ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading !== null ? (
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : supportActionTarget.type === 'resend_verification' ? (
                  <Mail size={15} />
                ) : (
                  <KeyRound size={15} />
                )}
                <span>
                  {supportActionTarget.type === 'resend_verification'
                    ? 'Send Verification Link'
                    : 'Send Password Reset'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: confirmTarget.targetActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: confirmTarget.targetActive ? '#10B981' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {confirmTarget.targetActive ? <UserCheck size={22} /> : <UserX size={22} />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--main-text)' }}>
                  {confirmTarget.targetActive ? 'Enable User Account?' : 'Disable User Account?'}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                  {confirmTarget.user.name} ({confirmTarget.user.email})
                </div>
              </div>
            </div>

            {/* Plain Words Explanation */}
            <p style={{
              margin: '0 0 24px',
              fontSize: '14px',
              color: 'var(--main-text)',
              lineHeight: 1.5,
              backgroundColor: 'var(--card-subtle)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {confirmTarget.targetActive ? (
                <>
                  <strong>{confirmTarget.user.name}</strong> will now be able to log in again. All their data remains intact and untouched.
                </>
              ) : (
                <>
                  <strong>{confirmTarget.user.name}</strong> will no longer be able to log in. Their data will not be deleted.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={actionLoading !== null}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--secondary-text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmToggle}
                disabled={actionLoading !== null}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: confirmTarget.targetActive ? '#10B981' : '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: actionLoading !== null ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading !== null ? (
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : confirmTarget.targetActive ? (
                  <UserCheck size={15} />
                ) : (
                  <UserX size={15} />
                )}
                <span>{confirmTarget.targetActive ? 'Enable Account' : 'Disable Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
