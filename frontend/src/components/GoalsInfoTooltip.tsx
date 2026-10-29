import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export interface GoalsInfoTooltipProps {
  size?: number;
  align?: 'left' | 'right';
  dataTour?: string;
}

export const GoalsInfoTooltip: React.FC<GoalsInfoTooltipProps> = ({
  size = 15,
  align = 'left',
  dataTour
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        ref={triggerRef}
        type="button"
        data-tour={dataTour}
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-label="How goals and savings work in FinTrack"
        aria-expanded={isOpen}
        title="How goals work"
        style={{
          border: 'none',
          background: 'var(--card-subtle)',
          padding: '4px',
          cursor: 'pointer',
          color: 'var(--secondary-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
        className="info-icon-btn"
      >
        <Info size={size} />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width: '280px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'var(--card)',
            color: 'var(--main-text)',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--border)',
            zIndex: 9999,
            fontSize: '12.5px',
            lineHeight: 1.45,
            fontWeight: 400,
            textAlign: 'left',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          Money you add to a goal is tracked separately. It isn't counted as an expense and doesn't reduce your savings figure. Goals show how much you've set aside, but FinTrack doesn't move money between accounts.
        </div>
      )}
    </div>
  );
};
