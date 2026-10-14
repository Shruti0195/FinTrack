import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Target,
  FileText,
  CheckCheck,
  Trash2,
  X,
  Sparkles,
  RotateCw
} from 'lucide-react';
import type { NotificationItem } from '../api/notifications';

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

export function groupNotifications(items: NotificationItem[]): {
  today: NotificationItem[];
  yesterday: NotificationItem[];
  earlier: NotificationItem[];
} {
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  for (const item of items) {
    const itemTime = new Date(item.created_at).getTime();
    if (itemTime >= startOfToday) {
      today.push(item);
    } else if (itemTime >= startOfYesterday) {
      yesterday.push(item);
    } else {
      earlier.push(item);
    }
  }

  return { today, yesterday, earlier };
}

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onMarkAllRead: () => void;
  onRemove: (item: NotificationItem) => void;
  onClearAll: () => void;
  onSelectNotification: (item: NotificationItem) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  onMarkAllRead,
  onRemove,
  onClearAll,
  onSelectNotification
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Resize listener for mobile styling
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) {
      setConfirmClearAll(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 60) {
      if (hasMore && !loadingMore && !loading) {
        onLoadMore();
      }
    }
  };

  const getNotifMeta = (item: NotificationItem) => {
    const isOverBudget =
      item.type.includes('100') ||
      item.type.includes('exceeded') ||
      (item.details?.percentage_used !== undefined && (item.details?.percentage_used || 0) >= 100);

    const isWarning =
      item.type.includes('80') ||
      item.type.includes('deadline') ||
      item.type.includes('inactive') ||
      item.type.includes('advisory');

    const isGoal =
      item.type.startsWith('goal') ||
      Boolean(item.goal_id) ||
      Boolean(item.details?.goal_title);

    const isReport = item.type === 'monthly_report';

    if (isOverBudget) {
      return {
        icon: <AlertTriangle size={16} color="var(--danger)" />,
        bg: 'var(--light-danger)'
      };
    }
    if (isWarning) {
      return {
        icon: <AlertCircle size={16} color="var(--warning)" />,
        bg: 'rgba(245, 158, 11, 0.12)'
      };
    }
    if (isGoal) {
      return {
        icon: <Target size={16} color="var(--accent)" />,
        bg: 'var(--light-accent)'
      };
    }
    if (isReport) {
      return {
        icon: <FileText size={16} color="var(--info)" />,
        bg: 'rgba(59, 130, 246, 0.12)'
      };
    }
    return {
      icon: <Bell size={16} color="var(--accent)" />,
      bg: 'var(--light-accent)'
    };
  };

  const { today, yesterday, earlier } = groupNotifications(notifications);

  const renderGroup = (title: string, groupItems: NotificationItem[]) => {
    if (groupItems.length === 0) return null;
    return (
      <div key={title} style={{ marginBottom: '8px' }}>
        <div
          style={{
            padding: '6px 16px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--secondary-text)',
            backgroundColor: 'var(--card-subtle)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)'
          }}
        >
          {title}
        </div>
        {groupItems.map((item) => {
          const meta = getNotifMeta(item);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectNotification(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectNotification(item);
                }
              }}
              aria-label={`Notification: ${item.title || item.message}`}
              style={{
                padding: '12px 14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                borderLeft: item.is_read ? '3px solid transparent' : '3px solid var(--accent)',
                backgroundColor: item.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.05)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = item.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.05)';
              }}
            >
              {/* Colored Category / Status Icon */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: meta.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              >
                {meta.icon}
              </div>

              {/* Text Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: item.is_read ? 600 : 700,
                      color: item.is_read ? 'var(--main-text)' : 'var(--primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.title || 'System Notification'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--secondary-text)', flexShrink: 0 }}>
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: '12.5px',
                    color: item.is_read ? 'var(--secondary-text)' : 'var(--main-text)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {item.message}
                </p>
              </div>

              {/* Cross Icon to remove */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item);
                }}
                title="Remove notification"
                aria-label="Remove notification"
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--light-danger)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--secondary-text)';
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop listener to close on click outside */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: isMobile ? 'rgba(15, 23, 42, 0.4)' : 'transparent'
        }}
      />

      {/* Dropdown Container */}
      <div
        role="region"
        aria-label="Notifications panel"
        style={{
          position: isMobile ? 'fixed' : 'absolute',
          top: isMobile ? '68px' : 'calc(100% + 8px)',
          left: isMobile ? '0' : 'auto',
          right: '0',
          width: isMobile ? '100%' : '420px',
          maxHeight: isMobile ? '60vh' : '520px',
          backgroundColor: 'var(--card)',
          borderRadius: isMobile ? '0 0 16px 16px' : 'var(--radius-card)',
          border: '1px solid var(--border)',
          borderTop: isMobile ? 'none' : '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        }}
      >
        {/* Fixed Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--card-subtle)',
            flexShrink: 0
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
                  borderRadius: '999px'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount} unread
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="btn btn-outline"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent)',
                borderColor: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              aria-label="Mark all notifications as read"
            >
              <CheckCheck size={14} />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Scrolling List Body (Max 400px on desktop, ~60% screen on mobile) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: isMobile ? 'calc(60vh - 115px)' : '400px'
          }}
        >
          {loading && notifications.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--secondary-text)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13.5px' }}>
                <RotateCw size={16} className="animate-spin" />
                <span>Loading notifications...</span>
              </div>
            </div>
          ) : error && notifications.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '12px' }}>
                {error}
              </div>
              <button
                onClick={onRetry}
                className="btn btn-outline"
                style={{ padding: '6px 14px', fontSize: '12.5px' }}
                aria-label="Retry loading notifications"
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            /* Friendly Empty State */
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--light-accent)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px'
                }}
              >
                <Sparkles size={24} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                You're all caught up.
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)' }}>
                No notifications right now.
              </div>
            </div>
          ) : (
            <>
              {renderGroup('Today', today)}
              {renderGroup('Yesterday', yesterday)}
              {renderGroup('Earlier', earlier)}

              {/* Loading More Indicator */}
              {loadingMore && (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RotateCw size={13} className="animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed Footer with "Clear all" */}
        {notifications.length > 0 && (
          <div
            style={{
              padding: '10px 18px',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--card-subtle)',
              flexShrink: 0
            }}
          >
            {confirmClearAll ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>
                  Remove all notifications? This can't be undone.
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    aria-label="Cancel clear all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmClearAll(false);
                      onClearAll();
                    }}
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      backgroundColor: 'var(--danger)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600
                    }}
                    aria-label="Confirm remove all notifications"
                  >
                    Remove all
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setConfirmClearAll(true)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--secondary-text)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 6px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--secondary-text)';
                  }}
                  aria-label="Clear all notifications"
                >
                  <Trash2 size={13} />
                  <span>Clear all</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
