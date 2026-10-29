import { cn, readingProgress } from '../../lib/utils';

interface ProgressBarProps {
  current?: number;
  total?: number;
  className?: string;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export function ProgressBar({ current, total, className, showLabel = false, size = 'sm' }: ProgressBarProps) {
  const pct = readingProgress(current, total);
  if (pct === null) return null;

  const heightClass = size === 'xs' ? 'h-0.5' : size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-2xs text-ink-muted dark:text-ink-dark-muted mb-1 tabular-nums">
          <span>p. {current?.toLocaleString()}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-rule dark:bg-rule-dark overflow-hidden',
          heightClass,
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Reading progress: ${pct}% (page ${current} of ${total})`}
      >
        <div
          className="h-full rounded-full bg-accent dark:bg-accent-dark transition-all duration-slow"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface StarRatingProps {
  value?: number;
  max?: number;
  className?: string;
  interactive?: boolean;
  onChange?: (v: number) => void;
}

export function StarRating({ value, max = 5, className, interactive = false, onChange }: StarRatingProps) {
  if (!value && !interactive) return null;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={value ? `Rating: ${value} out of ${max}` : 'No rating'}
    >
      {Array.from({ length: max }).map((_, i) => {
        const filled = value !== undefined && i < value;
        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} star${i > 0 ? 's' : ''}`}
              onClick={() => onChange?.(i + 1)}
              className={cn(
                'text-base leading-none transition-colors focus-visible:outline-none',
                filled
                  ? 'text-accent dark:text-accent-dark'
                  : 'text-rule-strong dark:text-rule-dark hover:text-accent/60',
              )}
            >
              ★
            </button>
          );
        }
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              'text-sm leading-none',
              filled ? 'text-accent dark:text-accent-dark' : 'text-rule-strong dark:text-rule-dark',
            )}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

