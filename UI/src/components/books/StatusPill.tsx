import { cn } from '../../lib/utils';
import type { OwnershipStatus, ReadingStatus, Condition } from '../../types/book';

type StatusVariant = 'ownership' | 'reading' | 'condition' | 'loan';

const OWNERSHIP_MAP: Record<OwnershipStatus, { label: string; className: string }> = {
  Owned: { label: 'Owned', className: 'bg-ok-subtle text-ok dark:bg-ok-dark-subtle dark:text-ok-dark border border-ok/20' },
  Wishlist: { label: 'Wishlist', className: 'bg-info-subtle text-info dark:bg-info-dark-subtle dark:text-info-dark border border-info/20' },
  Borrowed: { label: 'Borrowed', className: 'bg-warn-subtle text-warn dark:bg-warn-dark-subtle dark:text-warn-dark border border-warn/20' },
};

const READING_MAP: Record<ReadingStatus, { label: string; className: string }> = {
  Unread: { label: 'Unread', className: 'bg-surface text-ink-secondary dark:bg-surface-dark dark:text-ink-dark-secondary border border-rule dark:border-rule-dark' },
  Reading: { label: 'Reading', className: 'bg-accent-subtle text-accent dark:bg-accent-dark-subtle dark:text-accent-dark border border-accent/20' },
  Completed: { label: 'Completed', className: 'bg-ok-subtle text-ok dark:bg-ok-dark-subtle dark:text-ok-dark border border-ok/20' },
  Abandoned: { label: 'Abandoned', className: 'bg-surface text-ink-muted dark:bg-surface-dark dark:text-ink-dark-muted border border-rule dark:border-rule-dark' },
};

const CONDITION_MAP: Record<Condition, { label: string; className: string }> = {
  New: { label: 'New', className: 'bg-ok-subtle text-ok dark:bg-ok-dark-subtle dark:text-ok-dark border border-ok/20' },
  Good: { label: 'Good', className: 'bg-surface text-ink-secondary dark:bg-surface-dark dark:text-ink-dark-secondary border border-rule dark:border-rule-dark' },
  Fair: { label: 'Fair', className: 'bg-warn-subtle text-warn dark:bg-warn-dark-subtle dark:text-warn-dark border border-warn/20' },
  Damaged: { label: 'Damaged', className: 'bg-error-subtle text-error dark:bg-error-dark-subtle dark:text-error-dark border border-error/20' },
  Unknown: { label: 'Unknown', className: 'bg-surface text-ink-muted dark:bg-surface-dark dark:text-ink-dark-muted border border-rule dark:border-rule-dark' },
};

interface StatusPillProps {
  variant: StatusVariant;
  value: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ variant, value, className, size = 'sm' }: StatusPillProps) {
  let config: { label: string; className: string } | undefined;

  if (variant === 'ownership') config = OWNERSHIP_MAP[value as OwnershipStatus];
  else if (variant === 'reading') config = READING_MAP[value as ReadingStatus];
  else if (variant === 'condition') config = CONDITION_MAP[value as Condition];

  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-sans font-medium leading-none',
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

interface LoanBadgeProps {
  loanedTo: string;
  overdue?: boolean;
  className?: string;
}

export function LoanBadge({ loanedTo, overdue, className }: LoanBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium',
        overdue
          ? 'bg-error-subtle text-error dark:bg-error-dark-subtle dark:text-error-dark border border-error/20'
          : 'bg-warn-subtle text-warn dark:bg-warn-dark-subtle dark:text-warn-dark border border-warn/20',
        className,
      )}
    >
      <span className="shrink-0" aria-hidden="true">↑</span>
      <span className="truncate max-w-[10ch]">Loaned to {loanedTo}</span>
      {overdue && <span className="sr-only">(overdue)</span>}
    </span>
  );
}

