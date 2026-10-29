import React from 'react';
import { cn } from '../../lib/utils';

// =================== Skeleton ===================

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonText({ lines = 3, className }: SkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3 rounded',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  );
}

// Book card skeleton for the collection grid
export function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {/* Cover */}
      <Skeleton className="w-full aspect-[2/3] rounded" />
      {/* Title */}
      <Skeleton className="h-3 w-4/5 rounded" />
      <Skeleton className="h-2.5 w-3/5 rounded" />
    </div>
  );
}

// =================== Empty State ===================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center py-16 px-6', className)}>
      {icon && (
        <div className="text-ink-muted dark:text-ink-dark-muted mb-4 text-5xl" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary max-w-prose mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// =================== Error State ===================

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center text-center py-12 px-6',
        className,
      )}
    >
      <div className="text-error dark:text-error-dark text-4xl mb-4" aria-hidden="true">⚠</div>
      <h3 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-2">{title}</h3>
      <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary max-w-prose mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// =================== Connection status badge ===================

import type { ConnectionStatus } from '../../types/api';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  lastRefresh?: Date | null;
  className?: string;
}

const STATUS_MAP: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  ok: { label: 'Library connected', dot: 'bg-ok dark:bg-ok-dark', text: 'text-ok dark:text-ok-dark' },
  stale: { label: 'Data may be stale', dot: 'bg-warn dark:bg-warn-dark', text: 'text-warn dark:text-warn-dark' },
  error: { label: 'Connection error', dot: 'bg-error dark:bg-error-dark', text: 'text-error dark:text-error-dark' },
  unknown: { label: 'Checking connection…', dot: 'bg-ink-muted dark:bg-ink-dark-muted', text: 'text-ink-muted dark:text-ink-dark-muted' },
};

export function ConnectionBadge({ status, lastRefresh, className }: ConnectionBadgeProps) {
  const cfg = STATUS_MAP[status];
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)} title={lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : undefined}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} aria-hidden="true" />
      <span className={cn('text-2xs', cfg.text)}>{cfg.label}</span>
    </div>
  );
}

// =================== Section heading ===================

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}

export function SectionHeading({ title, description, action, level = 2, className }: SectionHeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <Tag className="font-serif font-medium text-ink dark:text-ink-dark leading-tight"
          style={{ fontSize: level === 1 ? '1.875rem' : level === 2 ? '1.5rem' : '1.25rem' }}
        >
          {title}
        </Tag>
        {description && (
          <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

