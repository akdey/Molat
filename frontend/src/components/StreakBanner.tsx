import React from 'react';
import { Flame, AlertTriangle, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const StreakBanner: React.FC = () => {
  const { streakSummary, openQuickLog } = useLibraryStore();

  if (!streakSummary) return null;

  const {
    current_streak_days,
    longest_streak_days,
    streak_at_risk,
    today_pages,
    daily_goal_pages,
    grace_freeze_used,
    reading_velocity_pages_per_day,
  } = streakSummary;

  const goalPercent = Math.min(100, Math.round((today_pages / (daily_goal_pages || 20)) * 100));

  return (
    <section
      aria-label="Daily Reading Streak"
      className="rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-4 sm:p-5 shadow-sm space-y-3.5 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Streak Counter & Status */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-subtle dark:bg-accent-dark-subtle border border-accent/20 dark:border-accent-dark/30 text-accent dark:text-accent-dark shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-medium tracking-tight text-ink dark:text-ink-dark tabular-nums">
                {current_streak_days} Day{current_streak_days === 1 ? '' : 's'}
              </h2>
              {streak_at_risk && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40">
                  <AlertTriangle size={11} />
                  At Risk Today
                </span>
              )}
              {grace_freeze_used && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 border border-sky-300 dark:border-sky-800/40">
                  <ShieldCheck size={11} />
                  Grace Freeze Active
                </span>
              )}
            </div>
            <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
              Personal Record: <strong className="font-medium text-ink dark:text-ink-dark">{longest_streak_days} days</strong> • Velocity: <strong className="font-medium text-ink dark:text-ink-dark">{reading_velocity_pages_per_day} pgs/day</strong>
            </p>
          </div>
        </div>

        {/* 1-Tap CTA */}
        <button
          onClick={() => openQuickLog()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-sm transition-all active:scale-98 shrink-0"
        >
          <Plus size={16} />
          <span>Log Today's Reading</span>
        </button>
      </div>

      {/* Daily Goal Progress Bar */}
      <div className="space-y-1.5 pt-1 border-t border-rule/60 dark:border-rule-dark/60">
        <div className="flex items-center justify-between text-2xs">
          <span className="text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5">
            {today_pages >= daily_goal_pages ? (
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            ) : null}
            Today's Progress: <strong className="font-medium text-ink dark:text-ink-dark">{today_pages}</strong> / {daily_goal_pages} pages
          </span>
          <span className="font-mono text-ink-muted">{goalPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-rule/50 dark:bg-rule-dark overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              today_pages >= daily_goal_pages ? 'bg-emerald-600' : 'bg-accent'
            }`}
            style={{ width: `${goalPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
};
