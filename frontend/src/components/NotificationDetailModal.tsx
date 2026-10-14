import React, { useEffect } from 'react';
import {
  X,
  AlertTriangle,
  AlertCircle,
  Target,
  Clock,
  FileText,
  Bell,
  Trash2,
  ExternalLink
} from 'lucide-react';
import type { NotificationItem } from '../api/notifications';

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (item: NotificationItem) => void;
  onNavigateTab: (tab: string, targetId?: string | null) => void;
}

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const formatFullDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onRemove,
  onNavigateTab,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !notification) return null;

  const isOverBudget =
    notification.type.includes('100') ||
    notification.type.includes('exceeded') ||
    (notification.details?.percentage_used !== undefined && (notification.details?.percentage_used || 0) >= 100);

  const isWarning =
    notification.type.includes('80') ||
    notification.type.includes('deadline') ||
    notification.type.includes('inactive') ||
    notification.type.includes('advisory');

  const isGoal =
    notification.type.startsWith('goal') ||
    Boolean(notification.goal_id) ||
    Boolean(notification.details?.goal_title);

  const isBudget =
    notification.type.startsWith('budget') ||
    Boolean(notification.budget_id) ||
    Boolean(notification.details?.category_name);

  const isReport = notification.type === 'monthly_report';

  // Meta styling
  let iconComponent = <Bell size={22} color="var(--primary)" />;
  let badgeColor = 'var(--accent)';
  let badgeBg = 'var(--light-accent)';

  if (isOverBudget) {
    iconComponent = <AlertTriangle size={22} color="var(--danger)" />;
    badgeColor = 'var(--danger)';
    badgeBg = 'var(--light-danger)';
  } else if (isWarning) {
    iconComponent = <AlertCircle size={22} color="var(--warning)" />;
    badgeColor = 'var(--warning)';
    badgeBg = 'rgba(245, 158, 11, 0.12)';
  } else if (isGoal) {
    iconComponent = <Target size={22} color="var(--accent)" />;
    badgeColor = 'var(--accent)';
    badgeBg = 'var(--light-accent)';
  } else if (isReport) {
    iconComponent = <FileText size={22} color="var(--info)" />;
    badgeColor = 'var(--info)';
    badgeBg = 'rgba(59, 130, 246, 0.12)';
  }

  // Primary action button setup
  let primaryActionLabel = 'Open Dashboard';
  let primaryTab = 'dashboard';
  let primaryTargetId: string | null = null;

  if (isBudget) {
    primaryActionLabel = 'Open Budgets';
    primaryTab = 'budgets';
    primaryTargetId = notification.budget_id || null;
  } else if (isGoal) {
    primaryActionLabel = 'Open this Goal';
    primaryTab = 'goals';
    primaryTargetId = notification.goal_id || null;
  } else if (isReport) {
    primaryActionLabel = 'Open Analytics';
    primaryTab = 'analytics';
  } else if (notification.target_tab && notification.target_tab !== 'dashboard') {
    primaryTab = notification.target_tab;
    primaryActionLabel = `Open ${primaryTab.charAt(0).toUpperCase() + primaryTab.slice(1)}`;
  }

  const handlePrimaryClick = () => {
    onNavigateTab(primaryTab, primaryTargetId);
    onClose();
  };

  const handleRemoveClick = () => {
    onRemove(notification);
    onClose();
  };

  const details = notification.details;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-detail-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card-box"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.18s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            backgroundColor: 'var(--card-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: badgeBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {iconComponent}
            </div>
            <div>
              <h2
                id="notification-detail-title"
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  margin: 0,
                  lineHeight: 1.3
                }}
              >
                {notification.title || 'Notification Details'}
              </h2>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--secondary-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px'
                }}
              >
                <Clock size={12} />
                <span>{formatFullDateTime(notification.created_at)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close detail modal"
            className="theme-toggle-btn"
            style={{ width: '32px', height: '32px', flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Message Text */}
          <div
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--main-text)',
              backgroundColor: 'var(--bg)',
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}
          >
            {notification.message}
          </div>

          {/* Figures Involved Breakdown */}
          {details && (
            <div
              style={{
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card-subtle)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--secondary-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isBudget ? 'Budget Figures' : isGoal ? 'Goal Figures' : 'Summary Figures'}
                </span>
                {details.category_name && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: badgeBg,
                      color: badgeColor
                    }}
                  >
                    {details.category_name}
                  </span>
                )}
                {details.goal_title && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--light-accent)',
                      color: 'var(--accent)'
                    }}
                  >
                    {details.goal_title}
                  </span>
                )}
              </div>

              {/* Budget metrics */}
              {isBudget && (details.spent_amount !== undefined || details.limit_amount !== undefined) && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Amount Spent</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: isOverBudget ? 'var(--danger)' : 'var(--primary)', marginTop: '2px' }}>
                        {formatINR(details.spent_amount || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Budget Limit</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                        {formatINR(details.limit_amount || 0)}
                      </div>
                    </div>
                  </div>

                  {details.percentage_used !== undefined && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                        <span>Budget Used</span>
                        <span style={{ fontWeight: 700, color: isOverBudget ? 'var(--danger)' : 'var(--accent)' }}>
                          {details.percentage_used}%
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, details.percentage_used || 0)}%`,
                            backgroundColor: isOverBudget ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--accent)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Goal metrics */}
              {isGoal && (details.saved_amount !== undefined || details.target_amount !== undefined) && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Saved So Far</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                        {formatINR(details.saved_amount || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Target Goal</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                        {formatINR(details.target_amount || 0)}
                      </div>
                    </div>
                  </div>

                  {details.goal_percentage !== undefined && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                        <span>Progress Reached</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {details.goal_percentage}%
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, details.goal_percentage || 0)}%`,
                            backgroundColor: 'var(--accent)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--card-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={handleRemoveClick}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '13px',
              color: 'var(--danger)',
              borderColor: 'var(--danger)'
            }}
            aria-label="Remove notification"
          >
            <Trash2 size={15} />
            <span>Remove</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: '9px 16px', fontSize: '13px' }}
            >
              Close
            </button>
            <button
              onClick={handlePrimaryClick}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <span>{primaryActionLabel}</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
