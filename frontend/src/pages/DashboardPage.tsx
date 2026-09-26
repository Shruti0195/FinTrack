import React, { useEffect, useState, useRef } from 'react';
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
  PlusCircle,
  Calendar,
  ChevronDown,
  Check
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { IncomePage } from './IncomePage';
import { ExpensePage } from './ExpensePage';
import { BudgetsView } from '../components/BudgetsView';
import { DashboardView } from '../components/DashboardView';

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
  const [showPeriodMenu, setShowPeriodMenu] = useState<boolean>(false);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  // Close period dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(e.target as Node)) {
        setShowPeriodMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthsShort = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsList = [
    { val: 1, label: 'Jan' }, { val: 2, label: 'Feb' }, { val: 3, label: 'Mar' }, { val: 4, label: 'Apr' },
    { val: 5, label: 'May' }, { val: 6, label: 'Jun' }, { val: 7, label: 'Jul' }, { val: 8, label: 'Aug' },
    { val: 9, label: 'Sep' }, { val: 10, label: 'Oct' }, { val: 11, label: 'Nov' }, { val: 12, label: 'Dec' },
  ];

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
            <div style={{ position: 'relative' }} ref={periodMenuRef}>
              <button
                onClick={() => setShowPeriodMenu((prev) => !prev)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: showPeriodMenu ? 'var(--light-accent)' : 'var(--card-subtle)',
                  border: `1px solid ${showPeriodMenu ? 'var(--accent)' : 'var(--border)'}`,
                  color: showPeriodMenu ? 'var(--accent)' : 'var(--main-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-btn)',
                  transition: 'all 0.15s ease'
                }}
                title="Filter by Monthly, Quarterly, Half Year, or Year"
              >
                <Calendar size={15} color={showPeriodMenu ? 'var(--accent)' : 'var(--secondary-text)'} />
                <span>{periodLabel}</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: showPeriodMenu ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>

              {/* Floating Period Filter Popover */}
              {showPeriodMenu && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '16px',
                  zIndex: 100,
                  animation: 'fadeIn 0.15s ease'
                }}>
                  {/* Period Mode Selector Tabs */}
                  <div style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--secondary-text)',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}>
                    Select Period View
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px',
                    backgroundColor: 'var(--card-subtle)',
                    padding: '3px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    border: '1px solid var(--border)'
                  }}>
                    {[
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'quarterly', label: 'Quarterly' },
                      { id: 'half_year', label: 'Half Year' },
                      { id: 'yearly', label: 'Year' }
                    ].map((tab) => {
                      const isActive = periodType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setPeriodType(tab.id as any)}
                          style={{
                            padding: '6px 2px',
                            fontSize: '11px',
                            fontWeight: isActive ? 700 : 500,
                            backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                            color: isActive ? '#FFFFFF' : 'var(--secondary-text)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textAlign: 'center'
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Year Selector */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--secondary-text)' }}>Year</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[2024, 2025, 2026, 2027].map((yr) => (
                        <button
                          key={yr}
                          onClick={() => setSelectedYear(yr)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            fontWeight: selectedYear === yr ? 700 : 500,
                            backgroundColor: selectedYear === yr ? 'var(--accent)' : 'var(--card-subtle)',
                            color: selectedYear === yr ? '#FFFFFF' : 'var(--main-text)',
                            border: `1px solid ${selectedYear === yr ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sub-period Picker based on mode */}
                  {periodType === 'monthly' && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--secondary-text)', marginBottom: '8px' }}>
                        Select Month (4x3 Grid)
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '6px'
                      }}>
                        {monthsList.map((m) => {
                          const isSel = selectedMonth === m.val;
                          return (
                            <button
                              key={m.val}
                              onClick={() => {
                                setSelectedMonth(m.val);
                                setShowPeriodMenu(false);
                              }}
                              style={{
                                padding: '8px 4px',
                                fontSize: '11.5px',
                                fontWeight: isSel ? 700 : 500,
                                backgroundColor: isSel ? 'var(--accent)' : 'var(--card-subtle)',
                                color: isSel ? '#FFFFFF' : 'var(--main-text)',
                                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {periodType === 'quarterly' && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--secondary-text)', marginBottom: '8px' }}>
                        Select Quarter
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {[
                          { q: 1, label: 'Q1', desc: 'Jan – Mar' },
                          { q: 2, label: 'Q2', desc: 'Apr – Jun' },
                          { q: 3, label: 'Q3', desc: 'Jul – Sep' },
                          { q: 4, label: 'Q4', desc: 'Oct – Dec' },
                        ].map((item) => {
                          const isSel = selectedQuarter === item.q;
                          return (
                            <button
                              key={item.q}
                              onClick={() => {
                                setSelectedQuarter(item.q);
                                setShowPeriodMenu(false);
                              }}
                              style={{
                                padding: '10px 8px',
                                textAlign: 'left',
                                backgroundColor: isSel ? 'var(--light-accent)' : 'var(--card-subtle)',
                                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ fontSize: '13px', fontWeight: 700, color: isSel ? 'var(--accent)' : 'var(--primary)' }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--secondary-text)' }}>
                                {item.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {periodType === 'half_year' && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--secondary-text)', marginBottom: '8px' }}>
                        Select Half Year
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { h: 1, label: 'H1: First Half', desc: 'January – June (6 Months)' },
                          { h: 2, label: 'H2: Second Half', desc: 'July – December (6 Months)' },
                        ].map((item) => {
                          const isSel = selectedHalf === item.h;
                          return (
                            <button
                              key={item.h}
                              onClick={() => {
                                setSelectedHalf(item.h);
                                setShowPeriodMenu(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                backgroundColor: isSel ? 'var(--light-accent)' : 'var(--card-subtle)',
                                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: isSel ? 'var(--accent)' : 'var(--primary)' }}>
                                  {item.label}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                                  {item.desc}
                                </div>
                              </div>
                              {isSel && <Check size={16} color="var(--accent)" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {periodType === 'yearly' && (
                    <div style={{ padding: '8px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                        Full Year {selectedYear}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)', marginBottom: '12px' }}>
                        Aggregates all 12 months (Jan 1 – Dec 31)
                      </div>
                      <button
                        onClick={() => setShowPeriodMenu(false)}
                        className="btn-primary"
                        style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                      >
                        View Full Year {selectedYear}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
          <IncomePage />
        ) : activeTab === 'transactions' || activeTab === 'expenses' ? (
          <ExpensePage />
        ) : activeTab === 'budgets' ? (
          <main style={{ padding: '28px', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
            <BudgetsView />
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
