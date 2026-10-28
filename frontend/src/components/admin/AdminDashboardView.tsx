import React, { useEffect, useState } from 'react';
import {
  Users,
  FolderTree,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import {
  fetchAdminMetrics,
  type AdminMetrics,
  type ReportedIssueSummary,
  type RecentUserSummary,
  type TopCategorySummary
} from '../../api/admin';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: 'dashboard' | 'users' | 'categories' | 'issues', issueId?: string) => void;
  userName?: string;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateTab,
  userName = 'Administrator'
}) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await fetchAdminMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to load admin metrics:', err);
      const detailMsg = err?.response?.data?.detail;
      setError(
        typeof detailMsg === 'string'
          ? detailMsg
          : 'Unable to load admin dashboard statistics. Please check server connectivity and retry.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  // Format status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return {
          bg: 'rgba(59, 130, 246, 0.12)',
          color: '#3B82F6',
          border: 'rgba(59, 130, 246, 0.3)',
          label: 'Open'
        };
      case 'In progress':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          color: '#F59E0B',
          border: 'rgba(245, 158, 11, 0.3)',
          label: 'In Progress'
        };
      case 'Resolved':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          color: '#10B981',
          border: 'rgba(16, 185, 129, 0.3)',
          label: 'Resolved'
        };
      case 'Closed':
        return {
          bg: 'rgba(100, 116, 139, 0.12)',
          color: '#64748B',
          border: 'rgba(100, 116, 139, 0.3)',
          label: 'Closed'
        };
      default:
        return {
          bg: 'rgba(100, 116, 139, 0.12)',
          color: 'var(--secondary-text)',
          border: 'var(--border)',
          label: status
        };
    }
  };

  // Format type badge color
  const getTypeBadgeColor = (type?: string) => {
    switch (type) {
      case 'Something is broken':
        return '#EF4444';
      case 'I have a question':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'U'
    );
  };

  // 1. LOADING SKELETON STATE
  if (loading && !metrics) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.25; }
          }
          .skeleton-pulse {
            animation: pulse 1.5s ease-in-out infinite;
            background-color: var(--card-subtle);
          }
        `}</style>
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="skeleton-pulse" style={{ width: '220px', height: '28px', borderRadius: '6px', marginBottom: '8px' }} />
            <div className="skeleton-pulse" style={{ width: '340px', height: '16px', borderRadius: '4px' }} />
          </div>
          <div className="skeleton-pulse" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
        </div>

        {/* 4 Cards Skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton-pulse"
              style={{
                height: '140px',
                borderRadius: 'var(--radius-card, 12px)',
                border: '1px solid var(--border)'
              }}
            />
          ))}
        </div>

        {/* Mid Section Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="skeleton-pulse" style={{ height: '260px', borderRadius: 'var(--radius-card, 12px)', border: '1px solid var(--border)' }} />
          <div className="skeleton-pulse" style={{ height: '260px', borderRadius: 'var(--radius-card, 12px)', border: '1px solid var(--border)' }} />
        </div>

        {/* Recent Issues Skeleton */}
        <div className="skeleton-pulse" style={{ height: '240px', borderRadius: 'var(--radius-card, 12px)', border: '1px solid var(--border)' }} />
      </div>
    );
  }

  // 2. ERROR STATE (WITH WORKING RETRY)
  if (error && !metrics) {
    return (
      <div style={{ padding: '24px 0' }}>
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid #EF4444',
          borderRadius: 'var(--radius-card, 12px)',
          padding: '28px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          color: '#EF4444'
        }}>
          <AlertCircle size={32} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', color: 'var(--main-text)' }}>
              Unable to load admin dashboard statistics
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--secondary-text)' }}>
              {error}
            </div>
          </div>
          <button
            onClick={() => loadMetrics(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-btn, 8px)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // 4 SUMMARY STATISTIC CARDS (Goal card removed)
  const statCards = [
    {
      id: 'users',
      title: 'Total Users',
      value: metrics?.total_users ?? 0,
      description: 'Registered users in FinTrack',
      icon: Users,
      iconColor: '#3B82F6',
      iconBg: 'rgba(59, 130, 246, 0.12)',
      actionLabel: 'View Users',
      onClick: () => onNavigateTab?.('users')
    },
    {
      id: 'categories',
      title: 'Total Categories',
      value: metrics?.total_categories ?? 0,
      description: 'Standard active categories',
      icon: FolderTree,
      iconColor: '#10B981',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      actionLabel: 'Manage Categories',
      onClick: () => onNavigateTab?.('categories')
    },
    {
      id: 'income_categories',
      title: 'Income Categories',
      value: metrics?.income_categories ?? 0,
      description: 'Income sources & streams',
      icon: ArrowDownLeft,
      iconColor: '#059669',
      iconBg: 'rgba(5, 150, 105, 0.12)',
      actionLabel: 'View Income',
      onClick: () => onNavigateTab?.('categories')
    },
    {
      id: 'expense_categories',
      title: 'Expense Categories',
      value: metrics?.expense_categories ?? 0,
      description: 'Spending & outflow types',
      icon: ArrowUpRight,
      iconColor: '#D97706',
      iconBg: 'rgba(217, 119, 6, 0.12)',
      actionLabel: 'View Expenses',
      onClick: () => onNavigateTab?.('categories')
    }
  ];

  const recentUsers = metrics?.recent_users || [];
  const topIncomeCats = metrics?.top_income_categories || [];
  const topExpenseCats = metrics?.top_expense_categories || [];
  const latestIssues = metrics?.latest_issues || [];

  const maxIncomeTxns = Math.max(...topIncomeCats.map((c) => c.transaction_count), 1);
  const maxExpenseTxns = Math.max(...topExpenseCats.map((c) => c.transaction_count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. TOP HEADING & WELCOME BAR */}
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
              fontWeight: 800,
              color: 'var(--main-text)',
              letterSpacing: '-0.02em'
            }}>
              Admin Dashboard
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
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <ShieldCheck size={12} /> Live Telemetry
            </span>
          </div>
          <p style={{
            margin: '6px 0 0',
            fontSize: '13.5px',
            color: 'var(--secondary-text)'
          }}>
            Welcome back, <strong>{userName}</strong>. Real-time overview of users, category usage, and recent support requests.
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => loadMetrics(true)}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-btn, 8px)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            color: 'var(--main-text)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!refreshing) {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }
          }}
          onMouseLeave={(e) => {
            if (!refreshing) {
              e.currentTarget.style.backgroundColor = 'var(--card)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: refreshing ? 'spin 1s linear infinite' : 'none'
            }}
          />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* 2. FOUR SUMMARY CARDS (GOAL CARD REMOVED) */}
      <section aria-label="Platform Statistics">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.id}
                onClick={card.onClick}
                tabIndex={0}
                role="button"
                aria-label={`${card.title}: ${card.value.toLocaleString()}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    card.onClick();
                  }
                }}
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card, 12px)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = card.iconColor;
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Card Top: Title & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--secondary-text)'
                  }}>
                    {card.title}
                  </span>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: card.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.iconColor
                  }}>
                    <Icon size={20} />
                  </div>
                </div>

                {/* Card Middle: Large Value & Context */}
                <div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    color: 'var(--main-text)',
                    lineHeight: 1.1,
                    letterSpacing: '-0.03em'
                  }}>
                    {card.value.toLocaleString()}
                  </div>
                  <div style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: 'var(--secondary-text)'
                  }}>
                    {card.description}
                  </div>
                </div>

                {/* Card Bottom: Navigation Action */}
                <div style={{
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: card.iconColor
                }}>
                  <span>{card.actionLabel}</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. RECENT 3 USERS & TOP USED CATEGORIES (RESPONSIVE 2-COLUMN SECTION) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        
        {/* LEFT COLUMN: RECENT 3 REGISTERED USERS */}
        <section
          aria-label="Recent Registered Users"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card, 12px)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={16} />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--main-text)'
                }}>
                  Recent Users
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                  Latest 3 registered accounts
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab?.('users')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-btn, 6px)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.color = '#3B82F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--main-text)';
              }}
            >
              <span>View All Users</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Users List */}
          {recentUsers.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--secondary-text)',
              fontSize: '13px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              No registered users yet.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
              justifyContent: 'space-between'
            }}>
              {recentUsers.slice(0, 3).map((u: RecentUserSummary) => {
                const initials = getInitials(u.name);
                const regDate = new Date(u.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <div
                    key={u.id}
                    onClick={() => onNavigateTab?.('users')}
                    tabIndex={0}
                    role="button"
                    aria-label={`User ${u.name} (${u.email})`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onNavigateTab?.('users');
                      }
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--card-subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                      flex: 1,
                      minHeight: '66px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.backgroundColor = 'var(--card)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 3px 8px rgba(59, 130, 246, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      {/* Initials Avatar */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: '2px solid #3B82F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0
                      }}>
                        {initials}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color: 'var(--main-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {u.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--secondary-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '2px'
                        }}>
                          {u.email}
                        </div>
                      </div>
                    </div>

                    {/* Role & Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: u.role === 'ADMIN' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                          color: u.role === 'ADMIN' ? '#8B5CF6' : '#3B82F6'
                        }}>
                          {u.role}
                        </span>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: u.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: u.is_active ? '#10B981' : '#EF4444'
                        }}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div style={{
                        fontSize: '11.5px',
                        color: 'var(--secondary-text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={11} />
                        <span>{regDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: TOP USED 3 CATEGORIES OF INCOME & EXPENSE */}
        <section
          aria-label="Top Used Categories"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card, 12px)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={16} />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--main-text)'
                }}>
                  Top Used Categories
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                  By platform transaction volume
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab?.('categories')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-btn, 6px)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--main-text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10B981';
                e.currentTarget.style.color = '#10B981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--main-text)';
              }}
            >
              <span>Manage Categories</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Sub-grid: Income (Top 3) & Expense (Top 3) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            flex: 1
          }}>
            {/* Top 3 Income Categories */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              flex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#059669'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(5, 150, 105, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ArrowDownLeft size={15} />
                  </div>
                  Top Income
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--secondary-text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Volume
                </span>
              </div>

              {topIncomeCats.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', padding: '24px 0', textAlign: 'center' }}>
                  No income transactions yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-between' }}>
                  {topIncomeCats.slice(0, 3).map((cat: TopCategorySummary, idx: number) => {
                    const pct = Math.min(100, Math.round((cat.transaction_count / maxIncomeTxns) * 100));

                    return (
                      <div
                        key={cat.id}
                        onClick={() => onNavigateTab?.('categories')}
                        tabIndex={0}
                        role="button"
                        aria-label={`Income Category ${cat.name} with ${cat.transaction_count} transactions`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            onNavigateTab?.('categories');
                          }
                        }}
                        style={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#059669';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 3px 8px rgba(5, 150, 105, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#059669',
                              width: '20px',
                              height: '20px',
                              borderRadius: '5px',
                              backgroundColor: 'rgba(5, 150, 105, 0.12)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              #{idx + 1}
                            </span>
                            <span style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: 'var(--main-text)'
                            }}>
                              {cat.name}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(5, 150, 105, 0.12)',
                            color: '#059669'
                          }}>
                            {cat.transaction_count} txns
                          </span>
                        </div>

                        {/* Progress Bar with Track */}
                        <div style={{
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(5, 150, 105, 0.12)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: '#059669',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top 3 Expense Categories */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              flex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#D97706'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ArrowUpRight size={15} />
                  </div>
                  Top Expense
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--secondary-text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Volume
                </span>
              </div>

              {topExpenseCats.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', padding: '24px 0', textAlign: 'center' }}>
                  No expense transactions yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-between' }}>
                  {topExpenseCats.slice(0, 3).map((cat: TopCategorySummary, idx: number) => {
                    const pct = Math.min(100, Math.round((cat.transaction_count / maxExpenseTxns) * 100));

                    return (
                      <div
                        key={cat.id}
                        onClick={() => onNavigateTab?.('categories')}
                        tabIndex={0}
                        role="button"
                        aria-label={`Expense Category ${cat.name} with ${cat.transaction_count} transactions`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            onNavigateTab?.('categories');
                          }
                        }}
                        style={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#D97706';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 3px 8px rgba(217, 119, 6, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#D97706',
                              width: '20px',
                              height: '20px',
                              borderRadius: '5px',
                              backgroundColor: 'rgba(217, 119, 6, 0.12)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              #{idx + 1}
                            </span>
                            <span style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: 'var(--main-text)'
                            }}>
                              {cat.name}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(217, 119, 6, 0.12)',
                            color: '#D97706'
                          }}>
                            {cat.transaction_count} txns
                          </span>
                        </div>

                        {/* Progress Bar with Track */}
                        <div style={{
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(217, 119, 6, 0.12)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: '#D97706',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 4. RECENT REPORTED ISSUES SECTION */}
      <section aria-label="Recent Reported Issues" style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card, 12px)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--main-text)',
              letterSpacing: '-0.01em'
            }}>
              Recent Reported Issues
            </h2>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: 'var(--secondary-text)'
            }}>
              Latest 3 user support requests and feedback
            </p>
          </div>

          <button
            onClick={() => onNavigateTab?.('issues')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-btn, 8px)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card-subtle)',
              color: 'var(--main-text)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)';
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = '#10B981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--main-text)';
            }}
          >
            <span>View All Issues</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Issues List or Empty State */}
        {latestIssues.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--card-subtle)',
            borderRadius: 'var(--radius-card, 8px)',
            border: '1px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--main-text)' }}>
              No reported issues yet.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--secondary-text)', maxWidth: '380px' }}>
              Nice work! There are currently no user-reported questions or bugs in the queue.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {latestIssues.slice(0, 3).map((issue: ReportedIssueSummary) => {
              const statusBadge = getStatusBadge(issue.status);
              const typeColor = getTypeBadgeColor(issue.report_type);
              const formattedDate = new Date(issue.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const formattedTime = new Date(issue.created_at).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={issue.id}
                  onClick={() => onNavigateTab?.('issues', issue.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Issue #${issue.report_number || '101'}: ${issue.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onNavigateTab?.('issues', issue.id);
                    }
                  }}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-subtle)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    flexWrap: 'wrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.backgroundColor = 'var(--card)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {/* Left: Report Number, Badges, Title & Description */}
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#3B82F6',
                        fontFamily: 'monospace'
                      }}>
                        #{issue.report_number || '101'}
                      </span>

                      {issue.report_type && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: `${typeColor}18`,
                          color: typeColor
                        }}>
                          {issue.report_type}
                        </span>
                      )}

                      {issue.page && (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--secondary-text)',
                          backgroundColor: 'var(--card)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)'
                        }}>
                          {issue.page}
                        </span>
                      )}
                    </div>

                    <div style={{
                      fontWeight: 700,
                      fontSize: '14.5px',
                      color: 'var(--main-text)',
                      marginBottom: '4px'
                    }}>
                      {issue.title}
                    </div>

                    {issue.description && (
                      <div
                        title={issue.description}
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--secondary-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '650px'
                        }}
                      >
                        {issue.description}
                      </div>
                    )}
                  </div>

                  {/* Middle: Reporter info & Timestamp */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '3px',
                    minWidth: '150px'
                  }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)' }}>
                      {issue.reporter_name || 'FinTrack User'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                      {issue.reporter_email || 'N/A'}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--secondary-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '2px'
                    }}>
                      <Clock size={11} />
                      <span>{formattedDate} • {formattedTime}</span>
                    </div>
                  </div>

                  {/* Right: Status badge & View Details action */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: '16px',
                      backgroundColor: statusBadge.bg,
                      color: statusBadge.color,
                      border: `1px solid ${statusBadge.border}`
                    }}>
                      {statusBadge.label}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateTab?.('issues', issue.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-btn, 6px)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--main-text)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#10B981';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#10B981';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--card)';
                        e.currentTarget.style.color = 'var(--main-text)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <span>View Details</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
