import React from 'react';

interface InlineSpinnerProps {
  className?: string;
}

/**
 * Compact 14px spinner for inline button loading states.
 */
export const InlineSpinner: React.FC<InlineSpinnerProps> = ({ className = '' }) => (
  <svg
    className={`animate-spin h-3.5 w-3.5 shrink-0 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="opacity-25"
    />
    <path
      d="M4 12a8 8 0 018-8"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);
