import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Bookmark,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingBag,
  PieChart,
  Wrench,
  BookOpen,
  Plus,
  AlertTriangle,
  ShieldCheck,
  Handshake,
  Shuffle,
  Dices,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { Book, StreakSummary, ReadingLog } from '../types/book';
import { BookCover } from './BookCover';
import { useLibraryStore } from '../store/useLibraryStore';
import { fetchReadingLogs } from '../api/client';

interface HomeDashboardProps {
  books: Book[];
  streakSummary: StreakSummary | null;
  openQuickLog: (book?: Book) => void;
  setSelectedBook: (book: Book | null) => void;
  setActiveTab: (tab: 'home' | 'shelf' | 'insights' | 'tracker' | 'wishlist' | 'maintenance' | 'lending') => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  books,
  streakSummary,
  openQuickLog,
  setSelectedBook,
  setActiveTab,
}) => {
  const activeBooks = useMemo(() => books.filter((b) => b.reading_status === 'READING'), [books]);

  // Selected active book index, defaulting to last active volume in localStorage
  const [selectedActiveIndex, setSelectedActiveIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const lastId = localStorage.getItem('molat_last_active_book_id');
    if (!lastId) return 0;
    const idx = books.filter((b) => b.reading_status === 'READING').findIndex((b) => b.book_id === lastId);
    return idx >= 0 ? idx : 0;
  });

  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [hasShakenOnLoad, setHasShakenOnLoad] = useState<boolean>(false);

  // Subtle peek & shake discoverability cue on page load when multiple books are active
  useEffect(() => {
    if (activeBooks.length > 1) {
      const timer = setTimeout(() => {
        setHasShakenOnLoad(true);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [activeBooks.length]);

  const safeActiveIndex = selectedActiveIndex < activeBooks.length ? selectedActiveIndex : 0;
  const primaryBook = activeBooks[safeActiveIndex] || activeBooks[0] || null;

  // Load reading logs to compute distinct volume-level metrics for each active book
  const [readingLogs, setReadingLogs] = useState<ReadingLog[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchReadingLogs()
      .then((logs) => {
        if (isMounted && logs) {
          setReadingLogs(logs);
        }
      })
      .catch((err) => {
        console.warn('Could not load reading logs for book stats:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [books]);

  // Volume-specific statistics computed dynamically per active book
  const activeBookStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        currentPage: number;
        totalPagesRead: number;
        sessionsCount: number;
        velocity: number;
        lastReadText: string;
        readingPaceMinPerPage: number;
      }
    > = {};

    activeBooks.forEach((book) => {
      const bLogs = readingLogs.filter((l) => l.book_id === book.book_id);
      if (!bLogs.length) {
        map[book.book_id] = {
          currentPage: 0,
          totalPagesRead: 0,
          sessionsCount: 0,
          velocity: 0,
          lastReadText: 'Not logged yet',
          readingPaceMinPerPage: 0,
        };
        return;
      }

      // Latest bookmark end page
      const currentPage = Math.max(...bLogs.map((l) => l.end_page || 0), 0);
      const totalPagesRead = bLogs.reduce((acc, l) => acc + (l.pages_read || 0), 0);
      const totalDurationMins = bLogs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);

      // Distinct days on which this volume was read
      const uniqueDates = new Set(bLogs.map((l) => l.session_date).filter(Boolean));
      const daysCount = Math.max(uniqueDates.size, 1);

      // Book-specific velocity (average pages read per reading day for this specific book)
      const bookVelocity = Math.round((totalPagesRead / daysCount) * 10) / 10;

      // Book-specific reading pace (minutes per page)
      const readingPaceMinPerPage =
        totalDurationMins > 0 && totalPagesRead > 0
          ? Math.round((totalDurationMins / totalPagesRead) * 10) / 10
          : 0;

      // Last read date text
      const latestLog = bLogs[0];
      let lastReadText = '';
      if (latestLog?.session_date) {
        const today = new Date().toISOString().slice(0, 10);
        if (latestLog.session_date === today) {
          lastReadText = 'Read Today';
        } else {
          lastReadText = `Last read ${latestLog.session_date}`;
        }
      }

      map[book.book_id] = {
        currentPage,
        totalPagesRead,
        sessionsCount: bLogs.length,
        velocity: bookVelocity,
        lastReadText,
        readingPaceMinPerPage,
      };
    });

    return map;
  }, [activeBooks, readingLogs]);

  const currentBookStats = primaryBook
    ? activeBookStatsMap[primaryBook.book_id] || {
        currentPage: 0,
        totalPagesRead: 0,
        sessionsCount: 0,
        velocity: 0,
        lastReadText: '',
        readingPaceMinPerPage: 0,
      }
    : {
        currentPage: 0,
        totalPagesRead: 0,
        sessionsCount: 0,
        velocity: 0,
        lastReadText: '',
        readingPaceMinPerPage: 0,
      };

  const handleSwipe = (direction: 'next' | 'prev') => {
    if (activeBooks.length <= 1) return;
    if (direction === 'next') {
      setSlideDirection(1);
      setSelectedActiveIndex((prev) => {
        const nextIdx = (prev + 1) % activeBooks.length;
        localStorage.setItem('molat_last_active_book_id', activeBooks[nextIdx].book_id);
        return nextIdx;
      });
    } else {
      setSlideDirection(-1);
      setSelectedActiveIndex((prev) => {
        const prevIdx = (prev - 1 + activeBooks.length) % activeBooks.length;
        localStorage.setItem('molat_last_active_book_id', activeBooks[prevIdx].book_id);
        return prevIdx;
      });
    }
  };

  const { lendingRecords, setPickNextModalOpen, openFocusRoom } = useLibraryStore();
  const activeLentCount = lendingRecords.filter((r) => r.status === 'ACTIVE').length;
  const overdueLentCount = lendingRecords.filter((r) => r.status === 'ACTIVE' && r.is_overdue).length;

  const totalBooks = books.length;
  const completedBooks = books.filter((b) => b.reading_status === 'COMPLETED').length;
  const unreadBooks = books.filter((b) => b.reading_status === 'UNREAD').length;
  const readingBooks = activeBooks.length;

  const [shuffleKey, setShuffleKey] = useState(0);

  // Randomised shelf spotlight (6 randomly sampled volumes across library)
  const spotlightBooks = useMemo(() => {
    if (!books.length) return [];
    const pool = [...books];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 6);
  }, [books, shuffleKey]);

  const handleShuffle = () => setShuffleKey((prev) => prev + 1);

  const currentStreak = streakSummary?.current_streak_days || 0;
  const longestStreak = streakSummary?.longest_streak_days || 0;
  const todayPages = streakSummary?.today_pages || 0;
  const dailyGoal = streakSummary?.daily_goal_pages || 20;
  const goalPercent = Math.min(100, Math.round((todayPages / dailyGoal) * 100));
  const velocity = streakSummary?.reading_velocity_pages_per_day || 0;

  return (
    <div className="space-y-6">
      {/* 1. UNIFIED READING SANCTUARY & DAILY FOCUS */}
      {primaryBook ? (
        <section
          aria-label="Active Reading Focus"
          className="rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised p-4 sm:p-5 shadow-sm space-y-4"
        >
          {/* Header Strip: Clean Heading + Multi-Book Counter + Streak Pill */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <h2 className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
                Continue Reading
              </h2>
              {/* {activeBooks.length > 1 && (
                <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent dark:text-accent-dark font-medium">
                  {activeBooks.length} active volumes
                </span>
              )} */}
            </div>

            {/* Streak & Daily Progress Pill */}
            <div className="flex items-center gap-2">
              <div
                onClick={() => setActiveTab('tracker')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 dark:bg-accent/20 border border-accent/20 text-accent dark:text-accent-dark text-2xs font-medium cursor-pointer hover:bg-accent/20 transition-colors"
                title={`${currentStreak}-day reading streak (Record: ${longestStreak}d)`}
              >
                <Flame size={12} className="fill-accent text-accent animate-pulse" />
                <span className="tabular-nums font-semibold">{currentStreak}d Streak</span>
              </div>
            </div>
          </div>

          {/* Swipeable Carousel Container with Initial Discoverability Nudge */}
          <motion.div
            animate={
              !hasShakenOnLoad && activeBooks.length > 1
                ? { x: [0, -22, 8, -6, 2, 0] }
                : { x: 0 }
            }
            transition={{
              delay: 0.6,
              duration: 0.85,
              ease: 'easeInOut',
            }}
            className="relative overflow-hidden"
          >
            <AnimatePresence initial={false} custom={slideDirection} mode="wait">
              <motion.div
                key={primaryBook.book_id}
                custom={slideDirection}
                variants={{
                  enter: (direction: number) => ({
                    x: direction > 0 ? 60 : -60,
                    opacity: 0,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                  },
                  exit: (direction: number) => ({
                    x: direction > 0 ? -60 : 60,
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeOut' }}
                drag={activeBooks.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_e, { offset, velocity }) => {
                  const swipeThreshold = 30;
                  const velocityThreshold = 250;
                  if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                    handleSwipe('next');
                  } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                    handleSwipe('prev');
                  }
                }}
                className={`flex gap-4 ${activeBooks.length > 1 ? 'cursor-grab active:cursor-grabbing touch-pan-y' : ''
                  } select-none`}
              >
                {/* Book Cover Thumbnail */}
                <div
                  className="w-20 sm:w-24 shrink-0 cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
                  onClick={() => setSelectedBook(primaryBook)}
                >
                  <BookCover
                    title={primaryBook.title}
                    authors={primaryBook.authors}
                    coverUrl={primaryBook.cover_url}
                    readingStatus={primaryBook.reading_status}
                  />
                </div>

                {/* Book Info & Quick Actions (Clean, quiet literary layout without data noise) */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <h3
                      onClick={() => setSelectedBook(primaryBook)}
                      className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark line-clamp-1 cursor-pointer hover:text-accent dark:hover:text-accent-dark transition-colors leading-snug"
                    >
                      {primaryBook.title}
                    </h3>
                    <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                      {primaryBook.authors || 'Unknown author'}
                    </p>

                    {/* Unified Bookmark & Pace Line */}
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted pt-0.5">
                      <span>
                        {currentBookStats.currentPage > 0 ? (
                          <span>
                            At <strong className="text-accent dark:text-accent-dark font-medium">Page {currentBookStats.currentPage}</strong>
                          </span>
                        ) : (
                          <span>Ready to start</span>
                        )}
                      </span>
                      {currentBookStats.velocity > 0 && (
                        <>
                          <span className="text-ink-muted/40">•</span>
                          <span className="text-2xs font-mono text-ink-secondary dark:text-ink-dark-secondary">
                            {currentBookStats.velocity} pgs/day
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Compact, crisp dual buttons with zero truncation on mobile */}
                  <div className="pt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('molat_last_active_book_id', primaryBook.book_id);
                        openFocusRoom(primaryBook);
                      }}
                      className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-accent/40 bg-accent/10 dark:bg-accent/20 hover:bg-accent/20 text-accent dark:text-accent-dark text-[11px] sm:text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer"
                      title={`Start distraction-free focus timer for "${primaryBook.title}"`}
                    >
                      <Timer size={13} className="shrink-0" />
                      <span className="whitespace-nowrap">Focus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('molat_last_active_book_id', primaryBook.book_id);
                        openQuickLog(primaryBook);
                      }}
                      className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer"
                      title={`Log pages for "${primaryBook.title}"`}
                    >
                      <Plus size={13} className="shrink-0" />
                      <span className="whitespace-nowrap">Log Pages</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Pagination Dots at Bottom */}
          {activeBooks.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {activeBooks.map((b, idx) => {
                const isSelected = safeActiveIndex === idx;
                return (
                  <button
                    key={b.book_id}
                    type="button"
                    onClick={() => {
                      setSlideDirection(idx > safeActiveIndex ? 1 : -1);
                      setSelectedActiveIndex(idx);
                      localStorage.setItem('molat_last_active_book_id', b.book_id);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${isSelected
                        ? 'w-5 bg-accent shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                        : 'w-1.5 bg-ink-muted/30 hover:bg-ink-muted/60'
                      }`}
                    title={`Switch to "${b.title}"`}
                    aria-label={`Go to book ${idx + 1}`}
                  />
                );
              })}
            </div>
          )}

          {/* Daily Goal Progress Bar */}
          <div className="pt-2 border-t border-rule/50 dark:border-rule-dark/50 space-y-1.5">
            <div className="flex items-center justify-between text-2xs">
              <span className="text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5">
                {todayPages >= dailyGoal && (
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  Today's reading habit (all books):{' '}
                  <strong className="text-ink dark:text-ink-dark">{todayPages}</strong> / {dailyGoal} pages
                </span>
              </span>
              <span className="font-mono text-ink-muted">{goalPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-rule/50 dark:bg-rule-dark overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${todayPages >= dailyGoal ? 'bg-emerald-600' : 'bg-accent'
                  }`}
                style={{ width: `${goalPercent}%` }}
              />
            </div>
          </div>
        </section>
      ) : (
        /* Quiet Welcome when no active book */
        <section
          aria-label="Welcome"
          className="rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-accent" />
              <h2 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark">
                Welcome to Your Library
              </h2>
            </div>
            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
              No book currently marked as reading. Select any volume from your shelf to begin a reading session.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentStreak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                <Flame size={14} className="fill-accent" />
                <span>{currentStreak}d Streak</span>
              </div>
            )}
            <button
              onClick={() => setActiveTab('shelf')}
              className="px-4 py-2 rounded-xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark transition-colors"
            >
              Open Shelf
            </button>
          </div>
        </section>
      )}

      {/* 2. LIBRARY VITALS LEDGER (SLIM, REFINED METRIC STRIP) */}
      <section
        aria-label="Library Vitals"
        className="rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-3 sm:p-4 shadow-xs"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-rule/60 dark:divide-rule-dark/60 text-center">
          <div className="py-2 sm:py-1 px-3">
            <span className="text-3xs uppercase tracking-wider text-ink-muted font-medium block">
              Total Volumes
            </span>
            <p className="font-serif text-xl sm:text-2xl font-medium mt-0.5 text-ink dark:text-ink-dark tabular-nums">
              {totalBooks}
            </p>
          </div>
          <div className="py-2 sm:py-1 px-3">
            <span className="text-3xs uppercase tracking-wider text-ink-muted font-medium block">
              Currently Reading
            </span>
            <p className="font-serif text-xl sm:text-2xl font-medium mt-0.5 text-accent dark:text-accent-dark tabular-nums">
              {readingBooks}
            </p>
          </div>
          <div className="py-2 sm:py-1 px-3">
            <span className="text-3xs uppercase tracking-wider text-ink-muted font-medium block">
              Volumes Read
            </span>
            <p className="font-serif text-xl sm:text-2xl font-medium mt-0.5 text-emerald-700 dark:text-emerald-400 tabular-nums">
              {completedBooks}
            </p>
          </div>
          <div className="py-2 sm:py-1 px-3">
            <span className="text-3xs uppercase tracking-wider text-ink-muted font-medium block">
              To Be Read (TBR)
            </span>
            <p className="font-serif text-xl sm:text-2xl font-medium mt-0.5 text-ink-secondary dark:text-ink-dark-secondary tabular-nums">
              {unreadBooks}
            </p>
          </div>
        </div>
      </section>

      {/* 2.5 TBR SERENDIPITY / PICK MY NEXT READ */}
      {unreadBooks > 0 && (
        <section
          aria-label="Pick Next Read"
          className="p-3.5 sm:p-4 rounded-2xl border border-accent/25 dark:border-accent-dark/30 bg-accent-subtle/50 dark:bg-accent-dark-subtle/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 shadow-xs">
              <Dices size={20} />
            </div>
            <div>
              <h3 className="font-serif text-sm sm:text-base font-medium text-ink dark:text-ink-dark">
                Ready for your next read?
              </h3>
              <p className="text-3xs text-ink-muted">
                You have {unreadBooks} unread volume{unreadBooks === 1 ? '' : 's'} waiting on your shelves.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPickNextModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <Sparkles size={13} />
            <span>Pick Next Read</span>
          </button>
        </section>
      )}

      {/* 3. FROM YOUR BOOKSHELF (SPOTLIGHT GLANCE) */}
      {spotlightBooks.length > 0 && (
        <section aria-label="Bookshelf Spotlight" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark truncate">
                From Your Bookshelf
              </h2>
              <p className="text-3xs text-ink-muted truncate">
                Highlights from your collection
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleShuffle}
                className="p-1.5 sm:px-2 sm:py-1 rounded-lg border border-rule/70 dark:border-rule-dark/70 bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised text-2xs text-ink-secondary hover:text-ink transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                title="Shuffle Random Spotlight"
                aria-label="Shuffle Spotlight Books"
              >
                <Shuffle size={12} className="text-accent dark:text-accent-dark shrink-0" />
                <span className="hidden sm:inline">Shuffle</span>
              </button>
              <button
                onClick={() => setActiveTab('shelf')}
                className="flex items-center gap-1 text-xs text-accent hover:underline font-medium cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Explore all {totalBooks}</span>
                <ArrowRight size={13} className="shrink-0" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
            {spotlightBooks.map((book) => (
              <motion.article
                key={book.book_id}
                onClick={() => setSelectedBook(book)}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                className="group flex flex-col gap-1.5 p-1.5 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark hover:border-accent/40 transition-colors cursor-pointer"
              >
                <BookCover
                  title={book.title}
                  authors={book.authors}
                  coverUrl={book.cover_url}
                  readingStatus={book.reading_status}
                />
                <div className="space-y-0.5">
                  <h3 className="font-serif text-2xs font-medium text-ink dark:text-ink-dark line-clamp-1 group-hover:text-accent transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-3xs text-ink-muted truncate">
                    {book.authors || 'Unknown'}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {/* 4. SLEEK COMPACT SHORTCUTS */}
      <section aria-label="Library Tools" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.button
          onClick={() => setActiveTab('shelf')}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          className="p-3.5 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/40 flex items-center gap-3 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-xs font-medium text-ink dark:text-ink-dark">Bookshelf Views</h3>
            <p className="text-3xs text-ink-muted truncate">Cover grid, wooden spines & list</p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setActiveTab('wishlist')}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          className="p-3.5 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/40 flex items-center gap-3 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <ShoppingBag size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-xs font-medium text-ink dark:text-ink-dark">Wishlist Board</h3>
            <p className="text-3xs text-ink-muted truncate">Planned acquisitions & target prices</p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setActiveTab('lending')}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          className="p-3.5 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/40 flex items-center gap-3 transition-colors text-left"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${overdueLentCount > 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-accent/10 text-accent'
            }`}>
            <Handshake size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-serif text-xs font-medium text-ink dark:text-ink-dark">Lent Out Books</h3>
              {activeLentCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-3xs font-mono font-semibold ${overdueLentCount > 0
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-surface-raised dark:bg-surface-dark-raised text-ink-muted'
                  }`}>
                  {activeLentCount}
                </span>
              )}
            </div>
            <p className="text-3xs text-ink-muted truncate">
              {activeLentCount > 0 ? `${activeLentCount} on loan (${overdueLentCount} late)` : 'Track loans & WhatsApp pings'}
            </p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => setActiveTab('insights')}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          className="p-3.5 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/40 flex items-center gap-3 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <PieChart size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-xs font-medium text-ink dark:text-ink-dark">Library Insights</h3>
            <p className="text-3xs text-ink-muted truncate">Categories, authors & reading pace</p>
          </div>
        </motion.button>
      </section>
    </div>
  );
};

