import React from 'react';

interface AppFooterProps {
  onNavigateTab?: (tab: string) => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({ onNavigateTab }) => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, tab: string) => {
    e.preventDefault();
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  return (
    <footer
      className="app-footer"
      style={{
        marginTop: 'auto',
        paddingTop: '28px',
        paddingBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px 14px',
        fontSize: '12px',
        color: 'var(--secondary-text)',
      }}
    >
      <span>© {currentYear} FinTrack</span>
      <span className="sep" aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
      <a
        href="#privacy"
        onClick={(e) => handleLinkClick(e, 'privacy')}
        style={{
          color: 'inherit',
          textDecoration: 'none',
          padding: '4px 2px',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--main-text)';
          e.currentTarget.style.textDecoration = 'underline';
          e.currentTarget.style.textUnderlineOffset = '3px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'inherit';
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        Privacy
      </a>
      <span className="sep" aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
      <a
        href="#terms"
        onClick={(e) => handleLinkClick(e, 'terms')}
        style={{
          color: 'inherit',
          textDecoration: 'none',
          padding: '4px 2px',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--main-text)';
          e.currentTarget.style.textDecoration = 'underline';
          e.currentTarget.style.textUnderlineOffset = '3px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'inherit';
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        Terms
      </a>
      <span className="sep" aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
      <a
        href="#help"
        onClick={(e) => handleLinkClick(e, 'help')}
        style={{
          color: 'inherit',
          textDecoration: 'none',
          padding: '4px 2px',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--main-text)';
          e.currentTarget.style.textDecoration = 'underline';
          e.currentTarget.style.textUnderlineOffset = '3px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'inherit';
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        Help
      </a>
    </footer>
  );
};
