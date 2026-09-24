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
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { BudgetsView } from '../components/BudgetsView';

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

  useEffect(() => {
    // Fetch logged in user details
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        // Fallback demo user if token is mock or offline
        setUser({ name: 'Sweni Shah', email: 'sweni@fintrack.com', role: 'USER' });
      });
  }, []);

  const userName = user?.name || 'Sweni Shah';
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SS';

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
            {/* Month Picker */}
            <span style={{
              fontSize: '12.5px',
              padding: '7px 12px',
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--main-text)',
              fontWeight: 500
            }}>
              📅 Apr 2026 ▾
            </span>

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

        {/* Dashboard Body Content */}
        <main style={{ padding: '28px', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
          {activeTab === 'budgets' ? (
            <BudgetsView />
          ) : (
            <>
              {/* Welcome Banner */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
              Good Morning, {userName.split(' ')[0]}! 👋
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)' }}>
              Here's your financial overview for April 2026.
            </p>
          </div>

          {/* 3 Metrics Cards + Financial Health Score Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px',
            marginBottom: '24px'
          }}>
            {/* Total Income */}
            <div className="card-box" style={{ padding: '18px', borderLeft: '4px solid var(--accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>Total Income</span>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--light-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <ArrowUpRight size={14} />
                </span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
                ₹85,000
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
                ↑ 12% vs. last month
              </div>
            </div>

            {/* Total Expenses */}
            <div className="card-box" style={{ padding: '18px', borderLeft: '4px solid var(--danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>Total Expenses</span>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                  <ArrowDownRight size={14} />
                </span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
                ₹42,000
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--danger)', fontWeight: 600, marginTop: '4px' }}>
                ↑ 5% vs. last month
              </div>
            </div>

            {/* Net Savings */}
            <div className="card-box" style={{ padding: '18px', borderLeft: '4px solid var(--info)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>Savings</span>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)' }}>
                  ★
                </span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
                ₹43,000
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
                ↑ 18% vs. last month
              </div>
            </div>

            {/* Financial Health Score Widget */}
            <div className="card-box" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>Financial Health</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent)' }}>Good</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '4px 0' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>78</span>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>/ 100</span>
              </div>
              <div style={{ height: '7px', borderRadius: '4px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: '78%', height: '100%', backgroundColor: 'var(--accent)', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          {/* Middle Row: Charts + Breakdown */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '18px',
            marginBottom: '24px'
          }}>
            {/* Income vs Expenses Bar Chart */}
            <div className="card-box" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>Income vs Expenses</span>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Last 6 Months ▾</span>
              </div>

              <svg viewBox="0 0 420 130" width="100%" height="130">
                <line x1="0" y1="30" x2="420" y2="30" stroke="var(--border)" strokeDasharray="3,3" opacity="0.6" />
                <line x1="0" y1="75" x2="420" y2="75" stroke="var(--border)" strokeDasharray="3,3" opacity="0.6" />
                <line x1="0" y1="120" x2="420" y2="120" stroke="var(--border)" />
                
                {/* Jan */}
                <rect x="25" y="50" width="14" height="70" rx="3" fill="#10B981" />
                <rect x="42" y="70" width="14" height="50" rx="3" fill="#EF4444" />
                {/* Feb */}
                <rect x="95" y="42" width="14" height="78" rx="3" fill="#10B981" />
                <rect x="112" y="65" width="14" height="55" rx="3" fill="#EF4444" />
                {/* Mar */}
                <rect x="165" y="36" width="14" height="84" rx="3" fill="#10B981" />
                <rect x="182" y="60" width="14" height="60" rx="3" fill="#EF4444" />
                {/* Apr */}
                <rect x="235" y="26" width="14" height="94" rx="3" fill="#10B981" />
                <rect x="252" y="58" width="14" height="62" rx="3" fill="#EF4444" />
                {/* May */}
                <rect x="305" y="20" width="14" height="100" rx="3" fill="#10B981" />
                <rect x="322" y="52" width="14" height="68" rx="3" fill="#EF4444" />
                {/* Jun */}
                <rect x="375" y="15" width="14" height="105" rx="3" fill="#10B981" />
                <rect x="392" y="48" width="14" height="72" rx="3" fill="#EF4444" />
              </svg>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--secondary-text)', marginTop: '10px' }}>
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary-text)' }}>
                  <i style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '2px', display: 'inline-block' }}></i> Income
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary-text)' }}>
                  <i style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '2px', display: 'inline-block' }}></i> Expenses
                </span>
              </div>
            </div>

            {/* Expense Breakdown Donut & Legend */}
            <div className="card-box" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>Expense Breakdown</span>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>₹42,000 total</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Donut representation */}
                <div style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: 'conic-gradient(#10B981 0 32%, #3B82F6 32% 60%, #F59E0B 60% 72%, #8B5CF6 72% 82%, #64748B 82% 100%)',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--primary)'
                  }}>
                    ₹42k
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ flex: 1, fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--main-text)' }}>
                    <span><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10B981', borderRadius: '2px', marginRight: '6px' }}></i>Food & Dining (32%)</span>
                    <b>₹13,440</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--main-text)' }}>
                    <span><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3B82F6', borderRadius: '2px', marginRight: '6px' }}></i>Rent (28%)</span>
                    <b>₹11,760</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--main-text)' }}>
                    <span><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#F59E0B', borderRadius: '2px', marginRight: '6px' }}></i>Transport (12%)</span>
                    <b>₹5,040</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--main-text)' }}>
                    <span><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#8B5CF6', borderRadius: '2px', marginRight: '6px' }}></i>Shopping (10%)</span>
                    <b>₹4,200</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--main-text)' }}>
                    <span><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#64748B', borderRadius: '2px', marginRight: '6px' }}></i>Others (18%)</span>
                    <b>₹7,560</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Recent Transactions Table */}
          <div className="card-box" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)' }}>Recent Transactions</span>
              <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>View All &rarr;</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Row 1 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--light-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>Salary</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Apr 25, 2026 · Bank transfer</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                  +₹50,000
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                    <ArrowDownRight size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>Groceries</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Apr 24, 2026 · UPI</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--danger)' }}>
                  -₹2,850
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                    <ArrowDownRight size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>Electricity Bill</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Apr 22, 2026 · UPI</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--danger)' }}>
                  -₹1,200
                </div>
              </div>

              {/* Row 4 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--light-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--primary)' }}>Freelance Work</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Apr 20, 2026 · Card</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                  +₹8,000
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </main>
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
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
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
