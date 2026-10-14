import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  LayoutDashboard, 
  Receipt, 
  Target, 
  PieChart, 
  BookOpen, 
  Settings, 
  HelpCircle, 
  Bell, 
  LogOut, 
  Sparkles,
  PlusCircle,
  BarChart3,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { IncomePage } from './IncomePage';
import { ExpensePage } from './ExpensePage';
import { BudgetsView } from '../components/BudgetsView';
import { GoalsView } from '../components/GoalsView';
import { DashboardView } from '../components/DashboardView';
import { AnalyticsView } from '../components/AnalyticsView';
import { PeriodFilterDropdown } from '../components/PeriodFilterDropdown';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  type NotificationItem
} from '../api/notifications';
import { NotificationsDropdown } from '../components/NotificationsDropdown';
import { NotificationDetailModal } from '../components/NotificationDetailModal';
import { SettingsView } from '../components/SettingsView';
import { NotFoundPage } from './NotFoundPage';

interface DashboardPageProps {
  onLogout: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

const VALID_TABS = [
  'dashboard',
  'analytics',
  'income',
  'transactions',
  'expenses',
  'budgets',
  'goals',
  'tips',
  'settings',
  'help'
];

const getInitialTab = (): string => {
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (hash) {
    if (VALID_TABS.includes(hash)) {
      return hash;
    }
    return 'not-found';
  }
  const saved = localStorage.getItem('fintrack_active_tab')?.toLowerCase();
  if (saved && VALID_TABS.includes(saved)) {
    return saved;
  }
  return 'dashboard';
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  const setActiveTab = React.useCallback((tab: string) => {
    const targetTab = VALID_TABS.includes(tab) ? tab : 'dashboard';
    setActiveTabState(targetTab);
    localStorage.setItem('fintrack_active_tab', targetTab);
    if (window.location.hash.replace(/^#\/?/, '') !== targetTab) {
      window.history.replaceState(null, '', `#${targetTab}`);
    }
  }, []);

  // Sync when browser Back / Forward buttons are clicked or hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      if (!hash) {
        setActiveTabState('dashboard');
        return;
      }
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        localStorage.setItem('fintrack_active_tab', hash);
      } else {
        setActiveTabState('not-found');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Ensure initial hash is in the URL on mount (if valid tab)
  useEffect(() => {
    if (!window.location.hash && activeTab !== 'not-found') {
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, [activeTab]);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Notifications State & Infinite Scroll
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [loadingMoreNotifs, setLoadingMoreNotifs] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [hasMoreNotifs, setHasMoreNotifs] = useState(false);
  
  // Detail Modal & Undo State
  const [selectedDetailNotif, setSelectedDetailNotif] = useState<NotificationItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [removedNotificationUndo, setRemovedNotificationUndo] = useState<{
    item: NotificationItem;
    timerId: any;
  } | null>(null);

  const [highlightedBudgetId, setHighlightedBudgetId] = useState<string | null>(null);
  const [highlightedGoalId, setHighlightedGoalId] = useState<string | null>(null);

  const handleNavigateWithHighlight = (tab: string, targetId?: string | null) => {
    let target = tab;
    if (target === 'reports' || target === 'notifications') target = 'analytics';
    const validTab = (target && target !== 'dashboard') ? target : (targetId ? 'budgets' : 'budgets');
    if (validTab === 'budgets') {
      setHighlightedBudgetId(targetId || null);
    } else if (validTab === 'goals') {
      setHighlightedGoalId(targetId || null);
    }
    setActiveTab(validTab);
  };

  const loadNotifications = React.useCallback(async (offset = 0, isAppend = false) => {
    if (isAppend) {
      setLoadingMoreNotifs(true);
    } else {
      setLoadingNotifs(true);
      setNotifError(null);
    }
    try {
      const data = await fetchNotifications(offset, 20);
      if (isAppend) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = (data.items || []).filter((n) => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
      } else {
        setNotifications(data.items || []);
      }
      setUnreadNotifCount(data.unread_count || 0);
      setHasMoreNotifs(Boolean(data.has_more));
    } catch (err: any) {
      if (!isAppend) {
        setNotifError(err.response?.data?.detail || 'Failed to load notifications.');
      }
    } finally {
      setLoadingNotifs(false);
      setLoadingMoreNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(0, false);
    const interval = setInterval(() => {
      // Periodically refresh initial list without wiping user's scrolled items if dropdown is open
      fetchNotifications(0, 20)
        .then((data) => {
          setUnreadNotifCount(data.unread_count || 0);
          setNotifications((prev) => {
            if (prev.length <= 20) return data.items || [];
            // Preserve deeper scrolled pages
            const newTopIds = new Set((data.items || []).map(i => i.id));
            const olderItems = prev.filter(i => !newTopIds.has(i.id));
            return [...(data.items || []), ...olderItems];
          });
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleLoadMoreNotifs = () => {
    if (!loadingMoreNotifs && hasMoreNotifs) {
      loadNotifications(notifications.length, true);
    }
  };

  // Open detail popup on row click (marks read, never deletes)
  const handleSelectNotification = async (item: NotificationItem) => {
    setIsNotifDropdownOpen(false);
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadNotifCount((cnt) => Math.max(0, cnt - 1));
      } catch {}
    }
    setSelectedDetailNotif({ ...item, is_read: true });
    setIsDetailModalOpen(true);
  };

  // Mark all as read (never deletes)
  const handleMarkAllNotifsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
    } catch {}
  };

  // Remove notification with 5-second Undo grace period
  const handleRemoveNotification = (item: NotificationItem) => {
    // If there is an existing pending deletion, finalize it now
    if (removedNotificationUndo) {
      clearTimeout(removedNotificationUndo.timerId);
      deleteNotification(removedNotificationUndo.item.id).catch(() => {});
    }

    // Optimistically remove from list
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    if (!item.is_read) {
      setUnreadNotifCount((cnt) => Math.max(0, cnt - 1));
    }

    // Set 5-second undo timer
    const timerId = setTimeout(() => {
      deleteNotification(item.id).catch(() => {});
      setRemovedNotificationUndo((current) => (current?.item.id === item.id ? null : current));
    }, 5000);

    setRemovedNotificationUndo({ item, timerId });
  };

  const handleUndoRemoval = () => {
    if (!removedNotificationUndo) return;
    clearTimeout(removedNotificationUndo.timerId);
    const restored = removedNotificationUndo.item;
    setNotifications((prev) => {
      const combined = [...prev, restored];
      return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    if (!restored.is_read) {
      setUnreadNotifCount((cnt) => cnt + 1);
    }
    setRemovedNotificationUndo(null);
  };

  // Clear all notifications
  const handleClearAllNotifs = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadNotifCount(0);
      setHasMoreNotifs(false);
      if (removedNotificationUndo) {
        clearTimeout(removedNotificationUndo.timerId);
        setRemovedNotificationUndo(null);
      }
    } catch {}
  };

  // Period filter states: Monthly, Quarterly, Half Year, Year (defaults dynamically to current calendar period)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  const currentHalf = currentMonth <= 6 ? 1 : 2;

  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'half_year' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [selectedHalf, setSelectedHalf] = useState<number>(currentHalf);

  const monthsShort = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let periodLabel = `${monthsShort[selectedMonth]} ${selectedYear}`;
  if (periodType === 'quarterly') {
    const qLabels = ['', 'Jan - Mar', 'Apr - Jun', 'Jul - Sep', 'Oct - Dec'];
    periodLabel = `Q${selectedQuarter} ${selectedYear} (${qLabels[selectedQuarter]})`;
  } else if (periodType === 'half_year') {
    const hLabels = ['', 'Jan - Jun', 'Jul - Dec'];
    periodLabel = `H${selectedHalf} ${selectedYear} (${hLabels[selectedHalf]})`;
  } else if (periodType === 'yearly') {
    periodLabel = `Year ${selectedYear}`;
  }

  useEffect(() => {
    // Fetch logged in user details
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch((err) => {
        console.error('Failed to verify user session:', err);
        onLogout();
      });
  }, [onLogout]);

  const userName = user?.name || 'User';
  const userInitials = userName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const handleProfileUpdate = (updated: { name: string; email?: string }) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : { name: updated.name, email: updated.email || '', role: 'user' }));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      
      {/* 1. SIDEBAR (Matching Template Image) */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        backgroundColor: 'var(--card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}>
        <div>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                FinTrack
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'dashboard' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'dashboard' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'dashboard' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'analytics' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'analytics' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'analytics' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <BarChart3 size={18} />
              Analytics
            </button>

            <button
              onClick={() => setActiveTab('income')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'income' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'income' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'income' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <PlusCircle size={18} />
              Income
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'transactions' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'transactions' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'transactions' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Receipt size={18} />
              Transactions
            </button>

            <button
              onClick={() => setActiveTab('budgets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'budgets' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'budgets' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'budgets' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <PieChart size={18} />
              Budgets
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'goals' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'goals' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'goals' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Target size={18} />
              Goals
            </button>

            <button
              onClick={() => setActiveTab('tips')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'tips' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'tips' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'tips' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <BookOpen size={18} />
              Tips & Articles
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom: Settings & Motivation card */}
        <div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'settings' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'settings' ? 'var(--accent)' : 'var(--secondary-text)',
                fontSize: '13.5px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Settings size={17} />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('help')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                background: 'transparent',
                color: 'var(--secondary-text)',
                fontSize: '13.5px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <HelpCircle size={17} />
              Help
            </button>
          </nav>

          {/* Motivational Bottom Card */}
          <div style={{
            backgroundColor: 'var(--card-subtle)',
            borderRadius: '10px',
            padding: '12px 14px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>Better decisions.</div>
              <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Brighter future.</div>
            </div>
            <Sparkles size={16} color="var(--accent)" />
          </div>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        
        {/* Top App Bar */}
        <header style={{
          height: '68px',
          backgroundColor: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          transition: 'background-color 0.2s ease, border-color 0.2s ease'
        }}>
          {/* Right Header Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Header Period Filter Dropdown: Monthly, Quarterly, Half Year, Year (defaults to Apr 2026) */}
            <PeriodFilterDropdown
              periodType={periodType}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedQuarter={selectedQuarter}
              selectedHalf={selectedHalf}
              onPeriodTypeChange={(t) => setPeriodType(t)}
              onYearChange={(y) => setSelectedYear(y)}
              onMonthChange={(m) => setSelectedMonth(m)}
              onQuarterChange={(q) => setSelectedQuarter(q)}
              onHalfChange={(h) => setSelectedHalf(h)}
            />

            {/* Notification Bell Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="theme-toggle-btn"
                title="Notifications"
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={isNotifDropdownOpen}
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
              </button>

              {unreadNotifCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid var(--card)',
                  pointerEvents: 'none',
                  zIndex: 10
                }}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}

              <NotificationsDropdown
                isOpen={isNotifDropdownOpen}
                onClose={() => setIsNotifDropdownOpen(false)}
                notifications={notifications}
                unreadCount={unreadNotifCount}
                loading={loadingNotifs}
                loadingMore={loadingMoreNotifs}
                error={notifError}
                hasMore={hasMoreNotifs}
                onLoadMore={handleLoadMoreNotifs}
                onRetry={() => loadNotifications(0)}
                onMarkAllRead={handleMarkAllNotifsRead}
                onRemove={handleRemoveNotification}
                onClearAll={handleClearAllNotifs}
                onSelectNotification={handleSelectNotification}
              />
            </div>

            {/* Light/Dark Theme Toggle (Next to Bell) */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User Avatar & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '6px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {userInitials}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                title="Log Out"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'color 0.15s ease'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Body Content */}
        {activeTab === 'not-found' ? (
          <NotFoundPage
            embedded={true}
            isLoggedIn={true}
            onGoDashboard={(tab) => setActiveTab(tab || 'dashboard')}
          />
        ) : activeTab === 'analytics' ? (
          <main style={{ width: '100%' }}>
            <AnalyticsView
              periodType={periodType}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedQuarter={selectedQuarter}
              selectedHalf={selectedHalf}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </main>
        ) : activeTab === 'income' ? (
          <IncomePage
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            periodType={periodType}
            selectedQuarter={selectedQuarter}
            selectedHalf={selectedHalf}
            periodLabel={periodLabel}
          />
        ) : activeTab === 'transactions' || activeTab === 'expenses' ? (
          <ExpensePage
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            periodType={periodType}
            selectedQuarter={selectedQuarter}
            selectedHalf={selectedHalf}
            periodLabel={periodLabel}
          />
        ) : activeTab === 'budgets' ? (
          <main style={{ padding: '28px', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
            <BudgetsView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              periodType={periodType}
              selectedQuarter={selectedQuarter}
              selectedHalf={selectedHalf}
              highlightedBudgetId={highlightedBudgetId}
              onClearHighlight={() => setHighlightedBudgetId(null)}
            />
          </main>
        ) : activeTab === 'goals' ? (
          <main style={{ padding: '28px', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
            <GoalsView
              highlightedGoalId={highlightedGoalId}
              onClearHighlight={() => setHighlightedGoalId(null)}
              onRefreshNotifications={loadNotifications}
            />
          </main>
        ) : activeTab === 'settings' ? (
          <main style={{ width: '100%' }}>
            <SettingsView initialName={userName} onProfileUpdate={handleProfileUpdate} onNavigateTab={setActiveTab} />
          </main>
        ) : (
          <DashboardView
            periodType={periodType}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedQuarter={selectedQuarter}
            selectedHalf={selectedHalf}
            userName={userName}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            maxWidth: '400px',
            width: '100%',
            padding: '28px',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'var(--light-danger)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <LogOut size={24} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              Confirm Log Out
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to end your FinTrack session and return to the landing page?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="btn-outline"
                style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  localStorage.removeItem('fintrack_active_tab');
                  if (window.location.hash) {
                    window.history.replaceState(null, '', window.location.pathname);
                  }
                  onLogout();
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  transition: 'opacity 0.15s ease'
                }}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Popup Modal */}
      <NotificationDetailModal
        notification={selectedDetailNotif}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailNotif(null);
        }}
        onRemove={handleRemoveNotification}
        onNavigateTab={handleNavigateWithHighlight}
      />

      {/* Floating Undo Notification Toast (5-second grace period) */}
      {removedNotificationUndo && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '13.5px',
            animation: 'fadeIn 0.2s ease-out',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          <span>Notification removed</span>
          <button
            onClick={handleUndoRemoval}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              textDecoration: 'underline'
            }}
          >
            Undo
          </button>
        </div>
      )}

    </div>
  );
};
