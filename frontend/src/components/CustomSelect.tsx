import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  menuStyle?: React.CSSProperties;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  direction?: 'up' | 'down' | 'auto';
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  style,
  buttonStyle,
  menuStyle,
  size = 'md',
  align = 'left',
  direction = 'auto',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    minWidth: number;
    placeUp: boolean;
  }>({ top: 0, left: 0, minWidth: 0, placeUp: false });

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placeUp =
      direction === 'up' ||
      (direction === 'auto' && spaceBelow < 220 && spaceAbove > spaceBelow);

    setCoords({
      top: placeUp ? rect.top - 6 : rect.bottom + 6,
      left: align === 'right' ? rect.right : rect.left,
      minWidth: rect.width,
      placeUp
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, direction, align]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  const isSmall = size === 'sm';

  const menuContent = isOpen && (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: `${coords.placeUp ? 'translateY(-100%)' : 'none'} ${align === 'right' ? 'translateX(-100%)' : 'none'}`,
        minWidth: `${coords.minWidth}px`,
        width: 'max-content',
        maxWidth: '320px',
        maxHeight: '260px',
        overflowY: 'auto',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.22), 0 6px 12px -4px rgba(0, 0, 0, 0.12)',
        padding: '5px',
        zIndex: 99999,
        animation: coords.placeUp
          ? 'dropdownFadeInUp 0.15s cubic-bezier(0, 0, 0.2, 1)'
          : 'dropdownFadeIn 0.15s cubic-bezier(0, 0, 0.2, 1)',
        ...menuStyle
      }}
    >
      {options.map((opt) => {
        const isSelected = String(opt.value) === String(value);
        return (
          <div
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: isSmall ? '6px 10px' : '8px 12px',
              borderRadius: '6px',
              fontSize: isSmall ? '12px' : '13px',
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? 'var(--accent)' : 'var(--main-text)',
              backgroundColor: isSelected ? 'var(--light-accent)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                e.currentTarget.style.color = 'var(--primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--main-text)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {opt.icon}
              <span>{opt.label}</span>
            </div>
            {isSelected && <Check size={14} color="var(--accent)" strokeWidth={2.5} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        display: 'inline-block',
        width: style?.width || 'auto',
        ...style
      }}
    >
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          height: isSmall ? '32px' : '40px',
          padding: isSmall ? '4px 10px' : '8px 14px',
          backgroundColor: 'var(--card)',
          color: 'var(--main-text)',
          border: '1px solid',
          borderColor: isOpen ? 'var(--accent)' : 'var(--border)',
          borderRadius: '8px',
          fontSize: isSmall ? '12.5px' : '13.5px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(16, 185, 129, 0.18)' : '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1,
          ...buttonStyle
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = 'var(--secondary-text)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = 'var(--border)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {selectedOption?.icon}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          size={isSmall ? 13 : 15}
          color="var(--secondary-text)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0
          }}
        />
      </button>

      {/* Floating Menu Popover via Portal */}
      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
};

