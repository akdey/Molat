import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Flame,
  Trophy,
  TrendingUp,
  ShieldCheck,
  Info,
  ChevronDown,
  Sparkles,
  LayoutGrid,
  Columns3,
  Palette,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export type HeatmapTheme = 'amber' | 'sapphire' | 'amethyst' | 'emerald';
export type HeatmapLayout = 'quarters' | 'continuous';

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

interface QuarterGroup {
  id: string;
  label: string;
  sublabel: string;
  activeDaysCount: number;
  weeks: WeekColumn[];
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

// Multi-palette generator for Warm Amber, Archival Sapphire, Velvet Amethyst, and Classic Emerald
export function getIntensityClass(theme: HeatmapTheme, intensity: number): string {
  switch (theme) {
    case 'amber':
      switch (intensity) {
        case 1:
          return 'bg-[#fef3c7] dark:bg-[#451a03] border border-[#fde68a]/60 dark:border-[#78350f]/60';
        case 2:
          return 'bg-[#fcd34d] dark:bg-[#78350f] border border-[#f59e0b]/50 dark:border-[#b45309]/50';
        case 3:
          return 'bg-[#f59e0b] dark:bg-[#b45309] border border-[#d97706]/60 dark:border-[#d97706]/50';
        case 4:
          return 'bg-[#b45309] dark:bg-[#f59e0b] border border-[#78350f] dark:border-[#fcd34d]';
        default:
          return 'bg-[#f1ede6] dark:bg-[#1a1816] border border-[#e4ded5] dark:border-[#2d2822]/60';
      }
    case 'sapphire':
      switch (intensity) {
        case 1:
          return 'bg-[#dbeafe] dark:bg-[#172554] border border-[#bfdbfe]/60 dark:border-[#1e3a8a]/60';
        case 2:
          return 'bg-[#93c5fd] dark:bg-[#1e40af] border border-[#60a5fa]/50 dark:border-[#2563eb]/50';
        case 3:
          return 'bg-[#3b82f6] dark:bg-[#2563eb] border border-[#1d4ed8]/60 dark:border-[#3b82f6]/50';
        case 4:
          return 'bg-[#1e3a8a] dark:bg-[#60a5fa] border border-[#172554] dark:border-[#93c5fd]';
        default:
          return 'bg-[#ebedf0] dark:bg-[#151b23] border border-[#d8dce2] dark:border-[#262c36]/60';
      }
    case 'amethyst':
      switch (intensity) {
        case 1:
          return 'bg-[#f3e8ff] dark:bg-[#3b0764] border border-[#e9d5ff]/60 dark:border-[#581c87]/60';
        case 2:
          return 'bg-[#d8b4fe] dark:bg-[#6b21a8] border border-[#c084fc]/50 dark:border-[#7e22ce]/50';
        case 3:
          return 'bg-[#a855f7] dark:bg-[#9333ea] border border-[#7e22ce]/60 dark:border-[#a855f7]/50';
        case 4:
          return 'bg-[#6b21a8] dark:bg-[#c084fc] border border-[#581c87] dark:border-[#d8b4fe]';
        default:
          return 'bg-[#efeef4] dark:bg-[#191522] border border-[#dddbe6] dark:border-[#2b233a]/60';
      }
    case 'emerald':
    default:
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
  }
}

export const HeatmapScreen: React.FC = () => {
  const { streakSummary, openQuickLog } = useLibraryStore();
  
  // View range: 'all' (Past Year), specific year e.g. '2026', '6m', '3m'
  const [selectedView, setSelectedView] = useState<string>('all');
  
  // Layout mode: 'quarters' (zero-scroll wrap) or 'continuous' (classic horizontal strip)
  const [layoutMode, setLayoutMode] = useState<HeatmapLayout>('quarters');

  // Palette theme: amber (default candle), sapphire (archival blue), amethyst (violet), emerald (green)
  const [theme, setTheme] = useState<HeatmapTheme>(() => {
    return (localStorage.getItem('molat_heatmap_theme') as HeatmapTheme) || 'amber';
  });

  const [hoveredDay, setHoveredDay] = useState<DayItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayItem | null>(null);
  const [showExplainer, setShowExplainer] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleThemeChange = (newTheme: HeatmapTheme) => {
    setTheme(newTheme);
    localStorage.setItem('molat_heatmap_theme', newTheme);
  };

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

    // Spacing: Ensure first week or month has clean labels without overlap
    const firstLabeled = result.findIndex((w) => w.monthLabel !== undefined);
    if (firstLabeled === -1 || firstLabeled >= 2) {
      const firstActiveDay = result[0].days.find((d) => d.inRange) || result[0].days[0];
      if (firstActiveDay) {
        result[0].monthLabel = MONTH_NAMES[firstActiveDay.month];
      }
    }

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

  // Partition weeks into zero-scroll Quarters for mobile and responsive multi-row display
  const quarterGroups = useMemo<QuarterGroup[]>(() => {
    if (weeks.length === 0) return [];

    const totalWeeks = weeks.length;
    let chunks: WeekColumn[][] = [];

    if (totalWeeks <= 14) {
      chunks = [weeks];
    } else if (totalWeeks <= 28) {
      const mid = Math.ceil(totalWeeks / 2);
      chunks = [weeks.slice(0, mid), weeks.slice(mid)];
    } else {
      const step = Math.ceil(totalWeeks / 4);
      chunks = [
        weeks.slice(0, step),
        weeks.slice(step, step * 2),
        weeks.slice(step * 2, step * 3),
        weeks.slice(step * 3),
      ];
    }

    return chunks.map((chunkWeeks, idx) => {
      // Find start and end date of active days in this chunk
      const activeInChunk = chunkWeeks
        .flatMap((w) => w.days)
        .filter((d) => d.inRange);

      const activeDaysCount = activeInChunk.filter((d) => d.intensity > 0).length;

      let startLabel = '';
      let endLabel = '';
      if (activeInChunk.length > 0) {
        const first = activeInChunk[0];
        const last = activeInChunk[activeInChunk.length - 1];
        startLabel = `${MONTH_NAMES[first.month]} ${first.year !== last.year ? first.year : ''}`.trim();
        endLabel = `${MONTH_NAMES[last.month]} ${last.year}`;
      }

      // Re-assign month labels relative to chunk so first week has month name
      const clonedWeeks: WeekColumn[] = chunkWeeks.map((w, wIdx) => {
        let label = w.monthLabel;
        if (wIdx === 0 && !label) {
          const firstDay = w.days.find((d) => d.inRange) || w.days[0];
          if (firstDay) label = MONTH_NAMES[firstDay.month];
        }
        return { ...w, monthLabel: label };
      });

      return {
        id: `quarter-${idx + 1}`,
        label: chunks.length === 1 ? 'Current Quarter' : `Part ${idx + 1}`,
        sublabel: startLabel && endLabel ? `${startLabel} – ${endLabel}` : `Weeks ${idx * 13 + 1}–${(idx + 1) * 13}`,
        activeDaysCount,
        weeks: clonedWeeks,
      };
    });
  }, [weeks]);

  // Auto-scroll continuous view to current date on mount / change
  useEffect(() => {
    if (layoutMode === 'continuous' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [layoutMode, selectedView, weeks]);

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

      {/* Main Heatmap Card with Zero-Scroll Mobile Flow */}
      <div className="p-4 sm:p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-[#0d1117] shadow-sm space-y-4 transition-colors">
        {/* Card Header: Stats + Timeframe Selector (No Scrollbars!) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      theme,
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

          {/* Non-Scrolling Controls Bar (Compact Dropdown + Segmented Range + Layout Switch) */}
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
            {/* Year / Period Dropdown Selector */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
                className="text-xs py-1.5 pl-2.5 pr-7 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent cursor-pointer appearance-none min-h-[32px] font-medium"
                title="Select Heatmap Timeframe"
              >
                <option value="all">Past Year (365d)</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
                <option value="6m">Last 6 Months</option>
                <option value="3m">Last 3 Months</option>
              </select>
              <ChevronDown size={13} className="absolute right-2 pointer-events-none text-ink-muted" />
            </div>

            {/* Quick Range Pills: 3M | 6M | 1Y */}
            <div className="flex items-center gap-0.5 bg-surface-raised dark:bg-surface-dark p-0.5 rounded-lg border border-rule dark:border-rule-dark min-h-[32px]">
              <button
                onClick={() => setSelectedView('3m')}
                className={`px-2 py-1 rounded-md text-2xs font-medium transition-colors cursor-pointer ${
                  selectedView === '3m'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Last 3 Months"
              >
                3M
              </button>
              <button
                onClick={() => setSelectedView('6m')}
                className={`px-2 py-1 rounded-md text-2xs font-medium transition-colors cursor-pointer ${
                  selectedView === '6m'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Last 6 Months"
              >
                6M
              </button>
              <button
                onClick={() => setSelectedView('all')}
                className={`px-2 py-1 rounded-md text-2xs font-medium transition-colors cursor-pointer ${
                  selectedView === 'all'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Full Year"
              >
                1Y
              </button>
            </div>

            {/* Layout Toggle: Quarters (Zero-Scroll Wrap) vs Continuous Strip */}
            <div className="flex items-center gap-0.5 bg-surface-raised dark:bg-surface-dark p-0.5 rounded-lg border border-rule dark:border-rule-dark min-h-[32px]">
              <button
                onClick={() => setLayoutMode('quarters')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  layoutMode === 'quarters'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Wrap into Quarters (Zero Horizontal Scroll)"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                onClick={() => setLayoutMode('continuous')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  layoutMode === 'continuous'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Continuous 53-Week Panorama"
              >
                <Columns3 size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* 1. ZERO-SCROLL WRAPPED QUARTERS VIEW (Default on mobile and multi-row responsive) */}
        {layoutMode === 'quarters' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {quarterGroups.map((q) => (
              <div
                key={q.id}
                className="p-3 sm:p-3.5 rounded-xl border border-rule/70 dark:border-rule-dark/70 bg-surface-raised/60 dark:bg-surface-dark/40 space-y-2 select-none overflow-hidden"
              >
                {/* Quarter Header */}
                <div className="flex items-center justify-between text-2xs text-ink-muted border-b border-rule/40 dark:border-rule-dark/40 pb-1.5">
                  <span className="font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {q.sublabel}
                  </span>
                  <span className="font-mono text-3xs">
                    {q.activeDaysCount} active day{q.activeDaysCount === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Quarter Calendar Grid (Fits without any horizontal scrolling!) */}
                <div className="w-full flex flex-col pt-0.5">
                  {/* Month Labels on top */}
                  <div className="flex items-center pl-7 mb-1 h-3">
                    <div className="flex gap-[3px]">
                      {q.weeks.map((w) => (
                        <div key={w.weekIndex} className="relative w-3 sm:w-3.5 h-3">
                          {w.monthLabel && (
                            <span className="absolute left-0 top-0 text-[9px] text-ink-muted dark:text-ink-dark-muted font-normal whitespace-nowrap select-none pointer-events-none">
                              {w.monthLabel}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Day rows + Week Columns */}
                  <div className="flex items-start">
                    {/* Left Day Labels */}
                    <div className="flex flex-col gap-[3px] pr-1.5 w-7 shrink-0 text-right select-none">
                      <div className="h-3 sm:h-3.5" />
                      <div className="h-3 sm:h-3.5 text-[8px] text-ink-muted leading-[12px] font-sans">
                        Mon
                      </div>
                      <div className="h-3 sm:h-3.5" />
                      <div className="h-3 sm:h-3.5 text-[8px] text-ink-muted leading-[12px] font-sans">
                        Wed
                      </div>
                      <div className="h-3 sm:h-3.5" />
                      <div className="h-3 sm:h-3.5 text-[8px] text-ink-muted leading-[12px] font-sans">
                        Fri
                      </div>
                      <div className="h-3 sm:h-3.5" />
                    </div>

                    {/* Week Columns */}
                    <div className="flex gap-[3px]">
                      {q.weeks.map((w) => (
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
                                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[2px] transition-transform ${
                                  !day.inRange
                                    ? 'opacity-0 pointer-events-none'
                                    : `${getIntensityClass(
                                        theme,
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
            ))}
          </div>
        ) : (
          /* 2. CONTINUOUS 53-WEEK STRIP VIEW */
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-2 pt-1 scrollbar-thin select-none"
          >
            <div className="inline-block min-w-max">
              {/* Top Month Header Row */}
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
                <div className="flex flex-col gap-[3px] pr-2 w-8 shrink-0 text-right select-none">
                  <div className="h-[11px]" />
                  <div className="h-[11px] text-[9px] text-ink-muted leading-[11px] font-sans">
                    Mon
                  </div>
                  <div className="h-[11px]" />
                  <div className="h-[11px] text-[9px] text-ink-muted leading-[11px] font-sans">
                    Wed
                  </div>
                  <div className="h-[11px]" />
                  <div className="h-[11px] text-[9px] text-ink-muted leading-[11px] font-sans">
                    Fri
                  </div>
                  <div className="h-[11px]" />
                </div>

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
                                    theme,
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
        )}

        {/* Card Footer: Explainer Trigger + Theme Palette Selector + Intensity Legend */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs text-ink-muted">
          {/* Explainer Link */}
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="flex items-center gap-1.5 text-ink-secondary hover:text-accent transition-colors self-start cursor-pointer"
          >
            <Info size={12} />
            <span>How reading levels are scored</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${showExplainer ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Color Palette Switcher & Intensity Swatches */}
          <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto font-sans">
            {/* 4 Literary Color Palettes */}
            <div className="flex items-center gap-1 bg-surface-raised dark:bg-surface-dark p-0.5 rounded-lg border border-rule dark:border-rule-dark">
              <span className="text-3xs text-ink-muted pl-1 pr-0.5 flex items-center gap-1">
                <Palette size={11} />
                <span className="hidden xs:inline">Theme:</span>
              </span>
              <button
                onClick={() => handleThemeChange('amber')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-3xs font-medium transition-colors cursor-pointer ${
                  theme === 'amber'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Warm Amber (Candlelight)"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>Amber</span>
              </button>
              <button
                onClick={() => handleThemeChange('sapphire')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-3xs font-medium transition-colors cursor-pointer ${
                  theme === 'sapphire'
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Archival Sapphire (Molat Brand)"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                <span>Sapphire</span>
              </button>
              <button
                onClick={() => handleThemeChange('amethyst')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-3xs font-medium transition-colors cursor-pointer ${
                  theme === 'amethyst'
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Royal Amethyst (Velvet Violet)"
              >
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                <span>Plum</span>
              </button>
              <button
                onClick={() => handleThemeChange('emerald')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-3xs font-medium transition-colors cursor-pointer ${
                  theme === 'emerald'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                    : 'text-ink-secondary hover:text-ink'
                }`}
                title="Classic Emerald"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                <span>Green</span>
              </button>
            </div>

            {/* Less -> More Swatch Legend */}
            <div className="flex items-center gap-1">
              <span className="text-3xs">Less</span>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <span
                  key={lvl}
                  title={`Level ${lvl}`}
                  className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(theme, lvl)}`}
                />
              ))}
              <span className="text-3xs">More</span>
            </div>
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
                <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(theme, 1)}`} />
                <span>Level 1: 1–9 pages</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(theme, 2)}`} />
                <span>Level 2: 10–19 pages</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(theme, 3)}`} />
                <span>Level 3: 20–49 pages</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-[2px] ${getIntensityClass(theme, 4)}`} />
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
    </div>
  );
};
