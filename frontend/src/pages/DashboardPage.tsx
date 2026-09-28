import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  LayoutDashboard, 
  Receipt, 
  Target, 
  PieChart, 
  FileText, 
  BookOpen, 
  Settings, 
  HelpCircle, 
  Search, 
  Bell, 
  LogOut, 
  Sun, 
  Moon,
  Sparkles,
  PlusCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { IncomePage } from './IncomePage';
import { ExpensePage } from './ExpensePage';
import { BudgetsView } from '../components/BudgetsView';
import { DashboardView } from '../components/DashboardView';
import { PeriodFilterDropdown } from '../components/PeriodFilterDropdown';

interface DashboardPageProps {
  onLogout: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Period filter states: Monthly, Quarterly, Half Year, Year (defaults to Apr 2026 as per user specification)
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'half_year' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // April 2026
  const [selectedQuarter, setSelectedQuarter] = useState<number>(2); // Q2 2026
  const [selectedHalf, setSelectedHalf] = useState<number>(1); // H1 2026

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
              onClick={() => setActiveTab('reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-btn)',
                border: 'none',
                backgroundColor: activeTab === 'reports' ? 'var(--light-accent)' : 'transparent',
                color: activeTab === 'reports' ? 'var(--accent)' : 'var(--secondary-text)',
                fontWeight: activeTab === 'reports' ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <FileText size={18} />
              Reports
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
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          transition: 'background-color 0.2s ease, border-color 0.2s ease'
        }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
            <input 
              type="text"
              placeholder="Search transactions, categories..."
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
          </div>

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

            {/* Notification Bell */}
            <button 
              className="theme-toggle-btn"
              title="Notifications"
              style={{ position: 'relative' }}
            >
              <Bell size={17} />
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger)'
              }}></span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
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
        {activeTab === 'income' ? (
          <IncomePage
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            periodType={periodType}
            selectedQuarter={selectedQuarter}
            selectedHalf={selectedHalf}
            periodLabel={periodLabel}
            onPeriodTypeChange={(t) => setPeriodType(t)}
            onYearChange={(y) => setSelectedYear(y)}
            onMonthChange={(m) => setSelectedMonth(m)}
            onQuarterChange={(q) => setSelectedQuarter(q)}
            onHalfChange={(h) => setSelectedHalf(h)}
          />
        ) : activeTab === 'transactions' || activeTab === 'expenses' ? (
          <ExpensePage
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            periodType={periodType}
            selectedQuarter={selectedQuarter}
            selectedHalf={selectedHalf}
            periodLabel={periodLabel}
            onPeriodTypeChange={(t) => setPeriodType(t)}
            onYearChange={(y) => setSelectedYear(y)}
            onMonthChange={(m) => setSelectedMonth(m)}
            onQuarterChange={(q) => setSelectedQuarter(q)}
            onHalfChange={(h) => setSelectedHalf(h)}
          />
        ) : activeTab === 'budgets' ? (
          <main style={{ padding: '28px', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
            <BudgetsView
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              periodType={periodType}
              selectedQuarter={selectedQuarter}
              selectedHalf={selectedHalf}
              onPeriodTypeChange={(t) => setPeriodType(t)}
              onYearChange={(y) => setSelectedYear(y)}
              onMonthChange={(m) => setSelectedMonth(m)}
              onQuarterChange={(q) => setSelectedQuarter(q)}
              onHalfChange={(h) => setSelectedHalf(h)}
            />
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

    </div>
  );
};
