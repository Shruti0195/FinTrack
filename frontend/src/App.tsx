import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { AuthModal } from './components/AuthModal';

function AppContent() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [userLoggedIn, setUserLoggedIn] = useState(() => !!localStorage.getItem('token'));
  
  const [pageRoute, setPageRoute] = useState<'home' | 'verify-email' | 'reset-password' | 'privacy' | 'terms' | 'not-found'>(() => {
    const path = window.location.pathname;
    if (path === '' || path === '/') return 'home';
    if (path.startsWith('/verify-email')) return 'verify-email';
    if (path.startsWith('/reset-password')) return 'reset-password';
    if (path.startsWith('/privacy')) return 'privacy';
    if (path.startsWith('/terms')) return 'terms';
    return 'not-found';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '' || path === '/') setPageRoute('home');
      else if (path.startsWith('/verify-email')) setPageRoute('verify-email');
      else if (path.startsWith('/reset-password')) setPageRoute('reset-password');
      else if (path.startsWith('/privacy')) setPageRoute('privacy');
      else if (path.startsWith('/terms')) setPageRoute('terms');
      else setPageRoute('not-found');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUserLoggedIn(false);
      setAuthMode('login');
      setAuthModalOpen(true);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setUserLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('fintrack_active_tab');
    localStorage.removeItem('fintrack_tour_completed');
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setUserLoggedIn(false);
  };

  // If route does not exist, render NotFoundPage for both guests and authenticated users
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

  // If user is authenticated, render the Dashboard View directly
  if (userLoggedIn) {
    return <DashboardPage onLogout={handleLogout} />;
  }

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

      {/* Auth Modal (Login / Register / Forgot Password) */}
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
