import React from 'react';
import { Compass } from 'lucide-react';
import { useTour } from './TourContext';

interface TourButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const TourButton: React.FC<TourButtonProps> = ({ className, style }) => {
  const { startPageTour, isTourActive, pageMessage, clearPageMessage } = useTour();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        id="fintrack-tour-btn"
        data-tour="header-tour-btn"
        onClick={() => startPageTour()}
        className={className || "theme-toggle-btn"}
        title="Take a tour"
        aria-label="Take a tour"
        disabled={isTourActive}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isTourActive ? 0.6 : 1,
          cursor: isTourActive ? 'not-allowed' : 'pointer',
          ...style
        }}
      >
        <Compass size={18} />
      </button>

      {/* Inline Notice Bubble if no tour for current page */}
      {pageMessage && (
        <div 
          className="fintrack-tour-notice" 
          role="status" 
          aria-live="polite"
          onClick={clearPageMessage}
        >
          <span>{pageMessage}</span>
        </div>
      )}
    </div>
  );
};
