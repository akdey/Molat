import React from 'react';
import { Flame, Trophy, TrendingUp, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const HeatmapScreen: React.FC = () => {
  const { streakSummary, openQuickLog } = useLibraryStore();

  if (!streakSummary) {
    return (
      <div className="py-20 text-center text-ink-muted animate-pulse">
        Calculating streak ledger and 365-day reading heatmap...
      </div>
    );
  }

  const {
    current_streak_days,
    longest_streak_days,
    streak_at_risk,
    today_pages,
    daily_goal_pages,
    grace_freeze_used,
    reading_velocity_pages_per_day,
    heatmap_365,
  } = streakSummary;

  // Convert heatmap_365 dict into sorted array of { date, intensity }
  const dates = Object.keys(heatmap_365).sort();

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 1:
        return 'bg-amber-300 dark:bg-amber-900/60';
      case 2:
        return 'bg-amber-500 dark:bg-amber-700';
      case 3:
        return 'bg-orange-600 dark:bg-orange-600';
      case 4:
        return 'bg-amber-700 dark:bg-amber-500';
      default:
        return 'bg-rule/40 dark:bg-rule-dark/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-ink dark:text-ink-dark">
            Reading Streak & Activity Ledger
          </h2>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
            Continuous daily reading tracking synchronized with Asia/Kolkata (IST) midnight boundaries.
          </p>
        </div>

        <button
          onClick={() => openQuickLog()}
          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium self-start sm:self-auto transition-all"
        >
          + Record Today's Pages
        </button>
      </div>

      {/* Analytics KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
          <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-ink-muted font-medium">
            <Flame size={13} className="text-accent" />
            <span>Current Streak</span>
          </div>
          <p className="font-serif text-2xl font-medium text-ink dark:text-ink-dark tabular-nums">
            {current_streak_days} days
          </p>
          {streak_at_risk && (
            <span className="text-3xs text-amber-600 dark:text-amber-400 font-medium">
              Log today to preserve streak!
            </span>
          )}
        </div>

        <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
          <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-ink-muted font-medium">
            <Trophy size={13} className="text-amber-600" />
            <span>Longest Streak</span>
          </div>
          <p className="font-serif text-2xl font-medium text-ink dark:text-ink-dark tabular-nums">
            {longest_streak_days} days
          </p>
          <span className="text-3xs text-ink-muted">All-time record</span>
        </div>

        <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
          <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-ink-muted font-medium">
            <TrendingUp size={13} className="text-emerald-600" />
            <span>Rolling Velocity</span>
          </div>
          <p className="font-serif text-2xl font-medium text-ink dark:text-ink-dark tabular-nums">
            {reading_velocity_pages_per_day} <span className="text-xs font-sans font-normal text-ink-muted">pgs/day</span>
          </p>
          <span className="text-3xs text-ink-muted">14-day rolling average</span>
        </div>

        <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
          <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-ink-muted font-medium">
            <ShieldCheck size={13} className="text-sky-600" />
            <span>Grace Freeze</span>
          </div>
          <p className="font-serif text-2xl font-medium text-ink dark:text-ink-dark">
            {grace_freeze_used ? 'Active' : 'Ready'}
          </p>
          <span className="text-3xs text-ink-muted">1 day per 14-day window</span>
        </div>
      </div>

      {/* 365-Day Contribution Heatmap Grid */}
      <div className="p-4 sm:p-6 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            365-Day Reading Activity
          </h3>
          <div className="flex items-center gap-1.5 text-2xs text-ink-muted">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((lvl) => (
              <span
                key={lvl}
                className={`w-2.5 h-2.5 rounded-sm ${getIntensityClass(lvl)}`}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Scrollable grid for 365 days (52 columns x 7 rows) */}
        <div className="overflow-x-auto pb-2">
          <div
            className="grid grid-rows-7 grid-flow-col gap-1 min-w-[680px]"
            style={{ gridTemplateRows: 'repeat(7, 10px)' }}
          >
            {dates.map((d) => {
              const intensity = heatmap_365[d] || 0;
              return (
                <div
                  key={d}
                  title={`${d}: intensity ${intensity}`}
                  className={`w-2.5 h-2.5 rounded-sm transition-colors hover:ring-1 hover:ring-accent cursor-pointer ${getIntensityClass(
                    intensity
                  )}`}
                />
              );
            })}
          </div>
        </div>

        <div className="text-3xs text-ink-muted border-t border-rule/50 dark:border-rule-dark/50 pt-2 flex flex-wrap justify-between gap-2">
          <span>Level 1: 1–9 pages</span>
          <span>Level 2: 10–19 pages</span>
          <span>Level 3: 20–49 pages</span>
          <span>Level 4: 50+ pages</span>
        </div>
      </div>
    </div>
  );
};

