import React from 'react';

interface TopProgressBarProps {
  visible: boolean;
}

/**
 * Subtle 2px indeterminate progress bar shown below the header during background syncs.
 */
export const TopProgressBar: React.FC<TopProgressBarProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div
      className="h-0.5 w-full bg-rule/30 dark:bg-rule-dark/30 overflow-hidden"
      role="progressbar"
      aria-label="Syncing library data"
    >
      <div className="h-full w-1/3 bg-accent dark:bg-accent-dark animate-molat-slide rounded-full" />
    </div>
  );
};
