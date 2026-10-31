import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import type { Book, StreakSummary } from '../types/book';
import { BookCover } from './BookCover';
import { useLibraryStore } from '../store/useLibraryStore';

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
  const activeBooks = books.filter((b) => b.reading_status === 'READING');
  const primaryBook = activeBooks[0];

  const { lendingRecords } = useLibraryStore();
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
          {/* Header Strip: Clean Heading + Streak Pill */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <h2 className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
                Continue Reading
              </h2>
              {activeBooks.length > 1 && (
                <span className="text-3xs text-ink-muted">
                  (+{activeBooks.length - 1} more in progress)
                </span>
              )}
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

          {/* Book Spotlight Row */}
          <div className="flex gap-4">
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

            {/* Book Info & Quick Actions */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div className="space-y-1">
                <h3
                  onClick={() => setSelectedBook(primaryBook)}
                  className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark line-clamp-2 cursor-pointer hover:text-accent dark:hover:text-accent-dark transition-colors leading-snug"
                >
                  {primaryBook.title}
                </h3>
                <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                  {primaryBook.authors || 'Unknown author'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-muted pt-1">
                  {primaryBook.genre && (
                    <span className="px-2 py-0.5 rounded-md bg-surface dark:bg-surface-dark border border-rule/50 dark:border-rule-dark/50 text-3xs font-medium text-ink-secondary">
                      {primaryBook.genre.split(',')[0].trim()}
                    </span>
                  )}
                  {primaryBook.location && (
                    <span>• {primaryBook.location}</span>
                  )}
                </div>
              </div>

              {/* Action & Pace Strip */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                  <span>
                    Velocity:{' '}
                    <strong className="text-ink dark:text-ink-dark font-medium">
                      {velocity > 0 ? `${velocity} pgs/day` : 'Tracking...'}
                    </strong>
                  </span>
                </div>

                <button
                  onClick={() => openQuickLog(primaryBook)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-xs transition-all active:scale-98"
                >
                  <Plus size={14} />
                  <span>Log Pages</span>
                </button>
              </div>
            </div>
          </div>

          {/* Daily Goal Progress Bar */}
          <div className="pt-2 border-t border-rule/50 dark:border-rule-dark/50 space-y-1.5">
            <div className="flex items-center justify-between text-2xs">
              <span className="text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5">
                {todayPages >= dailyGoal && (
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  Today's reading goal:{' '}
                  <strong className="text-ink dark:text-ink-dark">{todayPages}</strong> / {dailyGoal} pages
                </span>
              </span>
              <span className="font-mono text-ink-muted">{goalPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-rule/50 dark:bg-rule-dark overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  todayPages >= dailyGoal ? 'bg-emerald-600' : 'bg-accent'
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

      {/* 3. FROM YOUR BOOKSHELF (SPOTLIGHT GLANCE) */}
      {spotlightBooks.length > 0 && (
        <section aria-label="Bookshelf Spotlight" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark">
                From Your Bookshelf
              </h2>
              <p className="text-3xs text-ink-muted">
                Random highlights from your physical collection
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffle}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rule/70 dark:border-rule-dark/70 bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised text-2xs text-ink-secondary hover:text-ink transition-colors cursor-pointer active:scale-95"
                title="Shuffle Random Spotlight"
                aria-label="Shuffle Spotlight Books"
              >
                <Shuffle size={11} className="text-accent dark:text-accent-dark" />
                {/* <span>Shuffle</span> */}
              </button>
              <button
                onClick={() => setActiveTab('shelf')}
                className="flex items-center gap-1 text-xs text-accent hover:underline font-medium cursor-pointer"
              >
                <span>Explore all {totalBooks}</span>
                <ArrowRight size={13} />
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
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            overdueLentCount > 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-accent/10 text-accent'
          }`}>
            <Handshake size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-serif text-xs font-medium text-ink dark:text-ink-dark">Lent Out Books</h3>
              {activeLentCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-3xs font-mono font-semibold ${
                  overdueLentCount > 0
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

