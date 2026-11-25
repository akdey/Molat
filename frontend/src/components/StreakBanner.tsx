import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  ShieldCheck,
  Plus,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Target,
  Shield,
  Info,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const StreakBanner: React.FC = () => {
  const { streakSummary, openQuickLog, dailyGoal, setDailyGoal } = useLibraryStore();
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [showFreezeModal, setShowFreezeModal] = useState<boolean>(false);
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
    freeze_bank_count = 0,
    freeze_max_bank = 3,
    freeze_progress_days = 0,
    freeze_next_tier_required = 7,
    freeze_recovery_active = false,
    frozen_dates = [],
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
            <div className="flex items-center gap-2 flex-wrap">
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
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 border border-sky-300 dark:border-sky-800/40"
                  title="Yesterday was cushioned by a banked freeze"
                >
                  <ShieldCheck size={11} />
                  Yesterday Protected
                </span>
              )}

              {/* Progressive 3-Shield Freeze Bank Badge */}
              <button
                type="button"
                onClick={() => setShowFreezeModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all cursor-pointer text-2xs font-medium ${
                  freeze_bank_count > 0
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-cyan-800 dark:text-cyan-300 hover:border-cyan-400 dark:hover:border-cyan-600'
                    : freeze_recovery_active
                    ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 hover:border-amber-400'
                    : 'bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-400'
                }`}
                title="Click to view Freeze Bank details & progress"
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: freeze_max_bank }).map((_, i) => {
                    const slot = i + 1;
                    const isFilled = slot <= freeze_bank_count;
                    return (
                      <span
                        key={slot}
                        className={`inline-block w-2.5 h-2.5 rounded-full transition-all ${
                          isFilled
                            ? 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.7)]'
                            : freeze_recovery_active && slot === 1
                            ? 'border border-amber-500/80 bg-amber-400/20 animate-pulse'
                            : 'border border-stone-400/40 bg-transparent'
                        }`}
                      />
                    );
                  })}
                </div>
                <span>
                  {freeze_bank_count > 0
                    ? `${freeze_bank_count}/${freeze_max_bank} Shield${freeze_bank_count === 1 ? '' : 's'}`
                    : freeze_recovery_active
                    ? `0/3 • Fast Recovery (${freeze_progress_days}/3) ⚡`
                    : `0/3 • Foundation (${freeze_progress_days}/7)`}
                </span>
                <Info size={10} className="opacity-60" />
              </button>
            </div>

            <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5 flex-wrap pt-0.5">
              <span>Personal Record: <strong className="font-medium text-ink dark:text-ink-dark">{longest_streak_days} days</strong></span>
              <span>•</span>
              <span>Velocity: <strong className="font-medium text-ink dark:text-ink-dark">{reading_velocity_pages_per_day} pgs/day</strong></span>
              {freeze_bank_count < freeze_max_bank && (
                <>
                  <span>•</span>
                  {freeze_bank_count === 0 ? (
                    freeze_recovery_active ? (
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        ⚡ Fast Recovery: <strong>{freeze_progress_days}/3</strong> days to restore Shield 1
                      </span>
                    ) : (
                      <span className="text-ink-secondary dark:text-ink-dark-secondary">
                        🛡️ 7-Day Foundation: <strong>{freeze_progress_days}/7</strong> days to unlock 1st Shield
                      </span>
                    )
                  ) : (
                    <span className="text-cyan-700 dark:text-cyan-400">
                      Next Shield: <strong>{freeze_progress_days}/{freeze_next_tier_required}</strong> days read
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* 1-Tap CTA */}
        <button
          onClick={() => openQuickLog()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-sm transition-all active:scale-98 shrink-0 cursor-pointer"
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
              className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-ink dark:text-ink-dark font-medium transition-colors cursor-pointer"
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
              className="text-ink-muted hover:text-ink dark:hover:text-ink-dark p-1 rounded-md cursor-pointer"
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
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-all cursor-pointer ${
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
        </div>
      )}

      {/* Freeze Bank Modal / Explainer */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md p-5 rounded-2xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark">
                    Streak Freeze Bank
                  </h3>
                  <p className="text-2xs text-ink-muted">
                    {freeze_bank_count} of 3 Shields Banked (Permanent Until Used)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFreezeModal(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 3 Slots Visual */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[
                {
                  slot: 1,
                  name: 'Shield 1',
                  desc: freeze_bank_count >= 1 ? 'Armed' : freeze_recovery_active ? 'Fast Recovery' : '7-Day Habit',
                  req: freeze_bank_count >= 1 ? 'Armed' : freeze_recovery_active ? '3 Active Days' : '7 Active Days',
                },
                { slot: 2, name: 'Shield 2', desc: 'Weekend Safe', req: '+5 More Days' },
                { slot: 3, name: 'Shield 3', desc: 'Vacation Vault', req: '+7 More Days' },
              ].map((tier) => {
                const isHeld = tier.slot <= freeze_bank_count;
                const isNext = tier.slot === freeze_bank_count + 1;
                return (
                  <div
                    key={tier.slot}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isHeld
                        ? 'border-cyan-300 dark:border-cyan-700 bg-cyan-50/60 dark:bg-cyan-950/30'
                        : isNext
                        ? freeze_recovery_active && tier.slot === 1
                          ? 'border-amber-400 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/30'
                          : 'border-accent/40 bg-accent/5'
                        : 'border-rule dark:border-rule-dark opacity-60'
                    }`}
                  >
                    <div className="text-xl mb-1">{isHeld ? '🛡️' : isNext ? (freeze_recovery_active ? '⚡' : '⏳') : '⚪'}</div>
                    <p className="text-xs font-medium text-ink dark:text-ink-dark">{tier.name}</p>
                    <p className="text-3xs text-ink-muted">{tier.desc}</p>
                    <span
                      className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-3xs font-medium ${
                        isHeld
                          ? 'bg-cyan-200 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-200'
                          : isNext
                          ? freeze_recovery_active && tier.slot === 1
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                            : 'bg-accent/20 text-accent dark:text-accent-dark'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                      }`}
                    >
                      {tier.req}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar towards next tier */}
            {freeze_bank_count < freeze_max_bank ? (
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-rule dark:border-rule-dark space-y-1.5">
                <div className="flex items-center justify-between text-2xs">
                  <span className="text-ink dark:text-ink-dark font-medium">
                    {freeze_bank_count === 0 ? (
                      freeze_recovery_active ? (
                        <span className="text-amber-700 dark:text-amber-400">⚡ Fast Recovery toward Shield #1</span>
                      ) : (
                        <span>🛡️ 7-Day Habit Foundation toward Shield #1</span>
                      )
                    ) : (
                      <span>Progress toward Shield #{freeze_bank_count + 1}</span>
                    )}
                  </span>
                  <span className="font-mono text-ink-muted">
                    {freeze_progress_days} / {freeze_next_tier_required} days
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-rule/50 dark:bg-rule-dark overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      freeze_recovery_active && freeze_bank_count === 0 ? 'bg-amber-500' : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((freeze_progress_days / freeze_next_tier_required) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-3xs text-ink-muted">
                  {freeze_bank_count === 0 ? (
                    freeze_recovery_active ? (
                      `Danger Zone: read ${freeze_next_tier_required - freeze_progress_days} more day(s) to restore Shield 1.`
                    ) : (
                      `Read ${freeze_next_tier_required - freeze_progress_days} more consecutive day(s) to build your habit and unlock Shield 1.`
                    )
                  ) : (
                    `Read ${freeze_next_tier_required - freeze_progress_days} more day(s) to unlock this shield.`
                  )}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-center">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  🎉 Maximum Protection Reached!
                </p>
                <p className="text-3xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  You can safely absorb up to 3 consecutive missed days without breaking your streak.
                </p>
              </div>
            )}

            {/* Past Frozen Dates */}
            {frozen_dates.length > 0 && (
              <div className="pt-2 border-t border-rule dark:border-rule-dark">
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block mb-1">
                  Protected Days in Heatmap
                </span>
                <div className="flex flex-wrap gap-1">
                  {frozen_dates.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono text-3xs"
                    >
                      ❄️ {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowFreezeModal(false)}
              className="w-full py-2 rounded-xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
