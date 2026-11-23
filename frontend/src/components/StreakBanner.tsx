import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  Snowflake,
  Plus,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Target,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const StreakBanner: React.FC = () => {
  const { streakSummary, openQuickLog, dailyGoal, setDailyGoal } = useLibraryStore();
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [customGoal, setCustomGoal] = useState<number>(dailyGoal || 15);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  if (!streakSummary) return null;

  const {
    current_streak_days,
    longest_streak_days,
    streak_at_risk,
    today_pages,
    daily_goal_pages,
    grace_freeze_used,
    grace_freeze_available,
    freeze_cooldown_days_left,
    freeze_prior_pages,
    freeze_required_pages,
    reading_velocity_pages_per_day,
  } = streakSummary;

  const currentGoal = daily_goal_pages || dailyGoal || 15;
  const goalPercent = Math.min(100, Math.round((today_pages / currentGoal) * 100));

  const PRESETS = [10, 15, 20, 25, 30, 50];

  const handleSaveGoal = async (val: number) => {
    setSavingGoal(true);
    await setDailyGoal(val);
    setSavingGoal(false);
    setIsEditingGoal(false);
  };

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
              {grace_freeze_used ? (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 border border-sky-300 dark:border-sky-800/40"
                  title="Yesterday was cushioned by a grace freeze"
                >
                  <ShieldCheck size={11} />
                  Yesterday Protected
                </span>
              ) : grace_freeze_available ? (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/40"
                  title={`Freeze Armed: If you miss today, 1 grace freeze will protect your streak tomorrow morning (${freeze_prior_pages || 0}/${freeze_required_pages || 75} pgs in past 7 days)`}
                >
                  <Snowflake size={11} className="text-cyan-600 dark:text-cyan-400" />
                  Freeze Armed
                </span>
              ) : freeze_cooldown_days_left && freeze_cooldown_days_left > 0 ? (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                  title={`Freeze Cooldown: ${freeze_cooldown_days_left} days remaining before next freeze`}
                >
                  <ShieldCheck size={11} className="text-stone-400" />
                  Cooldown ({freeze_cooldown_days_left}d)
                </span>
              ) : null}
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
          <div className="text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5 flex-wrap">
            {today_pages >= currentGoal ? (
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            ) : null}
            <span>
              Today's Progress: <strong className="font-medium text-ink dark:text-ink-dark">{today_pages}</strong> /
            </span>
            <button
              type="button"
              onClick={() => {
                setCustomGoal(currentGoal);
                setIsEditingGoal(!isEditingGoal);
              }}
              className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-ink dark:text-ink-dark font-medium transition-colors"
              title="Click to edit daily reading goal"
            >
              <span>{currentGoal} pages</span>
              <Pencil size={11} className="text-ink-muted group-hover:text-accent transition-colors" />
            </button>
          </div>
          <span className="font-mono text-ink-muted">{goalPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-rule/50 dark:bg-rule-dark overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              today_pages >= currentGoal ? 'bg-emerald-600' : 'bg-accent'
            }`}
            style={{ width: `${goalPercent}%` }}
          />
        </div>
      </div>

      {/* Inline Goal Editor */}
      {isEditingGoal && (
        <div className="p-3.5 rounded-xl border border-rule dark:border-rule-dark bg-stone-50/80 dark:bg-stone-900/60 space-y-3 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink dark:text-ink-dark">
              <Target size={14} className="text-accent" />
              <span>Set Daily Reading Goal</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingGoal(false)}
              className="text-ink-muted hover:text-ink dark:hover:text-ink-dark p-1 rounded-md"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary mr-1">Presets:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSaveGoal(preset)}
                disabled={savingGoal}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-all ${
                  preset === currentGoal
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark text-ink dark:text-ink-dark hover:border-accent/40'
                }`}
              >
                {preset} pgs
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customGoal > 0) handleSaveGoal(customGoal);
            }}
            className="flex items-center gap-2 pt-1 border-t border-rule/50 dark:border-rule-dark/50"
          >
            <label htmlFor="custom-goal-input" className="text-2xs text-ink-secondary dark:text-ink-dark-secondary shrink-0">
              Custom goal:
            </label>
            <input
              id="custom-goal-input"
              type="number"
              min={1}
              max={500}
              value={customGoal}
              onChange={(e) => setCustomGoal(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 px-2 py-1 text-xs rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-2xs text-ink-muted">pages/day</span>
            <button
              type="submit"
              disabled={savingGoal || customGoal === currentGoal}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium transition-all cursor-pointer"
            >
              <Check size={12} />
              <span>{savingGoal ? 'Saving...' : 'Apply'}</span>
            </button>
          </form>

          <p className="text-3xs text-ink-muted dark:text-ink-dark-muted">
            💡 Streak freeze threshold automatically adapts to 5× daily goal ({customGoal * 5} pages in 7 rolling days).
          </p>
        </div>
      )}
    </section>
  );
};
