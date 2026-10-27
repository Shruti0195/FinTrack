import React from 'react';

export interface PeriodCapsuleProps {
  periodType?: string;
  periodLabel?: string;
  style?: React.CSSProperties;
}

export const PeriodCapsule: React.FC<PeriodCapsuleProps> = ({
  periodType = 'monthly',
  periodLabel = '',
  style
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        fontSize: '12.5px',
        color: 'var(--main-text)',
        boxShadow: 'var(--shadow-sm)',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
        {(periodType || 'monthly').replace('_', ' ')} View
      </span>
      <span style={{ color: 'var(--secondary-text)' }}>•</span>
      <span style={{ color: 'var(--secondary-text)' }}>{periodLabel}</span>
    </div>
  );
};
