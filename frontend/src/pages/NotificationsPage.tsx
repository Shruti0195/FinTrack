import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Target,
  Clock,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import type { NotificationItem } from '../api/notifications';
import { formatRelativeTime } from '../components/NotificationsDropdown';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onNavigateTab: (tab: string, targetId?: string | null) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onNavigateTab,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'budgets' | 'goals' | 'reports'>('all');

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'unread') return !item.is_read;
    if (activeFilter === 'budgets') return item.type.startsWith('budget');
    if (activeFilter === 'goals') return item.type.startsWith('goal');
    if (activeFilter === 'reports') return item.type === 'monthly_report';
    return true;
  });

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const getNotifMeta = (type: string) => {
    switch (type) {
      case 'income_expense_100':
        return {
          icon: <AlertTriangle size={18} color="var(--danger)" />,
          bg: 'rgba(239, 68, 68, 0.12)',
          tag: 'Income Overrun',
          tagBg: 'rgba(239, 68, 68, 0.12)',
          tagColor: 'var(--danger)',
        };
      case 'income_expense_80':
        return {
          icon: <AlertCircle size={18} color="var(--warning)" />,
          bg: 'rgba(245, 158, 11, 0.12)',
          tag: 'Income Advisory',
          tagBg: 'rgba(245, 158, 11, 0.12)',
          tagColor: 'var(--warning)',
        };
      case 'budget_100':
        return {
          icon: <AlertTriangle size={18} color="var(--danger)" />,
          bg: 'rgba(239, 68, 68, 0.12)',
          tag: 'Over Budget',
          tagBg: 'rgba(239, 68, 68, 0.12)',
          tagColor: 'var(--danger)',
        };
      case 'budget_80':
        return {
          icon: <AlertCircle size={18} color="var(--warning)" />,
          bg: 'rgba(245, 158, 11, 0.12)',
          tag: 'Budget Warning',
          tagBg: 'rgba(245, 158, 11, 0.12)',
          tagColor: 'var(--warning)',
        };
      case 'goal_milestone':
        return {
          icon: <Target size={18} color="var(--accent)" />,
          bg: 'var(--light-accent)',
          tag: 'Goal Progress',
          tagBg: 'var(--light-accent)',
          tagColor: 'var(--accent)',
        };
      case 'goal_deadline':
        return {
          icon: <Clock size={18} color="var(--warning)" />,
          bg: 'rgba(245, 158, 11, 0.12)',
          tag: 'Goal Deadline',
          tagBg: 'rgba(245, 158, 11, 0.12)',
          tagColor: 'var(--warning)',
        };
      case 'monthly_report':
        return {
          icon: <FileText size={18} color="var(--info)" />,
          bg: 'rgba(59, 130, 246, 0.12)',
          tag: 'Monthly Report',
          tagBg: 'rgba(59, 130, 246, 0.12)',
          tagColor: 'var(--info)',
        };
      default:
        return {
          icon: <Bell size={18} color="var(--secondary)" />,
          bg: 'var(--card-subtle)',
          tag: 'System',
          tagBg: 'var(--card-subtle)',
          tagColor: 'var(--secondary-text)',
        };
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 20px' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              Notifications & Alerts
            </h1>
            {unreadCount > 0 && (
              <span style={{
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px'
              }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginTop: '4px' }}>
            Smart, calm advisory warnings for budgets, goal milestones, and financial reports.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCheck size={16} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'budgets', label: 'Budgets' },
          { key: 'goals', label: 'Goals' },
          { key: 'reports', label: 'Reports' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: activeFilter === tab.key ? 700 : 500,
              borderRadius: '8px',
              border: activeFilter === tab.key ? '1px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: activeFilter === tab.key ? 'var(--light-accent)' : 'var(--card)',
              color: activeFilter === tab.key ? 'var(--accent)' : 'var(--secondary-text)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="card-box" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--light-accent)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Sparkles size={24} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)' }}>
            You're all caught up!
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginTop: '4px' }}>
            {activeFilter === 'all'
              ? 'No notifications present right now.'
              : `No ${activeFilter} notifications found.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredNotifications.map((item) => {
            const meta = getNotifMeta(item.type);
            return (
              <div
                key={item.id}
                className="card-box"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  backgroundColor: item.is_read ? 'var(--card)' : 'rgba(16, 185, 129, 0.04)',
                  border: item.is_read ? '1px solid var(--border)' : '1px solid var(--accent)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Icon Container */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: meta.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {meta.icon}
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
                      {item.title || 'System Alert'}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: meta.tagBg,
                      color: meta.tagColor
                    }}>
                      {meta.tag}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginLeft: 'auto' }}>
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                    {item.message}
                  </p>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => {
                        if (!item.is_read) onMarkRead(item.id);
                        const targetId = item.budget_id || item.goal_id || null;
                        const tab = (item.type === 'monthly_report' || item.target_tab === 'reports')
                          ? 'analytics'
                          : (item.target_tab && item.target_tab !== 'dashboard')
                          ? item.target_tab
                          : (item.budget_id ? 'budgets' : item.goal_id ? 'goals' : 'budgets');
                        onNavigateTab(tab, targetId);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>
                        {item.budget_id
                          ? 'View Budget Card'
                          : item.goal_id
                            ? 'View Goal Card'
                            : item.type.startsWith('income_expense')
                              ? 'View Expenses'
                              : 'View Details'}
                      </span>
                      <ArrowRight size={13} />
                    </button>

                    {!item.is_read && (
                      <button
                        onClick={() => onMarkRead(item.id)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--secondary-text)',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Mark as read
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(item.id)}
                      title="Delete notification"
                      style={{
                        marginLeft: 'auto',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--secondary-text)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary-text)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
