import React from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Target,
  Clock,
  FileText,
  CheckCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import type { NotificationItem } from '../api/notifications';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateTab: (tab: string, targetId?: string | null) => void;
  onViewAll: () => void;
}

export const formatRelativeTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onNavigateTab,
  onViewAll,
}) => {
  if (!isOpen) return null;

  const getNotifMeta = (type: string) => {
    switch (type) {
      case 'income_expense_100':
      case 'budget_100':
        return {
          icon: <AlertTriangle size={16} color="var(--danger)" />,
          bg: 'rgba(239, 68, 68, 0.12)',
          borderColor: 'var(--danger)',
        };
      case 'income_expense_80':
      case 'budget_80':
        return {
          icon: <AlertCircle size={16} color="var(--warning)" />,
          bg: 'rgba(245, 158, 11, 0.12)',
          borderColor: 'var(--warning)',
        };
      case 'goal_milestone':
        return {
          icon: <Target size={16} color="var(--accent)" />,
          bg: 'var(--light-accent)',
          borderColor: 'var(--accent)',
        };
      case 'goal_deadline':
        return {
          icon: <Clock size={16} color="var(--warning)" />,
          bg: 'rgba(245, 158, 11, 0.12)',
          borderColor: 'var(--warning)',
        };
      case 'monthly_report':
        return {
          icon: <FileText size={16} color="var(--info)" />,
          bg: 'rgba(59, 130, 246, 0.12)',
          borderColor: 'var(--info)',
        };
      default:
        return {
          icon: <Bell size={16} color="var(--secondary)" />,
          bg: 'var(--card-subtle)',
          borderColor: 'var(--border)',
        };
    }
  };

  return (
    <>
      {/* Backdrop listener */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'transparent',
        }}
      />

      {/* Dropdown Card */}
      <div
        style={{
          position: 'absolute',
          top: '52px',
          right: '0',
          width: '380px',
          maxHeight: '490px',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--card-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '999px',
                }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* List Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--light-accent)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Sparkles size={22} />
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--primary)' }}>
                You're all caught up!
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                No notifications to display right now.
              </div>
            </div>
          ) : (
            notifications.slice(0, 8).map((item) => {
              const meta = getNotifMeta(item.type);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.is_read) onMarkRead(item.id);
                    const targetId = item.budget_id || item.goal_id || null;
                    const tab = (item.target_tab && item.target_tab !== 'dashboard') ? item.target_tab : (item.budget_id ? 'budgets' : item.goal_id ? 'goals' : 'budgets');
                    onNavigateTab(tab, targetId);
                    onClose();
                  }}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: item.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.04)',
                    transition: 'background-color 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = item.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.04)';
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '3px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: item.is_read ? 600 : 700,
                          color: 'var(--primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          paddingRight: '6px',
                        }}
                      >
                        {item.title || 'System Notification'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--secondary-text)',
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '12.5px',
                        color: 'var(--secondary-text)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.message}
                    </p>
                  </div>

                  {/* Unread dot indicator */}
                  {!item.is_read && (
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)',
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--card-subtle)',
            textAlign: 'center',
          }}
        >
          <button
            onClick={() => {
              onViewAll();
              onClose();
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--accent)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View all notifications</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
};
