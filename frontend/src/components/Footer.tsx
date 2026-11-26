import React from 'react';

/**
 * Editorial creator footer — understated, consistent across all screens.
 * Renders above the mobile bottom nav (pb-20 on mobile).
 * Pattern: "Molat • Engineered by AMIT KUMAR DEY"
 */
export const Footer: React.FC = () => (
  <footer className="w-full border-t border-rule/40 dark:border-rule-dark/40 mt-auto pt-4 pb-20 md:pb-6">
    <p className="text-center text-3xs text-ink-muted dark:text-ink-dark-muted tracking-wide select-none">
      Molat{' '}
      <span className="mx-1 opacity-50">&bull;</span>{' '}
      Engineered by{' '}
      <a
        href="https://portfolio.akdey.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-ink-secondary dark:text-ink-dark-muted hover:text-accent dark:hover:text-accent-dark underline underline-offset-2 decoration-rule/60 dark:decoration-rule-dark/60 hover:decoration-accent transition-colors"
      >
        AMIT KUMAR DEY
      </a>
    </p>
  </footer>
);
