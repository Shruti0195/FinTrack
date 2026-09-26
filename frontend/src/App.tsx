import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthModal } from './components/AuthModal';

function AppContent() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [userLoggedIn, setUserLoggedIn] = useState(() => !!localStorage.getItem('token'));
  
  const [pageRoute, setPageRoute] = useState<'home' | 'verify-email' | 'reset-password'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify-email')) return 'verify-email';
    if (path.startsWith('/reset-password')) return 'reset-password';
    return 'home';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/verify-email')) setPageRoute('verify-email');
      else if (path.startsWith('/reset-password')) setPageRoute('reset-password');
      else setPageRoute('home');
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
    setUserLoggedIn(false);
  };

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
            setPageRoute('home');
            handleOpenAuth('login');
          }}
          onGoHome={() => {
            setPageRoute('home');
          }}
        />
      )}

      {pageRoute === 'reset-password' && (
        <ResetPasswordPage
          onOpenLogin={() => {
            setPageRoute('home');
            handleOpenAuth('login');
          }}
          onGoHome={() => {
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
