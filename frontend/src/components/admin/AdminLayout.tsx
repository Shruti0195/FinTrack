import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FolderTree, 
  AlertCircle, 
  LogOut, 
  ShieldCheck, 
  Sun, 
  Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminUsersView } from './AdminUsersView';
import { AdminCategoriesView } from './AdminCategoriesView';
import { AdminIssuesView } from './AdminIssuesView';

interface AdminLayoutProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  userName,
  userEmail,
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'users' | 'categories' | 'issues'>('dashboard');
  const [targetIssueId, setTargetIssueId] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleNavigateTab = (tab: 'dashboard' | 'users' | 'categories' | 'issues', issueId?: string) => {
    if (issueId) {
      setTargetIssueId(issueId);
    }
    setActiveAdminTab(tab);
  };

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AD';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'users', label: 'Users', icon: Users, badge: null },
    { id: 'categories', label: 'Categories', icon: FolderTree, badge: null },
    { id: 'issues', label: 'Reported Issues', icon: AlertCircle, badge: null },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      
      {/* 1. ADMIN SIDEBAR */}
      <aside style={{
        width: '260px',
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
        boxSizing: 'border-box',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}>
        <div>
          {/* Admin Brand Logo & Badge */}
          <div style={{ padding: '0 8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                backgroundColor: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--main-text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  FinTrack
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '3px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#10B981',
                  letterSpacing: '0.02em'
                }}>
                  Admin Portal
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeAdminTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveAdminTab(item.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--active-nav-bg)' : 'transparent',
                    color: isActive ? '#10B981' : 'var(--secondary-text)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                      e.currentTarget.style.color = 'var(--main-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--secondary-text)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={18} style={{ color: isActive ? '#10B981' : 'inherit' }} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(100, 116, 139, 0.12)',
                      color: 'var(--secondary-text)',
                      fontWeight: 600
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Admin Badge */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }} title={userEmail}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--main-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {userName}
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#10B981',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Administrator
              </div>
            </div>
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
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary-text)'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN ADMIN VIEWPORT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        
        {/* Top Header Bar */}
        <header style={{
          height: '68px',
          backgroundColor: 'var(--navbar-bg)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          transition: 'background-color 0.2s ease, border-color 0.2s ease'
        }}>
          {/* Left Spacer */}
          <div />

          {/* Right Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--main-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
                {initials}
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
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary-text)'}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main style={{
          padding: '28px 32px',
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          flex: 1,
          boxSizing: 'border-box'
        }}>
          {activeAdminTab === 'dashboard' && (
            <AdminDashboardView onNavigateTab={handleNavigateTab} userName={userName} />
          )}
          {activeAdminTab === 'users' && <AdminUsersView currentAdminEmail={userEmail} />}
          {activeAdminTab === 'categories' && <AdminCategoriesView />}
          {activeAdminTab === 'issues' && (
            <AdminIssuesView
              initialIssueId={targetIssueId}
              onClearInitialIssueId={() => setTargetIssueId(null)}
            />
          )}
        </main>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
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
