import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Plus,
  Shuffle,
  Timer,
  MessageSquare,
} from 'lucide-react';
import type { Book, StreakSummary } from '../types/book';
import { BookCover } from './BookCover';
import { useLibraryStore } from '../store/useLibraryStore';

interface HomeDashboardProps {
  books: Book[];
  streakSummary: StreakSummary | null;
  openQuickLog: (book?: Book) => void;
  setSelectedBook: (book: Book | null) => void;
  setActiveTab: (
    tab:
      | 'home'
      | 'shelf'
      | 'insights'
      | 'tracker'
      | 'wishlist'
      | 'maintenance'
      | 'lending'
      | 'alcoves'
      | 'adda'
      | 'profile'
      | 'more'
  ) => void;
}

const SWIPE_HINT_KEY = 'molat_swipe_hint_seen_v1';

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  books,
  streakSummary,
  openQuickLog,
  setSelectedBook,
  setActiveTab,
}) => {
  const { activeBookId, setActiveBookId, openFocusRoom, readingLogs } = useLibraryStore();
  const activeBooks = useMemo(() => books.filter((b) => b.reading_status === 'READING'), [books]);

  const [selectedActiveIndex, setSelectedActiveIndex] = useState(() => {
    if (!activeBookId) return 0;
    const idx = books.filter((b) => b.reading_status === 'READING').findIndex((b) => b.book_id === activeBookId);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    if (activeBookId) {
      const idx = activeBooks.findIndex((b) => b.book_id === activeBookId);
      if (idx >= 0 && idx !== selectedActiveIndex) {
        setSelectedActiveIndex(idx);
      }
    }
  }, [activeBookId, activeBooks]);

  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(false);

  // Subtle first-visit swipe hint when multiple books are active
  useEffect(() => {
    if (activeBooks.length > 1 && typeof localStorage !== 'undefined' && !localStorage.getItem(SWIPE_HINT_KEY)) {
      setShowSwipeHint(true);
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem(SWIPE_HINT_KEY, '1');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeBooks.length]);

  const safeActiveIndex = selectedActiveIndex < activeBooks.length ? selectedActiveIndex : 0;
  const primaryBook = activeBooks[safeActiveIndex] || activeBooks[0] || null;

  const activeBookStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        currentPage: number;
        totalPagesRead: number;
        sessionsCount: number;
        velocity: number;
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
        };
        return;
      }

      const currentPage = Math.max(...bLogs.map((l) => l.end_page || 0), 0);
      const totalPagesRead = bLogs.reduce((acc, l) => acc + (l.pages_read || 0), 0);
      const uniqueDates = new Set(bLogs.map((l) => l.session_date).filter(Boolean));
      const daysCount = Math.max(uniqueDates.size, 1);
      const bookVelocity = Math.round((totalPagesRead / daysCount) * 10) / 10;

      map[book.book_id] = {
        currentPage,
        totalPagesRead,
        sessionsCount: bLogs.length,
        velocity: bookVelocity,
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
      }
    : {
        currentPage: 0,
        totalPagesRead: 0,
        sessionsCount: 0,
        velocity: 0,
      };

  const handleSwipe = (direction: 'next' | 'prev') => {
    if (activeBooks.length <= 1) return;
    if (direction === 'next') {
      setSlideDirection(1);
      setSelectedActiveIndex((prev) => {
        const nextIdx = (prev + 1) % activeBooks.length;
        setActiveBookId(activeBooks[nextIdx].book_id);
        return nextIdx;
      });
    } else {
      setSlideDirection(-1);
      setSelectedActiveIndex((prev) => {
        const prevIdx = (prev - 1 + activeBooks.length) % activeBooks.length;
        setActiveBookId(activeBooks[prevIdx].book_id);
        return prevIdx;
      });
    }
  };

  const totalBooks = books.length;
  const [shuffleKey, setShuffleKey] = useState(0);

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
  const streakAtRisk = streakSummary?.streak_at_risk ?? false;

  return (
    <div className="space-y-8">
      {/* 1. UNIFIED READING SANCTUARY & DAILY FOCUS */}
      {primaryBook ? (
        <section
          aria-label="Active Reading Focus"
          className="rounded-card border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised p-4 sm:p-5 shadow-xs space-y-4"
        >
          {/* Header Strip */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
              Continue Reading
            </h2>
            {showSwipeHint && (
              <span className="text-2xs text-ink-muted animate-fade-in">
                &larr; Swipe for more &rarr;
              </span>
            )}
          </div>

          {/* Swipeable Carousel */}
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} custom={slideDirection} mode="wait">
              <motion.div
                key={primaryBook.book_id}
                custom={slideDirection}
                variants={{
                  enter: (direction: number) => ({
                    x: direction > 0 ? 40 : -40,
                    opacity: 0,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                  },
                  exit: (direction: number) => ({
                    x: direction > 0 ? -40 : 40,
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.16, ease: 'easeOut' }}
                drag={activeBooks.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, { offset, velocity }) => {
                  const swipeThreshold = 30;
                  const velocityThreshold = 250;
                  if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                    handleSwipe('next');
                  } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                    handleSwipe('prev');
                  }
                }}
                className={`flex gap-4 ${
                  activeBooks.length > 1 ? 'cursor-grab active:cursor-grabbing touch-pan-y' : ''
                } select-none`}
              >
                {/* Book Cover Thumbnail */}
                <div
                  className="w-20 sm:w-24 shrink-0 cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => setSelectedBook(primaryBook)}
                >
                  <BookCover
                    title={primaryBook.title}
                    authors={primaryBook.authors}
                    coverUrl={primaryBook.cover_url}
                    readingStatus={primaryBook.reading_status}
                  />
                </div>

                {/* Book Info & Actions */}
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

                    <div className="flex items-center gap-1.5 text-xs text-ink-muted pt-0.5">
                      <span>
                        {currentBookStats.currentPage > 0 ? (
                          <span>
                            At{' '}
                            <strong className="text-accent dark:text-accent-dark font-medium tabular-nums">
                              Page {currentBookStats.currentPage}
                            </strong>
                          </span>
                        ) : (
                          <span>Ready to start</span>
                        )}
                      </span>
                      {currentBookStats.velocity > 0 && (
                        <>
                          <span className="text-ink-muted/40">&bull;</span>
                          <span className="text-2xs font-mono text-ink-secondary dark:text-ink-dark-secondary tabular-nums">
                            {currentBookStats.velocity} pg/day
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBookId(primaryBook.book_id);
                        openFocusRoom(primaryBook);
                      }}
                      className="flex-1 min-w-0 min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-button border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/50 text-ink dark:text-ink-dark text-xs font-medium transition-all active:scale-[0.97] cursor-pointer"
                      title={`Start distraction-free focus timer for "${primaryBook.title}"`}
                    >
                      <Timer size={14} className="text-accent dark:text-accent-dark shrink-0" />
                      <span className="whitespace-nowrap">Focus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveBookId(primaryBook.book_id);
                        openQuickLog(primaryBook);
                      }}
                      className="flex-1 min-w-0 min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.97] cursor-pointer"
                      title={`Log pages for "${primaryBook.title}"`}
                    >
                      <Plus size={14} className="shrink-0" />
                      <span className="whitespace-nowrap">Log Pages</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pagination Dots */}
          {activeBooks.length > 1 && (
            <div className="flex items-center justify-center gap-1">
              {activeBooks.map((b, idx) => {
                const isSelected = safeActiveIndex === idx;
                return (
                  <button
                    key={b.book_id}
                    type="button"
                    onClick={() => {
                      setSlideDirection(idx > safeActiveIndex ? 1 : -1);
                      setSelectedActiveIndex(idx);
                      setActiveBookId(b.book_id);
                    }}
                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer group"
                    title={`Switch to "${b.title}"`}
                    aria-label={`Go to book ${idx + 1}`}
                  >
                    <span
                      className={`h-1.5 rounded-full transition-all block ${
                        isSelected
                          ? 'w-5 bg-accent dark:bg-accent-dark'
                          : 'w-1.5 bg-ink-muted/30 group-hover:bg-ink-muted/60'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Unified Daily Goal + Streak Strip */}
          <div className="pt-3 border-t border-rule/60 dark:border-rule-dark/60 space-y-2">
            <div className="flex items-center justify-between text-2xs">
              <span className="text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5">
                {todayPages >= dailyGoal && (
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  Today:{' '}
                  <strong className="text-ink dark:text-ink-dark tabular-nums">{todayPages}</strong> / {dailyGoal} pages
                </span>
              </span>
              <span className="font-mono text-ink-muted tabular-nums">{goalPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-rule/50 dark:bg-rule-dark overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  todayPages >= dailyGoal ? 'bg-emerald-600' : 'bg-accent dark:bg-accent-dark'
                }`}
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className="inline-flex items-center gap-1.5 text-2xs text-ink-secondary dark:text-ink-dark-secondary hover:text-accent dark:hover:text-accent-dark transition-colors cursor-pointer"
                title={`View reading streak heatmap (Record: ${longestStreak}d)`}
              >
                <Flame
                  size={13}
                  className={`text-warm dark:text-amber-400 ${streakAtRisk ? 'animate-pulse' : ''}`}
                />
                <span className="tabular-nums font-medium">{currentStreak}-day streak</span>
                <span className="text-ink-muted">&bull; Record: {longestStreak}d</span>
              </button>
              {streakAtRisk && (
                <span className="text-2xs text-warm dark:text-amber-400 font-medium">
                  Log today to keep streak
                </span>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* Quiet Welcome when no active book */
        <section
          aria-label="Welcome"
          className="rounded-card border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-accent dark:text-accent-dark" />
              <h2 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark">
                Welcome to Your Library
              </h2>
            </div>
            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
              Tap any book on your shelf and mark it as &lsquo;Reading&rsquo; to start tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('shelf')}
            className="px-4 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-all active:scale-[0.97] min-h-[44px] shrink-0 cursor-pointer"
          >
            Open Shelf
          </button>
        </section>
      )}

      {/* 2. FROM YOUR SHELVES (LIGHTWEIGHT SPOTLIGHT) */}
      {spotlightBooks.length > 0 && (
        <section aria-label="Bookshelf Spotlight" className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark truncate">
              From Your Shelves
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShuffle}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-button border border-rule/70 dark:border-rule-dark/70 bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised text-2xs text-ink-secondary hover:text-ink transition-colors cursor-pointer active:scale-95 flex items-center gap-1 min-h-[36px]"
                title="Shuffle Random Spotlight"
                aria-label="Shuffle Spotlight Books"
              >
                <Shuffle size={12} className="text-accent dark:text-accent-dark shrink-0" />
                <span className="hidden sm:inline">Shuffle</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shelf')}
                className="flex items-center gap-1 text-xs text-accent dark:text-accent-dark hover:underline font-medium cursor-pointer whitespace-nowrap shrink-0 min-h-[36px]"
              >
                <span>Explore all {totalBooks}</span>
                <ArrowRight size={13} className="shrink-0" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
            {spotlightBooks.map((book) => (
              <motion.article
                key={book.book_id}
                onClick={() => setSelectedBook(book)}
                whileHover={{ y: -2, scale: 1.005 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="group flex flex-col gap-1.5 cursor-pointer"
              >
                <BookCover
                  title={book.title}
                  authors={book.authors}
                  coverUrl={book.cover_url}
                  readingStatus={book.reading_status}
                />
                <div className="space-y-0.5 px-0.5">
                  <h3 className="font-serif text-xs font-medium text-ink dark:text-ink-dark line-clamp-1 group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-2xs text-ink-muted truncate">
                    {book.authors || 'Unknown'}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {/* Adda Literary Salon Strip */}
      <section aria-label="Adda Literary Salon">
        <button
          type="button"
          onClick={() => setActiveTab('adda')}
          className="w-full p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-button bg-warm/10 dark:bg-warm/20 text-warm flex items-center justify-center shrink-0">
              <MessageSquare size={17} />
            </div>
            <div className="min-w-0">
              <span className="font-serif text-sm sm:text-base font-medium text-ink dark:text-ink-dark block truncate">
                Adda &bull; Literary Salon
              </span>
              <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary block truncate">
                Share favorite quotes, book notes, and reading reflections
              </span>
            </div>
          </div>
          <ArrowRight size={15} className="text-accent dark:text-accent-dark shrink-0" />
        </button>
      </section>
    </div>
  );
};
