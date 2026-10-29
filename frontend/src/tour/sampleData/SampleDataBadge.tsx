import React, { useEffect, useState } from 'react';
import { sampleDataManager } from './sampleDataManager';
import { Sparkles } from 'lucide-react';

interface SampleDataBadgeProps {
  section?: string;
  global?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SampleDataBadge: React.FC<SampleDataBadgeProps> = ({
  section,
  global = false,
  className = '',
  style = {}
}) => {
  const [visible, setVisible] = useState(() => {
    if (!sampleDataManager.isTourActive()) return false;
    if (global) return sampleDataManager.getSampleSections().length > 0;
    if (section) return sampleDataManager.isSectionUsingSample(section);
    return true;
  });

  useEffect(() => {
    const updateVisibility = () => {
      if (!sampleDataManager.isTourActive()) {
        setVisible(false);
        return;
      }
      if (global) {
        setVisible(sampleDataManager.getSampleSections().length > 0);
      } else if (section) {
        setVisible(sampleDataManager.isSectionUsingSample(section));
      } else {
        setVisible(true);
      }
    };

    const unsubscribe = sampleDataManager.subscribe(updateVisibility);
    window.addEventListener('fintrack:sample-data-changed', updateVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('fintrack:sample-data-changed', updateVisibility);
    };
  }, [section, global]);

  if (!visible) return null;

  return (
    <span
      className={`fintrack-sample-data-pill ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: 'var(--radius-pill, 999px)',
        backgroundColor: 'var(--light-accent)',
        color: 'var(--accent)',
        border: '1px solid var(--accent)',
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...style
      }}
      title="This view is currently showing illustrative sample data for the tour"
    >
      <Sparkles size={11} strokeWidth={2.5} />
      Sample data
    </span>
  );
};
