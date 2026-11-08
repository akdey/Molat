import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Flame,
  Trophy,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Info,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

interface DayItem {
  date: string; // YYYY-MM-DD
  intensity: number; // 0..4
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  inRange: boolean;
  dayOfMonth: number;
  month: number; // 0..11
  year: number;
}

interface WeekColumn {
  weekIndex: number;
  days: DayItem[];
  monthLabel?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Parse YYYY-MM-DD into local Date at noon to completely eliminate timezone/DST shifts
function parseDateParts(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDisplayDate(ymd: string): string {
  const d = parseDateParts(ymd);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getIntensityLabel(intensity: number): string {
  switch (intensity) {
    case 1:
      return '1–9 pages read (Level 1)';
    case 2:
      return '10–19 pages read (Level 2)';
    case 3:
      return '20–49 pages read (Level 3)';
    case 4:
      return '50+ pages read (Level 4)';
    default:
      return 'No reading activity';
  }
}

// GitHub canonical palette for Light & Dark mode
const getIntensityClass = (intensity: number) => {
  switch (intensity) {
    case 1:
      return 'bg-[#9be9a8] dark:bg-[#0e4429] border border-[#7bc96f]/40 dark:border-[#006d32]/30';
    case 2:
      return 'bg-[#40c463] dark:bg-[#006d32] border border-[#30a14e]/40 dark:border-[#26a641]/30';
    case 3:
      return 'bg-[#30a14e] dark:bg-[#26a641] border border-[#216e39]/40 dark:border-[#39d353]/30';
    case 4:
      return 'bg-[#216e39] dark:bg-[#39d353] border border-[#1b5e20]/40 dark:border-[#56d364]/40';
    default:
      return 'bg-[#ebedf0] dark:bg-[#161b22] border border-black/5 dark:border-[#21262d]/70';
  }
};

export const HeatmapScreen: React.FC = () => {
  const { streakSummary, openQuickLog } = useLibraryStore();
  const [selectedView, setSelectedView] = useState<string>('all');
  const [hoveredDay, setHoveredDay] = useState<DayItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayItem | null>(null);
  const [showExplainer, setShowExplainer] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() => {
    if (!streakSummary?.heatmap_365) return [];
    return Object.keys(streakSummary.heatmap_365).sort();
  }, [streakSummary?.heatmap_365]);

  // Extract distinct calendar years from the dataset (e.g., ['2026', '2025'])
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    dates.forEach((d) => set.add(d.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [dates]);

  // Filter dates based on user selection (all, specific year, 6m, 3m)
  const activeDates = useMemo(() => {
    if (dates.length === 0) return [];
    if (selectedView === '3m') {
      return dates.slice(-91); // ~13 weeks
    }
    if (selectedView === '6m') {
      return dates.slice(-182); // ~26 weeks
    }
    if (availableYears.includes(selectedView)) {
      return dates.filter((d) => d.startsWith(selectedView));
    }
    return dates; // 'all' (365 days)
  }, [dates, selectedView, availableYears]);

  // Build weekly calendar columns (GitHub standard: Sunday to Saturday)
  const weeks = useMemo(() => {
    if (activeDates.length === 0 || !streakSummary?.heatmap_365) return [];

    const heatmap = streakSummary.heatmap_365;
    const firstStr = activeDates[0];
    const lastStr = activeDates[activeDates.length - 1];

    const firstDate = parseDateParts(firstStr);
    const startDow = firstDate.getDay(); // 0 = Sun, 1 = Mon ...
    const calendarStart = new Date(firstDate);
    calendarStart.setDate(calendarStart.getDate() - startDow);

    const lastDate = parseDateParts(lastStr);
    const endDow = lastDate.getDay();
    const calendarEnd = new Date(lastDate);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - endDow));

    const result: WeekColumn[] = [];
    const cursor = new Date(calendarStart);
    let weekIndex = 0;

    while (cursor <= calendarEnd) {
      const days: DayItem[] = [];
      let monthLabelForWeek: string | undefined = undefined;

      for (let dow = 0; dow < 7; dow++) {
        const y = cursor.getFullYear();
        const m = cursor.getMonth();
        const d = cursor.getDate();
        const ymd = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const inRange = activeDates.includes(ymd);
        const intensity = inRange ? (heatmap[ymd] || 0) : 0;

        // Candidate month label when 1st of month falls in this week
        if (d === 1 && !monthLabelForWeek) {
          monthLabelForWeek = MONTH_NAMES[m];
        }

        days.push({
          date: ymd,
          intensity,
          dayOfWeek: dow,
          inRange,
          dayOfMonth: d,
          month: m,
          year: y,
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      result.push({
        weekIndex: weekIndex++,
        days,
        monthLabel: monthLabelForWeek,
      });
    }

    // If first month label doesn't appear in the first 2 weeks, label week 0
    const firstLabeled = result.findIndex((w) => w.monthLabel !== undefined);
    if (firstLabeled === -1 || firstLabeled >= 2) {
      const firstActiveDay = result[0].days.find((d) => d.inRange) || result[0].days[0];
      if (firstActiveDay) {
        result[0].monthLabel = MONTH_NAMES[firstActiveDay.month];
      }
    }

    // Keep minimum 2 columns between consecutive month labels so text doesn't overlap
    let lastLabeledIdx = -99;
    result.forEach((w) => {
      if (w.monthLabel) {
        if (w.weekIndex - lastLabeledIdx < 2) {
          w.monthLabel = undefined;
        } else {
          lastLabeledIdx = w.weekIndex;
        }
      }
    });

    return result;
  }, [activeDates, streakSummary?.heatmap_365]);

  // Auto-scroll to current date (right end) on initial mount and when switching to 'all'
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [selectedView, weeks]);

  if (!streakSummary) {
    return (
      <div className="py-20 flex-1 flex items-center justify-center text-center text-ink-muted animate-pulse">
        Calculating streak ledger and 365-day reading heatmap...
      </div>
    );
  }

  const {
    current_streak_days,
    longest_streak_days,
    streak_at_risk,
    daily_goal_pages,
    grace_freeze_used,
    reading_velocity_pages_per_day,
    heatmap_365,
  } = streakSummary;

  // Active reading days in the current timeframe
  const activeReadingDays = activeDates.filter((d) => (heatmap_365[d] || 0) > 0).length;

  // Active inspected day (hovered takes precedence, then clicked)
  const currentInspectDay = hoveredDay || selectedDay;

  return (
    <div className="space-y-6 flex-1 flex flex-col">
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
          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium self-start sm:self-auto transition-all cursor-pointer shadow-xs active:scale-98"
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

      {/* GitHub-style Contribution Heatmap Section */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* Main Heatmap Card */}
        <div className="flex-1 w-full p-4 sm:p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-[#0d1117] shadow-sm space-y-3.5 transition-colors">
          {/* Card Header & Contribution Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="font-sans text-sm sm:text-base font-semibold text-ink dark:text-ink-dark flex items-center gap-2">
                <span className="tabular-nums font-mono text-accent dark:text-accent-dark">
                  {activeReadingDays}
                </span>{' '}
                active reading days in{' '}
                {selectedView === 'all'
                  ? 'the last year'
                  : selectedView === '6m'
                  ? 'the last 6 months'
                  : selectedView === '3m'
                  ? 'the last 3 months'
                  : selectedView}
              </h3>

              {/* Dynamic hover/touch inspector label */}
              <div className="h-4 flex items-center text-3xs pt-0.5">
                {currentInspectDay ? (
                  <div className="flex items-center gap-1.5 text-ink dark:text-ink-dark font-medium">
                    <span
                      className={`w-2 h-2 rounded-xs inline-block shrink-0 ${getIntensityClass(
                        currentInspectDay.intensity
                      )}`}
                    />
                    <span>
                      {formatDisplayDate(currentInspectDay.date)}: {getIntensityLabel(currentInspectDay.intensity)}
                    </span>
                    {selectedDay && !hoveredDay && (
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="text-ink-muted hover:text-accent underline ml-1 cursor-pointer"
                      >
                        clear
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-ink-muted">
                    Hover or tap any square to inspect daily pages
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Horizontal View Filter Selector */}
            <div className="flex lg:hidden items-center gap-1 overflow-x-auto pb-1 scrollbar-none max-w-full">
              <button
                onClick={() => setSelectedView('all')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedView === 'all'
                    ? 'bg-accent text-white shadow-xs'
                    : 'border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark text-ink-secondary'
                }`}
              >
                Past Year
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedView(yr)}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-medium shrink-0 transition-colors cursor-pointer ${
                    selectedView === yr
                      ? 'bg-accent text-white shadow-xs'
                      : 'border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark text-ink-secondary'
                  }`}
                >
                  {yr}
                </button>
              ))}
              <button
                onClick={() => setSelectedView('6m')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedView === '6m'
                    ? 'bg-accent text-white shadow-xs'
                    : 'border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark text-ink-secondary'
                }`}
              >
                6 Months
              </button>
              <button
                onClick={() => setSelectedView('3m')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedView === '3m'
                    ? 'bg-accent text-white shadow-xs'
                    : 'border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark text-ink-secondary'
                }`}
              >
                3 Months
              </button>
            </div>
          </div>

          {/* GitHub 7-Row Contribution Grid */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-2 pt-1 scrollbar-thin select-none"
          >
            <div className="inline-block min-w-max">
              {/* Top Month Header Row: Aligned with week columns */}
              <div className="flex items-center pl-8 mb-1 h-3.5">
                <div className="flex gap-[3px]">
                  {weeks.map((w) => (
                    <div key={w.weekIndex} className="relative w-[11px] h-3.5">
                      {w.monthLabel && (
                        <span className="absolute left-0 top-0 text-[10px] text-ink-muted dark:text-ink-dark-muted font-normal whitespace-nowrap select-none pointer-events-none">
                          {w.monthLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Grid: Left Days Column + Week Columns */}
              <div className="flex items-start">
                {/* Day Labels Column on the left (Sun to Sat, labeling Mon, Wed, Fri) */}
                <div className="flex flex-col gap-[3px] pr-2 w-8 shrink-0 text-right select-none">
                  <div className="h-[11px]" /> {/* Sunday (blank) */}
                  <div className="h-[11px] text-[9px] text-ink-muted leading-[11px] font-sans">
                    Mon
                  </div>
                  <div className="h-[11px]" /> {/* Tuesday (blank) */}
                  <div className="h-[11px] text-[9px] text-ink-muted leading-[11px] font-sans">
                    Wed
                  </div>
                  <div className="h-[11px]" /> {/* Thursday (blank) */}
                  <div className="h-[11px] text-[9px] text-ink-muted leading-[11px] font-sans">
                    Fri
                  </div>
                  <div className="h-[11px]" /> {/* Saturday (blank) */}
                </div>

                {/* Week Columns with Day Cells */}
                <div className="flex gap-[3px]">
                  {weeks.map((w) => (
                    <div key={w.weekIndex} className="flex flex-col gap-[3px]">
                      {w.days.map((day) => {
                        const isSelected = selectedDay?.date === day.date;
                        return (
                          <div
                            key={day.date}
                            onMouseEnter={() => setHoveredDay(day.inRange ? day : null)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => {
                              if (day.inRange) {
                                setSelectedDay(isSelected ? null : day);
                              }
                            }}
                            title={
                              day.inRange
                                ? `${formatDisplayDate(day.date)}: ${getIntensityLabel(day.intensity)}`
                                : undefined
                            }
                            className={`w-[11px] h-[11px] rounded-[2px] transition-transform ${
                              !day.inRange
                                ? 'opacity-0 pointer-events-none'
                                : `${getIntensityClass(
                                    day.intensity
                                  )} hover:scale-125 hover:ring-1 hover:ring-accent cursor-pointer z-0 hover:z-20`
                            } ${isSelected ? 'ring-2 ring-accent z-10 scale-125' : ''}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Card Footer: Explainer Trigger + GitHub Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs text-ink-muted">
            <button
              onClick={() => setShowExplainer(!showExplainer)}
              className="flex items-center gap-1.5 text-ink-secondary hover:text-accent transition-colors self-start cursor-pointer"
            >
              <Info size={12} />
              <span>Learn how we count reading activity</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${showExplainer ? 'rotate-180' : ''}`}
              />
            </button>

            {/* GitHub Canonical Legend */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto font-sans">
              <span className="text-3xs">Less</span>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <span
                  key={lvl}
                  title={`Level ${lvl}`}
                  className={`w-[11px] h-[11px] rounded-[2px] ${getIntensityClass(lvl)}`}
                />
              ))}
              <span className="text-3xs">More</span>
            </div>
          </div>

          {/* Collapsible Explainer Drawer */}
          {showExplainer && (
            <div className="p-3 rounded-xl bg-surface-raised dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 text-2xs space-y-1.5 animate-fade-in text-ink-secondary dark:text-ink-dark-secondary">
              <div className="font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                <Sparkles size={12} className="text-accent" />
                <span>Reading Intensity Scale & Streak Rules</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(1)}`} />
                  <span>Level 1: 1–9 pages</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(2)}`} />
                  <span>Level 2: 10–19 pages</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(3)}`} />
                  <span>Level 3: 20–49 pages</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(4)}`} />
                  <span>Level 4: 50+ pages</span>
                </div>
              </div>
              <p className="text-3xs text-ink-muted pt-1 border-t border-rule/40 dark:border-rule-dark/40">
                • Target daily reading goal: <strong>{daily_goal_pages || 20} pages</strong>.<br />
                • Streak preservation cut-off: <strong>23:59:59 IST (Asia/Kolkata)</strong>.<br />
                • Grace Freeze: Automatically saves your streak if you miss a single day (1 freeze per 14-day window with ≥100 prior pages).
              </p>
            </div>
          )}
        </div>

        {/* Desktop Vertical Year Selector Sidebar (Matching GitHub screenshot) */}
        <div className="hidden lg:flex flex-col gap-1 w-28 shrink-0">
          <button
            onClick={() => setSelectedView('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
              selectedView === 'all'
                ? 'bg-accent text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            Past Year
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedView(yr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                selectedView === yr
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark'
              }`}
            >
              {yr}
            </button>
          ))}
          <div className="my-1 border-t border-rule/50 dark:border-rule-dark/50" />
          <button
            onClick={() => setSelectedView('6m')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
              selectedView === '6m'
                ? 'bg-accent text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => setSelectedView('3m')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
              selectedView === '3m'
                ? 'bg-accent text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            3 Months
          </button>
        </div>
      </div>
    </div>
  );
};
