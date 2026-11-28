import React, { useState, useEffect } from 'react';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Hourglass,
  PauseCircle,
  MapPin,
  Sparkles,
  Layers,
  ArrowUpRight,
  Library,
  Star,
  Globe,
  Calendar,
  History,
  Tag,
  Clock,
  BarChart3,
  Coins,
  Building2,
  Compass,
  Zap,
} from 'lucide-react';
import type { Book, PortfolioSummary, StreakSummary, ReadingLog } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { PageSkeletonLoader } from './PageSkeletonLoader';

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
  const { setSelectedBook, setActiveTab, setSelectedGenres, setSearch, readingLogs, loading, refreshing } = useLibraryStore();
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [growthViewMode, setGrowthViewMode] = useState<'combo' | 'annual' | 'cumulative'>('combo');
  const [hoveredWaveIndex, setHoveredWaveIndex] = useState<number | null>(null);

  if ((loading || refreshing) && books.length === 0) {
    return <PageSkeletonLoader activeTab="insights" />;
  }

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

  // 4. Title & Description Lexicon (Natural NLP word cloud from title + subtitle + short description/notes)
  const titleAnatomy = React.useMemo(() => {
    const STOP_WORDS = new Set([
      'the', 'of', 'and', 'in', 'a', 'to', 'for', 'on', 'with', 'at', 'by', 'from', 'an', 'as',
      'into', 'about', 'is', 'it', 'or', 'part', 'vol', 'volume', 'collection', 'edition', 'book',
      'my', 'your', 'his', 'her', 'their', 'our', 'all', 'one', 'two', 'three', 'four', 'five',
      'that', 'this', 'how', 'what', 'who', 'not', 'be', 'are', 'was', 'were', 'complete', 'stories',
      'selected', 'best', 'short', 'new', 'series', 'tales', 'have', 'has', 'had', 'been', 'which',
      'when', 'where', 'there', 'they', 'them', 'then', 'than', 'some', 'any', 'each', 'more',
      'most', 'other', 'its', 'also', 'such', 'only', 'can', 'will', 'just', 'should', 'would',
      'could', 'may', 'might', 'must', 'after', 'before', 'between', 'under', 'over', 'through',
      'during', 'without', 'again', 'further', 'once', 'here', 'why', 'while', 'both', 'very',
      'own', 'same', 'out', 'down', 'nor', 'too', 'well', 'much', 'many', 'like', 'life', 'get',
      'got', 'see', 'seen', 'way', 'make', 'made', 'first', 'last', 'good', 'great', 'take', 'took'
    ]);

    const wordCounts: Record<string, { count: number; sampleTitle: string }> = {};
    let totalWords = 0;

    books.forEach((book) => {
      if (!book.title) return;
      totalWords += book.title.trim().split(/\s+/).length;

      // Extract text sources: title + subtitle + notes (short description if present)
      const textSources = [book.title, book.subtitle, book.notes]
        .filter(Boolean)
        .join(' ');

      const rawWords = textSources
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

      // Use a Set per book so one long description doesn't artificially skew frequency counts
      const uniqueWordsInBook = new Set(rawWords);

      uniqueWordsInBook.forEach((w) => {
        const displayWord = w.charAt(0).toUpperCase() + w.slice(1);
        if (!wordCounts[displayWord]) {
          wordCounts[displayWord] = { count: 0, sampleTitle: book.title };
        }
        wordCounts[displayWord].count++;
      });
    });

    const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1].count - a[1].count);
    const topKeywords = sortedWords.slice(0, 24).map(([word, data]) => ({
      word,
      count: data.count,
      sampleTitle: data.sampleTitle,
    }));

    const maxCount = topKeywords.length > 0 ? topKeywords[0].count : 1;
    const minCount = topKeywords.length > 0 ? topKeywords[topKeywords.length - 1].count : 1;

    const avgTitleLength = books.length > 0 ? (totalWords / books.length).toFixed(1) : '0';

    const validTitles = books.filter((b) => b.title && b.title.trim().length > 0);
    const sortedByLen = [...validTitles].sort((a, b) => a.title.length - b.title.length);
    const shortestBook = sortedByLen[0] || null;
    const longestBook = sortedByLen[sortedByLen.length - 1] || null;

    return {
      topKeywords,
      maxCount,
      minCount,
      avgTitleLength,
      shortestBook,
      longestBook,
      totalUniqueWords: Object.keys(wordCounts).length,
    };
  }, [books]);

  // 5. Historical Publication Eras & Library Age Analysis
  const libraryAgeStats = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const booksWithYear = books.filter(
      (b) => b.publication_year && b.publication_year >= 1800 && b.publication_year <= currentYear + 1
    );

    if (!booksWithYear.length) {
      return {
        medianYear: 0,
        oldestBook: null as Book | null,
        newestBook: null as Book | null,
        eras: [] as { label: string; range: string; count: number; color: string; pct: number }[],
        totalWithYear: 0,
      };
    }

    const sorted = [...booksWithYear].sort((a, b) => (a.publication_year || 0) - (b.publication_year || 0));
    const oldestBook = sorted[0];
    const newestBook = sorted[sorted.length - 1];
    const midIdx = Math.floor(sorted.length / 2);
    const medianYear = sorted[midIdx]?.publication_year || 0;

    const eras = [
      { label: 'Classics & Golden Age', range: 'Pre-2000', count: 0, color: '#C2410C', pct: 0 },
      { label: '2000s Decade', range: '2000 - 2009', count: 0, color: '#D97706', pct: 0 },
      { label: '2010s Decade', range: '2010 - 2019', count: 0, color: '#0D9488', pct: 0 },
      { label: 'Contemporary 2020s', range: '2020 - Present', count: 0, color: '#1E3A8A', pct: 0 },
    ];

    booksWithYear.forEach((b) => {
      const yr = b.publication_year || 0;
      if (yr < 2000) eras[0].count++;
      else if (yr < 2010) eras[1].count++;
      else if (yr < 2020) eras[2].count++;
      else eras[3].count++;
    });

    eras.forEach((e) => {
      e.pct = Math.round((e.count / booksWithYear.length) * 100);
    });

    return {
      medianYear,
      oldestBook,
      newestBook,
      eras,
      totalWithYear: booksWithYear.length,
    };
  }, [books]);

  // 6. Literary Houses & Publishing Imprints
  const publisherData = React.useMemo(() => {
    const counts: Record<string, { count: number; sampleTitle: string }> = {};
    let totalWithPublisher = 0;

    for (const b of books) {
      if (!b.publisher || !b.publisher.trim()) continue;
      const pub = b.publisher.trim();
      if (!counts[pub]) {
        counts[pub] = { count: 0, sampleTitle: b.title };
      }
      counts[pub].count += 1;
      totalWithPublisher += 1;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
    const top = sorted.slice(0, 6);
    const topPublisher = top[0] || null;

    return {
      top,
      totalWithPublisher,
      uniquePublishers: Object.keys(counts).length,
      topPublisher: topPublisher ? { name: topPublisher[0], count: topPublisher[1].count } : null,
      maxCount: topPublisher ? topPublisher[1].count : 1,
    };
  }, [books]);

  // 7. The Reader's Clock: Day-of-Week & Pacing Rhythm
  const readingRhythmData = React.useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let weekendPages = 0;
    let weekdayPages = 0;
    let totalHeatmapPages = 0;

    const heatmap = streakSummary?.heatmap_365 || {};
    Object.entries(heatmap).forEach(([dateStr, pages]) => {
      if (pages <= 0) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const dayIdx = d.getDay();
      dayTotals[dayIdx] += pages;
      totalHeatmapPages += pages;
      if (dayIdx === 0 || dayIdx === 6) {
        weekendPages += pages;
      } else {
        weekdayPages += pages;
      }
    });

    const maxDayPages = Math.max(...dayTotals, 1);
    const dayDistribution = dayNames.map((name, idx) => ({
      name,
      pages: dayTotals[idx],
      pctOfMax: Math.round((dayTotals[idx] / maxDayPages) * 100),
      isWeekend: idx === 0 || idx === 6,
    }));

    // Reading speed from readingLogs if duration > 0
    let totalPgs = 0;
    let totalMins = 0;
    readingLogs.forEach((l) => {
      if (l.duration_minutes > 0 && l.pages_read > 0) {
        totalPgs += l.pages_read;
        totalMins += l.duration_minutes;
      }
    });

    const pagesPerHour = totalMins > 0 ? Math.round((totalPgs / totalMins) * 60) : 38;
    const minutesPerPage = totalPgs > 0 ? (totalMins / totalPgs).toFixed(1) : '1.6';
    const weekendPct = totalHeatmapPages > 0 ? Math.round((weekendPages / totalHeatmapPages) * 100) : 55;

    return {
      dayDistribution,
      pagesPerHour,
      minutesPerPage,
      weekendPct,
      weekdayPct: 100 - weekendPct,
      hasSessionData: totalMins > 0,
      totalLogsTracked: readingLogs.length,
    };
  }, [streakSummary, readingLogs]);

  // 6. Library Growth & Acquisition Waves (Timeline grouping by purchase_date / created_at)
  const acquisitionWaves = React.useMemo(() => {
    const yearData: Record<string, { count: number; spend: number; rp: number }> = {};

    books.forEach((b) => {
      const rawDate = b.purchase_date || b.created_at;
      let yr = 'Pre-App Era';
      if (rawDate) {
        const match = rawDate.match(/^(\d{4})/);
        if (match && parseInt(match[1], 10) >= 1990 && parseInt(match[1], 10) <= 2035) {
          yr = match[1];
        }
      }
      if (!yearData[yr]) {
        yearData[yr] = { count: 0, spend: 0, rp: 0 };
      }
      yearData[yr].count += 1;
      yearData[yr].spend += b.purchase_price || 0;
      yearData[yr].rp += b.rp || 0;
    });

    const sorted = Object.entries(yearData).sort((a, b) => {
      if (a[0] === 'Pre-App Era') return -1;
      if (b[0] === 'Pre-App Era') return 1;
      return a[0].localeCompare(b[0]);
    });

    const maxCount = Math.max(...sorted.map(([, d]) => d.count), 1);
    const peak = [...sorted].sort((a, b) => b[1].count - a[1].count)[0];

    let runningTotal = 0;
    const timeline = sorted.map(([year, data], idx) => {
      runningTotal += data.count;
      const prev = idx > 0 ? sorted[idx - 1][1].count : null;
      let yoyPct: number | null = null;
      let yoyTrend: 'up' | 'down' | 'same' | null = null;
      if (prev !== null && prev > 0 && year !== 'Pre-App Era') {
        const diff = data.count - prev;
        yoyPct = Math.round((diff / prev) * 100);
        yoyTrend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
      }

      return {
        year,
        count: data.count,
        spend: data.spend,
        rp: data.rp,
        pct: Math.round((data.count / maxCount) * 100),
        cumulativeCount: runningTotal,
        cumulativePct: Math.round((runningTotal / (books.length || 1)) * 100),
        yoyPct,
        yoyTrend,
      };
    });

    const datedWaves = timeline.filter((w) => w.year !== 'Pre-App Era');
    const avgPerYear = datedWaves.length > 0 ? Math.round(books.length / datedWaves.length) : books.length;

    return {
      timeline,
      peakYear: peak ? peak[0] : null,
      peakCount: peak ? peak[1].count : 0,
      maxCount,
      avgPerYear,
      totalYears: datedWaves.length,
    };
  }, [books]);

  // Total pages logged across the year from heatmap
  const totalPagesYear = React.useMemo(() => {
    return Object.values(streakSummary?.heatmap_365 || {}).reduce((acc, curr) => acc + curr, 0);
  }, [streakSummary]);

  // 6. Language Distribution
  const languageCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of books) {
      const lang = b.language || 'English';
      counts[lang] = (counts[lang] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
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

  // Dual-Axis Combo Chart: Bar Graph (Annual Intake & YoY Dips/Surges) + Line Graph (Cumulative Collection)
  const renderAcquisitionComboChart = () => {
    const { timeline, maxCount } = acquisitionWaves;
    if (timeline.length === 0) return null;

    const width = 640;
    const height = 210;
    const padding = { top: 32, right: 38, bottom: 44, left: 38 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxBar = Math.max(maxCount * 1.25, 1);
    const maxLine = Math.max(books.length * 1.05, 1);
    const n = timeline.length;
    const step = chartWidth / n;
    const barWidth = Math.min(36, step * 0.52);

    // Calculate bar and line coordinates
    const points = timeline.map((wave, idx) => {
      const cx = padding.left + (idx + 0.5) * step;
      const barH = (wave.count / maxBar) * chartHeight;
      const barY = padding.top + chartHeight - barH;
      const barX = cx - barWidth / 2;
      const lineY = padding.top + chartHeight - (wave.cumulativeCount / maxLine) * chartHeight;
      return { wave, idx, cx, barX, barY, barH, lineY };
    });

    // Generate smooth line path for cumulative curve
    let linePath = '';
    let areaPath = '';
    if (points.length > 0) {
      linePath = `M ${points[0].cx} ${points[0].lineY}`;
      areaPath = `M ${points[0].cx} ${padding.top + chartHeight} L ${points[0].cx} ${points[0].lineY}`;
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const cpX1 = curr.cx + (next.cx - curr.cx) / 2;
        const cpY1 = curr.lineY;
        const cpX2 = curr.cx + (next.cx - curr.cx) / 2;
        const cpY2 = next.lineY;
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.cx} ${next.lineY}`;
        areaPath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.cx} ${next.lineY}`;
      }
      areaPath += ` L ${points[points.length - 1].cx} ${padding.top + chartHeight} Z`;
    }

    return (
      <div className="w-full space-y-3 pt-1">
        {/* Chart Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-2xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-accent dark:bg-accent-dark inline-block" />
              <span className="text-ink-secondary dark:text-ink-dark-secondary font-medium">Annual Additions (Bars)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full inline-block" />
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 -ml-1.5 inline-block" />
              <span className="text-ink-secondary dark:text-ink-dark-secondary font-medium">Cumulative Total (Line)</span>
            </div>
          </div>
          <span className="text-3xs text-ink-muted">Hover/tap points for volume trajectory</span>
        </div>

        {/* Responsive SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[500px] overflow-visible select-none"
          >
            <defs>
              <linearGradient id="cumulAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padding.top + chartHeight * (1 - pct);
              return (
                <line
                  key={pct}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-rule/40 dark:text-rule-dark/40"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Cumulative Area Fill */}
            {areaPath && <path d={areaPath} fill="url(#cumulAreaGrad)" />}

            {/* Annual Addition Bars */}
            {points.map((pt) => {
              const isHovered = hoveredWaveIndex === pt.idx;
              return (
                <g
                  key={pt.wave.year}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredWaveIndex(pt.idx)}
                  onMouseLeave={() => setHoveredWaveIndex(null)}
                >
                  {/* Bar */}
                  <rect
                    x={pt.barX}
                    y={pt.barY}
                    width={barWidth}
                    height={Math.max(4, pt.barH)}
                    rx={5}
                    className={`transition-all duration-200 ${
                      isHovered
                        ? 'fill-accent dark:fill-accent-dark opacity-100'
                        : 'fill-accent/80 hover:fill-accent opacity-90'
                    }`}
                  />

                  {/* Bar Top Value Label */}
                  <text
                    x={pt.cx}
                    y={pt.barY - 6}
                    textAnchor="middle"
                    className="font-mono text-[11px] font-bold fill-ink dark:fill-ink-dark"
                  >
                    +{pt.wave.count}
                  </text>

                  {/* X Axis Year Label */}
                  <text
                    x={pt.cx}
                    y={padding.top + chartHeight + 17}
                    textAnchor="middle"
                    className={`font-mono text-[10px] tracking-wider transition-colors ${
                      isHovered
                        ? 'font-bold fill-accent dark:fill-accent-dark'
                        : 'fill-ink-muted'
                    }`}
                  >
                    {pt.wave.year}
                  </text>

                  {/* YoY Delta Subtext (Rise / Fall) */}
                  {pt.wave.yoyTrend === 'up' && pt.wave.yoyPct !== null && (
                    <text
                      x={pt.cx}
                      y={padding.top + chartHeight + 29}
                      textAnchor="middle"
                      className="font-mono text-[9px] font-semibold fill-emerald-600 dark:fill-emerald-400"
                    >
                      +{pt.wave.yoyPct}%
                    </text>
                  )}
                  {pt.wave.yoyTrend === 'down' && pt.wave.yoyPct !== null && (
                    <text
                      x={pt.cx}
                      y={padding.top + chartHeight + 29}
                      textAnchor="middle"
                      className="font-mono text-[9px] font-semibold fill-rose-600 dark:fill-rose-400"
                    >
                      {pt.wave.yoyPct}%
                    </text>
                  )}
                  {pt.wave.year === 'Pre-App Era' && (
                    <text
                      x={pt.cx}
                      y={padding.top + chartHeight + 29}
                      textAnchor="middle"
                      className="text-[9px] fill-ink-muted"
                    >
                      Base
                    </text>
                  )}
                </g>
              );
            })}

            {/* Cumulative Spline Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Cumulative Data Points */}
            {points.map((pt) => {
              const isHovered = hoveredWaveIndex === pt.idx;
              return (
                <g
                  key={`pt-${pt.wave.year}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredWaveIndex(pt.idx)}
                  onMouseLeave={() => setHoveredWaveIndex(null)}
                >
                  <circle
                    cx={pt.cx}
                    cy={pt.lineY}
                    r={isHovered ? 6 : 4}
                    className="fill-canvas dark:fill-canvas-dark stroke-emerald-600 dark:stroke-emerald-400 stroke-2 transition-all"
                  />
                  {(isHovered || pt.idx === points.length - 1) && (
                    <text
                      x={pt.cx}
                      y={pt.lineY - 9}
                      textAnchor="middle"
                      className="font-mono text-[10px] font-bold fill-emerald-700 dark:fill-emerald-400"
                    >
                      {pt.wave.cumulativeCount} vols
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rule/80 dark:border-rule-dark/80 pb-4">
        <div className="min-w-0">
          <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-warm dark:text-amber-400">
            ❧ Collection Telemetry
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Library Insights &amp; Analytics
          </h1>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-1">
            Visual statistics, category distribution, reading velocity, and habits across your collection.
          </p>
        </div>
      </header>

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
            <span className="text-3xs uppercase tracking-wider font-medium">Reading Velocity</span>
            <TrendingUp size={16} className="text-accent dark:text-accent-dark" />
          </div>
          <p className="font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
            {streakSummary?.reading_velocity_pages_per_day || 0}{' '}
            <span className="text-xs font-normal text-ink-muted">pg/day</span>
          </p>
          <p className="text-3xs text-ink-secondary">
            {totalPagesYear} pages logged &bull; {streakSummary?.current_streak_days || 0}d current streak
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

      {/* Secondary Analytics: Authors, Top Rated & Publication Eras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

        {/* Title & Synopsis Lexicon (Thematic Word Cloud) */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
              <Sparkles size={15} className="text-accent" />
              <span>Lexicon & Word Cloud</span>
            </h3>
            <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              Avg {titleAnatomy.avgTitleLength} wds/title
            </span>
          </div>
          <p className="text-3xs text-ink-muted">
            Thematic motifs parsed across titles, subtitles, and short descriptions &bull; Tap word to search shelf
          </p>

          {/* Organic Thematic Word Cloud */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 py-3 px-2 rounded-xl bg-surface/50 dark:bg-surface-dark/50 border border-rule/30 dark:border-rule-dark/30 min-h-[140px]">
            {titleAnatomy.topKeywords.length > 0 ? (
              titleAnatomy.topKeywords.map(({ word, count, sampleTitle }) => {
                const range = Math.max(1, titleAnatomy.maxCount - titleAnatomy.minCount);
                const ratio = (count - titleAnatomy.minCount) / range;

                let sizeClass = 'text-2xs text-ink-muted font-normal';
                if (ratio >= 0.75) {
                  sizeClass = 'text-base sm:text-lg font-serif font-bold text-accent dark:text-accent-dark';
                } else if (ratio >= 0.45) {
                  sizeClass = 'text-xs sm:text-sm font-serif font-semibold text-ink dark:text-ink-dark';
                } else if (ratio >= 0.2) {
                  sizeClass = 'text-2xs sm:text-xs font-medium text-ink-secondary dark:text-ink-dark-secondary';
                }

                return (
                  <button
                    key={word}
                    onClick={() => {
                      setSearch(word);
                      setActiveTab('shelf');
                    }}
                    title={`Found in "${sampleTitle}" and ${count - 1} other books. Click to search shelf.`}
                    className={`inline-flex items-baseline gap-1 px-1.5 py-0.5 rounded-md hover:bg-accent/10 hover:text-accent transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${sizeClass}`}
                  >
                    <span>{word}</span>
                    <span className="text-[9px] font-mono opacity-50 font-normal">
                      {count}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-2xs text-ink-muted italic py-3 text-center">
                Add titles, subtitles, or descriptions to see thematic word cloud.
              </p>
            )}
          </div>

          {titleAnatomy.shortestBook && titleAnatomy.longestBook && (
            <div className="pt-2.5 border-t border-rule/40 dark:border-rule-dark/40 grid grid-cols-2 gap-2 text-3xs font-mono">
              <div className="p-2 rounded-lg bg-surface dark:bg-surface-dark truncate">
                <span className="text-ink-muted block text-[9px] uppercase tracking-wider">Shortest Title</span>
                <span className="text-ink dark:text-ink-dark font-medium truncate block" title={titleAnatomy.shortestBook.title}>
                  "{titleAnatomy.shortestBook.title}"
                </span>
              </div>
              <div className="p-2 rounded-lg bg-surface dark:bg-surface-dark truncate">
                <span className="text-ink-muted block text-[9px] uppercase tracking-wider">Longest Title</span>
                <span className="text-ink dark:text-ink-dark font-medium truncate block" title={titleAnatomy.longestBook.title}>
                  "{titleAnatomy.longestBook.title}"
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Historical Publication Eras & Library Age */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
              <History size={15} className="text-accent" />
              <span>Historical Eras & Age</span>
            </h3>
            <span className="text-3xs font-mono text-ink-muted">
              Median {libraryAgeStats.medianYear || '—'}
            </span>
          </div>

          {/* Oldest vs Newest Callout */}
          {libraryAgeStats.oldestBook && libraryAgeStats.newestBook && (
            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-surface dark:bg-surface-dark text-3xs border border-rule/50 dark:border-rule-dark/50">
              <div className="min-w-0 pr-1">
                <span className="text-ink-muted uppercase tracking-wider block font-medium">Oldest Print</span>
                <p className="font-serif text-xs font-semibold text-ink dark:text-ink-dark truncate">
                  {libraryAgeStats.oldestBook.title}
                </p>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {libraryAgeStats.oldestBook.publication_year}
                </span>
              </div>
              <div className="min-w-0 pl-1 border-l border-rule/40 dark:border-rule-dark/40">
                <span className="text-ink-muted uppercase tracking-wider block font-medium">Newest Release</span>
                <p className="font-serif text-xs font-semibold text-ink dark:text-ink-dark truncate">
                  {libraryAgeStats.newestBook.title}
                </p>
                <span className="font-mono text-accent dark:text-accent-dark font-bold">
                  {libraryAgeStats.newestBook.publication_year}
                </span>
              </div>
            </div>
          )}

          {/* Era Distribution Bars */}
          <div className="space-y-2 pt-1">
            {libraryAgeStats.eras.map((era) => (
              <div key={era.label} className="space-y-1">
                <div className="flex items-center justify-between text-2xs">
                  <span className="text-ink dark:text-ink-dark font-medium">{era.label}</span>
                  <span className="font-mono text-3xs text-ink-muted">
                    {era.count} vols ({era.pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface dark:bg-surface-dark overflow-hidden">
                  <div
                    style={{ width: `${era.pct}%`, backgroundColor: era.color }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Literary Houses & The Reader's Clock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Literary Houses & Publishing Imprints (Mobile-First Ergonomic Layout) */}
        <div className="p-4 sm:p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-sm sm:text-base font-medium text-ink dark:text-ink-dark flex items-center gap-1.5 sm:gap-2">
                <Building2 size={16} className="text-accent" />
                <span>Literary Houses & Imprints</span>
              </h3>
              <p className="text-3xs sm:text-2xs text-ink-muted">
                Publishing presses and editorial houses shaping your shelf
              </p>
            </div>
            {publisherData.topPublisher && (
              <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent dark:text-accent-dark font-medium shrink-0">
                Top: {publisherData.topPublisher.name}
              </span>
            )}
          </div>

          {publisherData.top.length > 0 ? (
            <div className="space-y-2.5 pt-0.5">
              {/* Segmented Proportions Ribbon */}
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-surface dark:bg-surface-dark border border-rule/50">
                {publisherData.top.map(([pub, data], idx) => {
                  const pct = Math.round((data.count / (publisherData.totalWithPublisher || 1)) * 100);
                  const colors = ['#C2410C', '#0D9488', '#D97706', '#1E3A8A', '#7C3AED', '#64748B'];
                  return (
                    <div
                      key={pub}
                      style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }}
                      className="h-full transition-all"
                      title={`${pub}: ${data.count} vols (${pct}%)`}
                    />
                  );
                })}
              </div>

              {/* Compact Mobile-Friendly Imprint Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {publisherData.top.map(([pub, data], idx) => {
                  const pct = Math.round((data.count / (books.length || 1)) * 100);
                  const colors = ['#C2410C', '#0D9488', '#D97706', '#1E3A8A', '#7C3AED', '#64748B'];
                  return (
                    <div
                      key={pub}
                      className="p-2 sm:p-2.5 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark flex items-center justify-between gap-1.5 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colors[idx % colors.length] }}
                        />
                        <span className="font-serif text-2xs sm:text-xs font-medium text-ink dark:text-ink-dark truncate" title={pub}>
                          {pub}
                        </span>
                      </div>
                      <span className="font-mono text-3xs font-semibold text-accent dark:text-accent-dark shrink-0">
                        {data.count} <span className="hidden sm:inline font-normal text-ink-muted">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-2xs text-ink-muted italic py-4 text-center">
              Scan or add book publisher metadata to see literary imprint distribution.
            </p>
          )}
        </div>

        {/* The Reader's Clock & Day-of-Week Rhythm */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark flex items-center gap-2">
                  <Clock size={17} className="text-accent" />
                  <span>The Reader's Clock & Velocity</span>
                </h3>
                <p className="text-2xs text-ink-muted">
                  Habitual reading speed, pace, and day-of-week intensity
                </p>
              </div>
              <span className="text-3xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                ~{readingRhythmData.pagesPerHour} pgs/hr
              </span>
            </div>

            {/* Velocity Highlights Strip */}
            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <div className="p-2.5 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark text-center">
                <span className="text-[10px] text-ink-muted uppercase tracking-wider block font-medium">Reading Pace</span>
                <span className="font-mono text-base font-bold text-ink dark:text-ink-dark">
                  {readingRhythmData.minutesPerPage}
                </span>
                <span className="text-[10px] text-ink-muted block">minutes / page</span>
              </div>
              <div className="p-2.5 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark text-center">
                <span className="text-[10px] text-ink-muted uppercase tracking-wider block font-medium">Rhythm Bias</span>
                <span className="font-mono text-base font-bold text-accent dark:text-accent-dark">
                  {readingRhythmData.weekendPct}%
                </span>
                <span className="text-[10px] text-ink-muted block">Weekend Reader</span>
              </div>
            </div>

            {/* 7-Day Reading Intensity Histogram */}
            <div className="pt-3 space-y-1.5">
              <span className="text-[11px] font-medium text-ink-secondary dark:text-ink-dark-secondary block">
                Reading Intensity Across the Week
              </span>
              <div className="grid grid-cols-7 gap-1.5 h-20 items-end pt-2 pb-1">
                {readingRhythmData.dayDistribution.map((day) => (
                  <div key={day.name} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        style={{ height: `${Math.max(12, day.pctOfMax)}%` }}
                        className={`w-full max-w-[24px] rounded-t-md transition-all ${
                          day.isWeekend
                            ? 'bg-accent dark:bg-accent-dark'
                            : 'bg-stone-400/60 dark:bg-stone-600/60'
                        }`}
                        title={`${day.name}: ${day.pages} pages logged`}
                      />
                    </div>
                    <span className={`text-[10px] font-mono ${day.isWeekend ? 'font-bold text-accent' : 'text-ink-muted'}`}>
                      {day.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-rule/40 dark:border-rule-dark/40 flex items-center justify-between text-3xs text-ink-muted">
            <span>Weekend vs Weekday balance</span>
            <span className="font-mono font-medium text-ink dark:text-ink-dark">
              {readingRhythmData.weekendPct}% Sat–Sun &bull; {readingRhythmData.weekdayPct}% Mon–Fri
            </span>
          </div>
        </div>
      </div>

      {/* Library Growth & Acquisition Waves */}
      <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark flex items-center gap-2">
              <BarChart3 size={17} className="text-accent" />
              <span>Library Growth & Acquisition Waves</span>
            </h3>
            <p className="text-2xs text-ink-muted">
              Chronological acquisition cohorts, annual acceleration/dips, and catalogue expansion pacing
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Combo Chart vs Annual Cohorts vs Cumulative Total */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 text-xs">
              <button
                onClick={() => setGrowthViewMode('combo')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  growthViewMode === 'combo'
                    ? 'bg-canvas dark:bg-canvas-dark text-accent dark:text-accent-dark font-medium shadow-2xs'
                    : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
                }`}
                title="Unified Bar (Annual) + Line (Cumulative) graph"
              >
                <Sparkles size={12} />
                <span>Combo Chart</span>
              </button>
              <button
                onClick={() => setGrowthViewMode('annual')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  growthViewMode === 'annual'
                    ? 'bg-canvas dark:bg-canvas-dark text-accent dark:text-accent-dark font-medium shadow-2xs'
                    : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
                }`}
                title="View annual net additions with rise/dip comparisons"
              >
                <BarChart3 size={12} />
                <span>Annual Additions</span>
              </button>
              <button
                onClick={() => setGrowthViewMode('cumulative')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  growthViewMode === 'cumulative'
                    ? 'bg-canvas dark:bg-canvas-dark text-accent dark:text-accent-dark font-medium shadow-2xs'
                    : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
                }`}
                title="View cumulative collection growth trajectory"
              >
                <Layers size={12} />
                <span>Cumulative</span>
              </button>
            </div>

            {acquisitionWaves.peakYear && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent dark:text-accent-dark text-xs font-medium shrink-0">
                <TrendingUp size={13} />
                <span>
                  Peak: <strong>{acquisitionWaves.peakYear}</strong> ({acquisitionWaves.peakCount} vols)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 1. Combo View (Unified Bar Graph + Line Graph) */}
        {growthViewMode === 'combo' && (
          <div className="space-y-4">
            {renderAcquisitionComboChart()}

            {/* Quick Cohort Summary Cards Beneath Combo Graph */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-rule/40 dark:border-rule-dark/40">
              {acquisitionWaves.timeline.map((wave, idx) => {
                const isHovered = hoveredWaveIndex === idx;
                return (
                  <div
                    key={wave.year}
                    onMouseEnter={() => setHoveredWaveIndex(idx)}
                    onMouseLeave={() => setHoveredWaveIndex(null)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isHovered
                        ? 'border-accent bg-accent/5 dark:bg-accent/10'
                        : 'border-rule/50 dark:border-rule-dark/50 bg-surface/60 dark:bg-surface-dark/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-3xs font-mono">
                      <span className="text-ink-muted uppercase font-semibold">{wave.year}</span>
                      <span className="font-bold text-ink dark:text-ink-dark">+{wave.count}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-3xs">
                      {wave.yoyTrend === 'up' && wave.yoyPct !== null && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                          <TrendingUp size={9} />+{wave.yoyPct}%
                        </span>
                      )}
                      {wave.yoyTrend === 'down' && wave.yoyPct !== null && (
                        <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                          <TrendingDown size={9} />{wave.yoyPct}%
                        </span>
                      )}
                      {wave.yoyTrend === 'same' && (
                        <span className="text-ink-muted flex items-center gap-0.5">
                          <Minus size={9} />0%
                        </span>
                      )}
                      {wave.year === 'Pre-App Era' && (
                        <span className="text-ink-muted">Base</span>
                      )}
                      <span className="text-ink-muted font-mono">{wave.cumulativeCount} total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Annual Additions View with Explicit Rise / Fall (YoY Dips & Surges) */}
        {growthViewMode === 'annual' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
            {acquisitionWaves.timeline.map((wave) => (
              <div
                key={wave.year}
                className="p-3.5 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark flex flex-col justify-between space-y-3"
              >
                {/* Year Header & YoY Rise/Fall Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-3xs uppercase tracking-wider font-mono text-ink-muted font-semibold truncate">
                    {wave.year}
                  </span>
                  {wave.yoyTrend === 'up' && wave.yoyPct !== null && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-500/20 shrink-0"
                      title={`Purchases increased by ${wave.yoyPct}% compared to previous period`}
                    >
                      <TrendingUp size={10} />+{wave.yoyPct}%
                    </span>
                  )}
                  {wave.yoyTrend === 'down' && wave.yoyPct !== null && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md border border-rose-500/20 shrink-0"
                      title={`Purchases declined by ${Math.abs(wave.yoyPct)}% compared to previous period`}
                    >
                      <TrendingDown size={10} />{wave.yoyPct}%
                    </span>
                  )}
                  {wave.yoyTrend === 'same' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-ink-muted bg-surface-raised dark:bg-surface-dark-raised px-1.5 py-0.5 rounded-md shrink-0">
                      <Minus size={10} />0%
                    </span>
                  )}
                  {wave.year === 'Pre-App Era' && (
                    <span className="text-[10px] text-ink-muted font-medium shrink-0">
                      Foundation
                    </span>
                  )}
                </div>

                {/* Vertical Column Bar Visualization */}
                <div className="h-24 flex items-end justify-center py-1">
                  <div className="w-full flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="font-mono text-xs font-bold text-ink dark:text-ink-dark">
                      +{wave.count}
                    </span>
                    <div className="w-full max-w-[48px] h-full flex items-end">
                      <div
                        style={{ height: `${Math.max(12, wave.pct)}%` }}
                        className="w-full rounded-t-lg bg-accent/90 hover:bg-accent dark:bg-accent dark:hover:bg-accent-hover transition-all duration-300"
                        title={`${wave.year}: ${wave.count} books added (${wave.pct}% of peak wave)`}
                      />
                    </div>
                  </div>
                </div>

                {/* Wave Meta Footer */}
                <div className="pt-2 border-t border-rule/40 dark:border-rule-dark/40 flex items-center justify-between text-3xs text-ink-muted font-mono">
                  <span>{wave.pct}% of peak</span>
                  <span>{wave.cumulativeCount} cum.</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Cumulative Growth Trajectory (The Library Mountain) */}
        {growthViewMode === 'cumulative' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {acquisitionWaves.timeline.map((wave) => (
              <div
                key={wave.year}
                className="p-3.5 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark flex flex-col justify-between space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xs uppercase tracking-wider font-mono text-ink-muted font-semibold">
                    Through {wave.year}
                  </span>
                  <span className="font-mono text-xs font-bold text-accent dark:text-accent-dark">
                    {wave.cumulativeCount} vols
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-surface-raised dark:bg-surface-dark-raised overflow-hidden">
                    <div
                      style={{ width: `${wave.cumulativePct}%` }}
                      className="h-full rounded-full bg-accent dark:bg-accent-dark transition-all duration-300"
                    />
                  </div>
                  <div className="flex items-center justify-between text-3xs text-ink-muted font-mono">
                    <span>+{wave.count} this wave</span>
                    <span>{wave.cumulativePct}% of library</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tertiary Row: Shelf Locations & Languages */}
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

        {/* Library Languages */}
        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-3 shadow-xs">
          <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
            <Globe size={15} className="text-ink-muted" />
            <span>Languages & Editions</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            {languageCounts.map(([lang, count]) => (
              <div
                key={lang}
                className="p-3 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark space-y-1"
              >
                <span className="text-3xs uppercase tracking-wider text-ink-muted block font-medium truncate">
                  {lang}
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
