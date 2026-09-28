import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export type PeriodType = 'monthly' | 'quarterly' | 'half_year' | 'yearly';

export interface PeriodFilterDropdownProps {
  periodType: PeriodType;
  selectedYear: number;
  selectedMonth: number;
  selectedQuarter: number;
  selectedHalf: number;
  onPeriodTypeChange?: (type: PeriodType) => void;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  onQuarterChange?: (quarter: number) => void;
  onHalfChange?: (half: number) => void;
  buttonStyle?: React.CSSProperties;
  height?: string;
  align?: 'left' | 'right';
}

const MONTHS_LIST = [
  { val: 1, label: 'Jan' },
  { val: 2, label: 'Feb' },
  { val: 3, label: 'Mar' },
  { val: 4, label: 'Apr' },
  { val: 5, label: 'May' },
  { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' },
  { val: 8, label: 'Aug' },
  { val: 9, label: 'Sep' },
  { val: 10, label: 'Oct' },
  { val: 11, label: 'Nov' },
  { val: 12, label: 'Dec' },
];

export const PeriodFilterDropdown: React.FC<PeriodFilterDropdownProps> = ({
  periodType,
  selectedYear,
  selectedMonth,
  selectedQuarter,
  selectedHalf,
  onPeriodTypeChange,
  onYearChange,
  onMonthChange,
  onQuarterChange,
  onHalfChange,
  buttonStyle,
  height = '38px',
  align = 'right'
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let periodLabel = 'Apr 2026';
  if (periodType === 'monthly') {
    periodLabel = `${MONTHS_LIST.find((m) => m.val === selectedMonth)?.label || 'Apr'} ${selectedYear}`;
  } else if (periodType === 'quarterly') {
    periodLabel = `Q${selectedQuarter} ${selectedYear} (${selectedQuarter === 1 ? 'Jan - Mar' : selectedQuarter === 2 ? 'Apr - Jun' : selectedQuarter === 3 ? 'Jul - Sep' : 'Oct - Dec'})`;
  } else if (periodType === 'half_year') {
    periodLabel = `H${selectedHalf} ${selectedYear} (${selectedHalf === 1 ? 'Jan - Jun' : 'Jul - Dec'})`;
  } else if (periodType === 'yearly') {
    periodLabel = `Year ${selectedYear}`;
  }

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setShowMenu((prev) => !prev)}
        style={{
          height,
          padding: '0 14px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: showMenu ? 'var(--light-accent)' : 'var(--card)',
          border: `1px solid ${showMenu ? 'var(--accent)' : 'var(--border)'}`,
          color: showMenu ? 'var(--accent)' : 'var(--main-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          borderRadius: 'var(--radius-btn)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.15s ease',
          ...buttonStyle
        }}
        title="Filter by Monthly, Quarterly, Half Year, or Year"
      >
        <Calendar size={15} color={showMenu ? 'var(--accent)' : 'var(--secondary-text)'} />
        <span>{periodLabel}</span>
        <ChevronDown
          size={14}
          style={{
            transform: showMenu ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease'
          }}
        />
      </button>

      {/* Floating Period Filter Popover */}
      {showMenu && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          [align === 'right' ? 'right' : 'left']: 0,
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
                  onClick={() => onPeriodTypeChange?.(tab.id as PeriodType)}
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
                  onClick={() => onYearChange?.(yr)}
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
                {MONTHS_LIST.map((m) => {
                  const isSel = selectedMonth === m.val;
                  return (
                    <button
                      key={m.val}
                      onClick={() => {
                        onMonthChange?.(m.val);
                        setShowMenu(false);
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
                        onQuarterChange?.(item.q);
                        setShowMenu(false);
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
                        onHalfChange?.(item.h);
                        setShowMenu(false);
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
                onClick={() => setShowMenu(false)}
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
  );
};
