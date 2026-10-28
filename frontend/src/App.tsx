import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { AuthModal } from './components/AuthModal';
import api from './api/client';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

function AppContent() {
  const [authModalOpen, setAuthModalOpen] = useState(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const isTargetingAdmin = path.startsWith('/admin') || hash.startsWith('#admin');
    const isTargetingLogin = path.startsWith('/login') || hash.startsWith('#login');
    return (isTargetingAdmin || isTargetingLogin) && !localStorage.getItem('token');
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [userLoggedIn, setUserLoggedIn] = useState(() => !!localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [pageRoute, setPageRoute] = useState<'home' | 'verify-email' | 'reset-password' | 'privacy' | 'terms' | 'not-found'>(() => {
    const path = window.location.pathname;
    if (path === '' || path === '/' || path.startsWith('/login') || path.startsWith('/admin')) return 'home';
    if (path.startsWith('/verify-email')) return 'verify-email';
    if (path.startsWith('/reset-password')) return 'reset-password';
    if (path.startsWith('/privacy')) return 'privacy';
    if (path.startsWith('/terms')) return 'terms';
    return 'not-found';
  });

  const loadCurrentUser = useCallback(async (expectedRole?: 'USER' | 'ADMIN') => {
    try {
      const res = await api.get<UserProfile>('/auth/me');
      setCurrentUser(res.data);
      const effectiveRole = res.data.role || expectedRole;

      if (effectiveRole === 'ADMIN') {
        if (!window.location.hash.startsWith('#admin')) {
          window.history.replaceState(null, '', '#admin');
        }
      } else {
        // If user is not admin and was on #admin / /admin, redirect to user dashboard
        if (window.location.hash.startsWith('#admin') || window.location.pathname.startsWith('/admin')) {
          window.history.replaceState(null, '', '#dashboard');
        }
      }
    } catch {
      // Token invalid or expired
      localStorage.removeItem('token');
      setUserLoggedIn(false);
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    if (userLoggedIn) {
      loadCurrentUser();
    } else {
      setCurrentUser(null);
    }
  }, [userLoggedIn, loadCurrentUser]);

  // Synchronize location changes and strictly guard routes
  useEffect(() => {
    const handleLocationSync = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const isTargetingAdmin = path.startsWith('/admin') || hash.startsWith('#admin');
      const isTargetingLogin = path.startsWith('/login') || hash.startsWith('#login');

      if (path === '' || path === '/' || isTargetingAdmin || isTargetingLogin) setPageRoute('home');
      else if (path.startsWith('/verify-email')) setPageRoute('verify-email');
      else if (path.startsWith('/reset-password')) setPageRoute('reset-password');
      else if (path.startsWith('/privacy')) setPageRoute('privacy');
      else if (path.startsWith('/terms')) setPageRoute('terms');
      else setPageRoute('not-found');

      if (!localStorage.getItem('token') && (isTargetingAdmin || isTargetingLogin)) {
        setAuthMode('login');
        setAuthModalOpen(true);
        return;
      }

      if (isTargetingAdmin) {
        if (currentUser && currentUser.role !== 'ADMIN') {
          window.history.replaceState(null, '', '#dashboard');
        }
      } else {
        if (currentUser?.role === 'ADMIN') {
          window.history.replaceState(null, '', '#admin');
        }
      }
    };

    window.addEventListener('hashchange', handleLocationSync);
    window.addEventListener('popstate', handleLocationSync);
    return () => {
      window.removeEventListener('hashchange', handleLocationSync);
      window.removeEventListener('popstate', handleLocationSync);
    };
  }, [currentUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUserLoggedIn(false);
      setCurrentUser(null);
      setAuthMode('login');
      setAuthModalOpen(true);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Unified Auth Success handler for both User and Admin
  const handleAuthSuccess = (role?: 'USER' | 'ADMIN') => {
    setUserLoggedIn(true);
    setAuthModalOpen(false);
    if (role === 'ADMIN') {
      window.history.replaceState(null, '', '#admin');
    } else if (role === 'USER') {
      window.history.replaceState(null, '', '#dashboard');
    }
    loadCurrentUser(role);
  };

  // Unified Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('fintrack_active_tab');
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setUserLoggedIn(false);
    setCurrentUser(null);
    window.history.replaceState(null, '', '/');
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // =========================================================
  // 1. ADMIN PORTAL (Rendered when authenticated as ADMIN)
  // =========================================================
  if (userLoggedIn && currentUser?.role === 'ADMIN') {
    return (
      <AdminLayout
        userName={currentUser?.name || 'Administrator'}
        userEmail={currentUser?.email || ''}
        onLogout={handleLogout}
      />
    );
  }

  // =========================================================
  // 2. USER DASHBOARD (Rendered when authenticated as USER)
  // =========================================================
  if (userLoggedIn && currentUser?.role === 'USER') {
    return (
      <DashboardPage
        onLogout={handleLogout}
      />
    );
  }

  // =========================================================
  // 3. SPECIAL PUBLIC PAGES (Privacy, Terms, Not Found)
  // =========================================================
  if (pageRoute === 'not-found') {
    return (
      <NotFoundPage
        isLoggedIn={userLoggedIn}
        onGoHome={() => {
          window.history.pushState(null, '', '/');
          setPageRoute('home');
        }}
        onGoDashboard={(tab) => {
          const hash = tab ? `#${tab}` : (window.location.hash || '#dashboard');
          window.history.pushState(null, '', `/${hash}`);
          setPageRoute('home');
        }}
        onOpenAuth={(mode) => {
          window.history.pushState(null, '', '/');
          setPageRoute('home');
          handleOpenAuth(mode);
        }}
      />
    );
  }

  if (pageRoute === 'privacy') {
    return (
      <PrivacyPolicyPage
        onGoBack={() => {
          window.history.pushState(null, '', '/');
          setPageRoute('home');
        }}
      />
    );
  }

  if (pageRoute === 'terms') {
    return (
      <TermsPage
        onGoBack={() => {
          window.history.pushState(null, '', '/');
          setPageRoute('home');
        }}
      />
    );
  }

  // =========================================================
  // 4. UNAUTHENTICATED LANDING & UNIFIED AUTH FLOW
  // =========================================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--main-text)' }}>
      {/* Navigation Bar with Dark Mode Toggle */}
      <Navbar onOpenAuth={handleOpenAuth} />

      {/* Conditional Content Routing */}
      {pageRoute === 'verify-email' && (
        <VerifyEmailPage
          onOpenLogin={() => {
            window.history.pushState(null, '', '/');
            setPageRoute('home');
            handleOpenAuth('login');
          }}
          onGoHome={() => {
            window.history.pushState(null, '', '/');
            setPageRoute('home');
          }}
        />
      )}

      {pageRoute === 'reset-password' && (
        <ResetPasswordPage
          onOpenLogin={() => {
            window.history.pushState(null, '', '/');
            setPageRoute('home');
            handleOpenAuth('login');
          }}
          onGoHome={() => {
            window.history.pushState(null, '', '/');
            setPageRoute('home');
          }}
        />
      )}

      {pageRoute === 'home' && (
        <LandingPage onOpenAuth={handleOpenAuth} />
      )}

      {/* Unified Auth Modal for both User and Admin */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
