import React, { useState } from 'react';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  DollarSign,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Hourglass,
  PauseCircle,
  MapPin,
  Sparkles,
  Award,
  Layers,
  ArrowUpRight,
  Library,
} from 'lucide-react';
import type { Book, PortfolioSummary, StreakSummary } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';

interface LibraryInsightsProps {
  books: Book[];
  portfolio: PortfolioSummary | null;
  streakSummary: StreakSummary | null;
}

// Harmonious, bookish color palette for pie/donut charts
const PALETTE = [
  '#1E3A8A', // Oxford Blue
  '#0D9488', // Teal
  '#D97706', // Amber Ochre
  '#7C3AED', // Royal Violet
  '#E11D48', // Crimson Rose
  '#059669', // Emerald
  '#4338CA', // Indigo
  '#C2410C', // Terracotta
  '#64748B', // Slate
  '#8B5CF6', // Lavender
];

export const LibraryInsights: React.FC<LibraryInsightsProps> = ({
  books,
  portfolio,
  streakSummary,
}) => {
  const { setSelectedBook, setActiveTab, setSelectedGenres } = useLibraryStore();
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);

  const totalBooks = books.length;

  // 1. Genre Analysis & Distribution
  const genreData = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of books) {
      if (!b.genre) continue;
      const parts = b.genre.split(',').map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        map[p] = (map[p] || 0) + 1;
      }
    }

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 7);
    const othersCount = sorted.slice(7).reduce((acc, curr) => acc + curr[1], 0);

    const slices = top.map(([genre, count], idx) => ({
      genre,
      count,
      color: PALETTE[idx % PALETTE.length],
    }));

    if (othersCount > 0) {
      slices.push({
        genre: 'Other Categories',
        count: othersCount,
        color: '#94A3B8',
      });
    }

    const totalInstances = slices.reduce((acc, curr) => acc + curr.count, 0);

    return {
      slices,
      totalInstances,
      uniqueCount: Object.keys(map).length,
    };
  }, [books]);

  // 2. Reading Status Breakdown (Tsundoku Index)
  const statusCounts = React.useMemo(() => {
    const counts = {
      COMPLETED: 0,
      READING: 0,
      UNREAD: 0,
      PAUSED: 0,
      ABANDONED: 0,
    };
    for (const b of books) {
      if (b.reading_status in counts) {
        counts[b.reading_status as keyof typeof counts]++;
      }
    }
    const completedPct = totalBooks > 0 ? Math.round((counts.COMPLETED / totalBooks) * 100) : 0;
    const tsundokuPct = totalBooks > 0 ? Math.round((counts.UNREAD / totalBooks) * 100) : 0;
    const readingPct = totalBooks > 0 ? Math.round((counts.READING / totalBooks) * 100) : 0;

    return { counts, completedPct, tsundokuPct, readingPct };
  }, [books, totalBooks]);

  // 3. Top Authors
  const topAuthors = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of books) {
      if (!b.authors) continue;
      const primary = b.authors.split(',')[0].trim();
      if (primary) {
        map[primary] = (map[primary] || 0) + 1;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [books]);

  // 4. Financial Highlights
  const financialHighlights = React.useMemo(() => {
    const validBooks = books.filter((b) => (b.purchase_price || 0) > 0);
    const avgCost =
      validBooks.length > 0
        ? Math.round(
            validBooks.reduce((sum, b) => sum + (b.purchase_price || 0), 0) / validBooks.length
          )
        : 0;

    // Highest Retail MRP
    const topValue = [...books]
      .filter((b) => (b.rp || 0) > 0)
      .sort((a, b) => (b.rp || 0) - (a.rp || 0))
      .slice(0, 3);

    // Biggest Savings in INR
    const topSavings = [...books]
      .filter((b) => (b.rp || 0) > (b.purchase_price || 0))
      .sort(
        (a, b) =>
          ((b.rp || 0) - (b.purchase_price || 0)) -
          ((a.rp || 0) - (a.purchase_price || 0))
      )
      .slice(0, 3);

    return { avgCost, topValue, topSavings };
  }, [books]);

  // Total pages logged across the year from heatmap
  const totalPagesYear = React.useMemo(() => {
    return Object.values(streakSummary?.heatmap_365 || {}).reduce((acc, curr) => acc + curr, 0);
  }, [streakSummary]);

  // 5. Physical Condition Breakdown
  const conditionCounts = React.useMemo(() => {
    const counts: Record<string, number> = { New: 0, Good: 0, Fair: 0, Damaged: 0 };
    for (const b of books) {
      const c = b.condition || 'Good';
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [books]);

  // 6. Shelf Locations
  const locationCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of books) {
      const loc = b.location || 'Home Shelf';
      counts[loc] = (counts[loc] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [books]);

  // SVG Donut Path calculations
  const renderDonutSlices = () => {
    const size = 200;
    const center = size / 2;
    const radius = 75;
    const strokeWidth = 28;

    let cumulativeAngle = 0;

    return genreData.slices.map((slice, idx) => {
      const percentage = slice.count / (genreData.totalInstances || 1);
      const angle = percentage * 360;

      // Arc coordinates
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      const isFull = angle >= 359.9;
      const largeArcFlag = angle > 180 ? 1 : 0;

      const startRad = ((startAngle - 90) * Math.PI) / 180.0;
      const endRad = ((endAngle - 90) * Math.PI) / 180.0;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const d = isFull
        ? `M ${center - radius} ${center} A ${radius} ${radius} 0 1 0 ${center + radius} ${center} A ${radius} ${radius} 0 1 0 ${center - radius} ${center}`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

      const isHovered = hoveredGenre === slice.genre;

      return (
        <path
          key={slice.genre}
          d={d}
          fill="none"
          stroke={slice.color}
          strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
          className="transition-all duration-200 cursor-pointer"
          onMouseEnter={() => setHoveredGenre(slice.genre)}
          onMouseLeave={() => setHoveredGenre(null)}
          onClick={() => {
            if (slice.genre !== 'Other Categories') {
              setSelectedGenres([slice.genre]);
              setActiveTab('shelf');
            }
          }}
        />
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-ink dark:text-ink-dark flex items-center gap-2">
            <PieChartIcon size={24} className="text-accent" />
            <span>Library Insights & Analytics</span>
          </h2>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
            Visual statistics, category distribution, investment yield, and reading patterns across your collection.
          </p>
        </div>
      </div>

      {/* 4 Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-3xs uppercase tracking-wider font-medium">Catalogued Volumes</span>
            <Library size={16} className="text-accent" />
          </div>
          <p className="font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
            {totalBooks}
          </p>
          <p className="text-3xs text-ink-secondary">
            Across {genreData.uniqueCount} distinct literary categories
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-3xs uppercase tracking-wider font-medium">Collection Market Value</span>
            <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
            ₹{(portfolio?.total_rp || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-3xs text-emerald-700 dark:text-emerald-400 font-medium">
            Acquired for ₹{(portfolio?.total_cp || 0).toLocaleString('en-IN')} ({portfolio?.discount_pct || 0}% saved)
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-3xs uppercase tracking-wider font-medium">Completed Books</span>
            <CheckCircle2 size={16} className="text-accent" />
          </div>
          <p className="font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
            {statusCounts.completedPct}%
          </p>
          <p className="text-3xs text-ink-secondary">
            {statusCounts.counts.COMPLETED} completed &bull; {statusCounts.counts.READING} currently in progress
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-3xs uppercase tracking-wider font-medium">Tsundoku Backlog</span>
            <Hourglass size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
            {statusCounts.tsundokuPct}%
          </p>
          <p className="text-3xs text-ink-secondary">
            {statusCounts.counts.UNREAD} volumes awaiting first reading
          </p>
        </div>
      </div>

      {/* Main Charts Grid: Genre Donut & Reading Status Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Genre Distribution Donut Chart (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark">
                Genre & Category Distribution
              </h3>
              <p className="text-2xs text-ink-muted">
                Tap any category slice to immediately filter shelf volumes
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-3xs font-mono font-medium uppercase bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark">
              {genreData.uniqueCount} genres
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* SVG Donut */}
            <div className="relative shrink-0 w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {renderDonutSlices()}
              </svg>
              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="font-mono text-lg font-bold text-ink dark:text-ink-dark">
                  {hoveredGenre
                    ? genreData.slices.find((s) => s.genre === hoveredGenre)?.count || totalBooks
                    : totalBooks}
                </span>
                <span className="text-3xs text-ink-muted font-medium truncate max-w-[100px]">
                  {hoveredGenre || 'Volumes'}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 w-full space-y-1.5 text-xs max-h-56 overflow-y-auto pr-1">
              {genreData.slices.map((slice) => {
                const pct = Math.round(
                  (slice.count / (genreData.totalInstances || 1)) * 100
                );
                const isHovered = hoveredGenre === slice.genre;

                return (
                  <div
                    key={slice.genre}
                    onMouseEnter={() => setHoveredGenre(slice.genre)}
                    onMouseLeave={() => setHoveredGenre(null)}
                    onClick={() => {
                      if (slice.genre !== 'Other Categories') {
                        setSelectedGenres([slice.genre]);
                        setActiveTab('shelf');
                      }
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                      isHovered
                        ? 'bg-surface dark:bg-surface-dark font-medium'
                        : 'hover:bg-surface/60 dark:hover:bg-surface-dark/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate text-2xs text-ink dark:text-ink-dark">
                        {slice.genre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-3xs text-ink-muted">
                      <span>{slice.count}</span>
                      <span className="w-8 text-right font-medium text-ink-secondary">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reading Progress & Tsundoku Stack (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark">
              Reading Lifecycle & Backlog
            </h3>
            <p className="text-2xs text-ink-muted">
              Current shelf reading states and backlog velocity
            </p>
          </div>

          {/* Visual Stacked Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-surface dark:bg-surface-dark border border-rule/60">
              <div
                style={{ width: `${statusCounts.completedPct}%` }}
                className="bg-emerald-600 transition-all"
                title={`Completed: ${statusCounts.counts.COMPLETED} (${statusCounts.completedPct}%)`}
              />
              <div
                style={{ width: `${statusCounts.readingPct}%` }}
                className="bg-accent transition-all"
                title={`Reading: ${statusCounts.counts.READING} (${statusCounts.readingPct}%)`}
              />
              <div
                style={{ width: `${statusCounts.tsundokuPct}%` }}
                className="bg-amber-400 transition-all"
                title={`Unread: ${statusCounts.counts.UNREAD} (${statusCounts.tsundokuPct}%)`}
              />
            </div>

            <div className="flex items-center justify-between text-3xs font-mono text-ink-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                Completed ({statusCounts.counts.COMPLETED})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                Reading ({statusCounts.counts.READING})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Unread ({statusCounts.counts.UNREAD})
              </span>
            </div>
          </div>

          {/* Velocity & Completion Insights */}
          <div className="space-y-2 pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Reading Velocity</span>
              <span className="font-mono font-medium text-ink dark:text-ink-dark">
                {streakSummary?.reading_velocity_pages_per_day || 0} pages/day
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Longest Streak</span>
              <span className="font-mono font-medium text-ink dark:text-ink-dark">
                {streakSummary?.longest_streak_days || 0} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Total Pages Logged (365d)</span>
              <span className="font-mono font-medium text-ink dark:text-ink-dark">
                {totalPagesYear} pages
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('tracker')}
            className="w-full py-2 rounded-xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Full 365-Day Heatmap</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Secondary Analytics: Financial Value & Top Authors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Top Value Volumes */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
              <Award size={15} className="text-amber-500" />
              <span>Highest Value Volumes</span>
            </h3>
            <span className="text-3xs font-mono text-ink-muted">By Retail MRP</span>
          </div>

          <div className="space-y-2.5">
            {financialHighlights.topValue.map((book, idx) => (
              <div
                key={book.book_id}
                onClick={() => setSelectedBook(book)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark cursor-pointer transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-serif text-xs font-medium text-ink dark:text-ink-dark truncate">
                    {idx + 1}. {book.title}
                  </p>
                  <p className="text-3xs text-ink-muted truncate">{book.authors || 'Unknown'}</p>
                </div>
                <span className="font-mono text-xs font-semibold text-ink dark:text-ink-dark shrink-0">
                  ₹{book.rp?.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Greatest Savings Volumes */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
              <Sparkles size={15} className="text-emerald-500" />
              <span>Best Value Acquisitions</span>
            </h3>
            <span className="text-3xs font-mono text-ink-muted">Net Savings</span>
          </div>

          <div className="space-y-2.5">
            {financialHighlights.topSavings.map((book, idx) => {
              const diff = (book.rp || 0) - (book.purchase_price || 0);
              return (
                <div
                  key={book.book_id}
                  onClick={() => setSelectedBook(book)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-serif text-xs font-medium text-ink dark:text-ink-dark truncate">
                      {idx + 1}. {book.title}
                    </p>
                    <p className="text-3xs text-ink-muted truncate">
                      Paid ₹{book.purchase_price} vs MRP ₹{book.rp}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    +₹{diff.toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Collected Authors */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
              <Bookmark size={15} className="text-accent" />
              <span>Top Authors Collected</span>
            </h3>
            <span className="text-3xs font-mono text-ink-muted">Volumes</span>
          </div>

          <div className="space-y-2">
            {topAuthors.map(([author, count], idx) => (
              <div
                key={author}
                className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              >
                <span className="truncate pr-2 text-ink dark:text-ink-dark font-medium">
                  {idx + 1}. {author}
                </span>
                <span className="font-mono text-2xs font-semibold text-accent dark:text-accent-dark shrink-0">
                  {count} {count === 1 ? 'book' : 'books'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tertiary Row: Shelf Locations & Physical Condition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Shelf Placement */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
            <MapPin size={15} className="text-ink-muted" />
            <span>Physical Shelf Locations</span>
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {locationCounts.map(([loc, count]) => (
              <div
                key={loc}
                className="p-3 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark flex items-center justify-between"
              >
                <span className="truncate pr-2 text-ink dark:text-ink-dark">{loc}</span>
                <span className="font-mono text-xs font-semibold text-ink-muted">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Condition Distribution */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
            <Layers size={15} className="text-ink-muted" />
            <span>Physical Volume Condition</span>
          </h3>

          <div className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(conditionCounts).map(([cond, count]) => (
              <div
                key={cond}
                className="p-3 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark space-y-1"
              >
                <span className="text-3xs uppercase tracking-wider text-ink-muted block font-medium">
                  {cond}
                </span>
                <p className="font-mono text-lg font-semibold text-ink dark:text-ink-dark">
                  {count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
