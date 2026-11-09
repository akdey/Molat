import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Dices,
  Sparkles,
  BookOpen,
  Shuffle,
  MapPin,
  Tag,
  Star,
  Check,
  RotateCw,
} from 'lucide-react';
import type { Book } from '../types/book';
import { BookCover } from './BookCover';

interface PickNextReadModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onStartReading: (book: Book) => void;
  onOpenDetails: (book: Book) => void;
}

type MoodFilter = 'all' | 'fiction' | 'nonfiction' | 'quick' | 'epic';

export const PickNextReadModal: React.FC<PickNextReadModalProps> = ({
  isOpen,
  onClose,
  books,
  onStartReading,
  onOpenDetails,
}) => {
  const [selectedMood, setSelectedMood] = useState<MoodFilter>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [drawCount, setDrawCount] = useState(0);

  // Filter pool: Only UNREAD or PAUSED books from your physical shelf
  const unreadPool = useMemo(() => {
    return books.filter(
      (b) => b.reading_status === 'UNREAD' || b.reading_status === 'PAUSED'
    );
  }, [books]);

  // Extract distinct genres from unread books
  const unreadGenres = useMemo(() => {
    const set = new Set<string>();
    unreadPool.forEach((b) => {
      if (b.genre) {
        b.genre.split(',').forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [unreadPool]);

  // Filter candidates based on selected mood/genre
  const filteredCandidates = useMemo(() => {
    let pool = [...unreadPool];

    if (selectedGenre !== 'ALL') {
      pool = pool.filter((b) =>
        (b.genre || '').toLowerCase().includes(selectedGenre.toLowerCase())
      );
    }

    if (selectedMood === 'fiction') {
      pool = pool.filter((b) =>
        (b.genre || '').toLowerCase().includes('fiction') &&
        !(b.genre || '').toLowerCase().includes('non-fiction')
      );
    } else if (selectedMood === 'nonfiction') {
      pool = pool.filter((b) =>
        (b.genre || '').toLowerCase().includes('non-fiction') ||
        (b.genre || '').toLowerCase().includes('biography') ||
        (b.genre || '').toLowerCase().includes('history') ||
        (b.genre || '').toLowerCase().includes('science') ||
        (b.genre || '').toLowerCase().includes('philosophy')
      );
    }

    return pool;
  }, [unreadPool, selectedGenre, selectedMood]);

  // Audio synthesizer for crisp book shuffle / paper riffling sound
  const playShuffleSound = () => {
    if (typeof window === 'undefined') return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 20, 15, 20, 25]);
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // 5 rapid paper riffle clicks
      for (let i = 0; i < 5; i++) {
        const clickTime = now + i * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340 + Math.random() * 120, clickTime);
        osc.frequency.exponentialRampToValueAtTime(120, clickTime + 0.04);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900 + i * 120, clickTime);
        filter.Q.setValueAtTime(2.5, clickTime);

        gain.gain.setValueAtTime(0.09, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.04);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(clickTime);
        osc.stop(clickTime + 0.045);
      }

      // Final settling paper thud
      const thudTime = now + 0.26;
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(160, thudTime);
      thudOsc.frequency.exponentialRampToValueAtTime(55, thudTime + 0.08);

      thudGain.gain.setValueAtTime(0.12, thudTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.08);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);

      thudOsc.start(thudTime);
      thudOsc.stop(thudTime + 0.09);
    } catch {
      // AudioContext unavailable or autoplay blocked
    }
  };

  // Function to draw a random book from candidates with tactile shuffle effect
  const drawRandomBook = (pool = filteredCandidates) => {
    if (pool.length === 0) {
      setCurrentBook(null);
      return;
    }

    playShuffleSound();
    setIsShuffling(true);

    // Rapid shuffle preview for 250ms
    let count = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pool.length);
      setCurrentBook(pool[randomIdx]);
      count++;
      if (count >= 5) {
        clearInterval(interval);
        // Final random pick ensuring it's not the exact same book if pool > 1
        let finalIdx = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && pool[finalIdx].book_id === currentBook?.book_id) {
          finalIdx = (finalIdx + 1) % pool.length;
        }
        setCurrentBook(pool[finalIdx]);
        setIsShuffling(false);
        setDrawCount((prev) => prev + 1);
      }
    }, 50);
  };

  // Initialize or re-draw when modal opens or candidate pool changes
  useEffect(() => {
    if (isOpen) {
      if (filteredCandidates.length > 0) {
        drawRandomBook(filteredCandidates);
      } else {
        setCurrentBook(null);
      }
    }
  }, [isOpen, selectedMood, selectedGenre]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg rounded-2xl bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-rule/60 dark:border-rule-dark/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-xs">
                <Dices size={18} className={isShuffling ? 'animate-spin' : ''} />
              </div>
              <div>
                <h2 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark flex items-center gap-2">
                  <span>Pick My Next Read</span>
                </h2>
                <p className="text-3xs text-ink-muted">
                  {unreadPool.length} unread volume{unreadPool.length === 1 ? '' : 's'} waiting on your shelves
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Filter Pills: Mood & Categories */}
          <div className="px-4 sm:px-5 py-2.5 bg-surface dark:bg-surface-dark border-b border-rule/50 dark:border-rule-dark/50 flex flex-wrap items-center gap-1.5 text-2xs">
            <span className="text-3xs text-ink-muted font-medium uppercase tracking-wider mr-1">
              Filter:
            </span>
            <button
              onClick={() => {
                setSelectedMood('all');
                setSelectedGenre('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${selectedMood === 'all' && selectedGenre === 'ALL'
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface-raised dark:bg-surface-dark-raised text-ink-secondary hover:text-ink border border-rule dark:border-rule-dark'
                }`}
            >
              All Unread ({unreadPool.length})
            </button>

            <button
              onClick={() => {
                setSelectedMood('fiction');
                setSelectedGenre('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${selectedMood === 'fiction'
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface-raised dark:bg-surface-dark-raised text-ink-secondary hover:text-ink border border-rule dark:border-rule-dark'
                }`}
            >
              Fiction
            </button>

            <button
              onClick={() => {
                setSelectedMood('nonfiction');
                setSelectedGenre('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${selectedMood === 'nonfiction'
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface-raised dark:bg-surface-dark-raised text-ink-secondary hover:text-ink border border-rule dark:border-rule-dark'
                }`}
            >
              Non-Fiction
            </button>

            {/* Optional Specific Genre Dropdown */}
            {unreadGenres.length > 0 && (
              <select
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  setSelectedMood('all');
                }}
                className="px-2 py-1 rounded-lg bg-surface-raised dark:bg-surface-dark-raised text-ink text-2xs border border-rule dark:border-rule-dark focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="ALL">All Genres</option>
                {unreadGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Main Content Area */}
          <div className="p-5 flex-1 overflow-y-auto">
            {unreadPool.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Sparkles size={28} className="mx-auto text-accent opacity-50" />
                <p className="font-serif text-base text-ink">Your TBR Stack is Clear!</p>
                <p className="text-xs text-ink-muted">
                  You have read or are currently reading every volume in your library. Add new titles from your Wishlist!
                </p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="font-serif text-sm text-ink">No unread volumes match this filter.</p>
                <button
                  onClick={() => {
                    setSelectedMood('all');
                    setSelectedGenre('ALL');
                  }}
                  className="text-xs text-accent underline cursor-pointer"
                >
                  Reset filters to view all {unreadPool.length} unread books
                </button>
              </div>
            ) : currentBook ? (
              <div className="space-y-5">
                {/* Book Spotlight Card */}
                <motion.div
                  key={`${currentBook.book_id}-${drawCount}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark shadow-sm flex flex-col sm:flex-row gap-4 items-center sm:items-start"
                >
                  {/* Book Cover */}
                  <div className="w-28 sm:w-32 shrink-0">
                    <BookCover
                      title={currentBook.title}
                      authors={currentBook.authors}
                      coverUrl={currentBook.cover_url}
                      readingStatus={currentBook.reading_status}
                    />
                  </div>

                  {/* Metadata & Synopsis */}
                  <div className="space-y-2.5 flex-1 text-center sm:text-left min-w-0">
                    <div>
                      <span className="text-3xs uppercase tracking-wider text-accent dark:text-accent-dark font-semibold">
                        Next Suggested Volume
                      </span>
                      <h3 className="font-serif text-lg font-medium text-ink dark:text-ink-dark leading-tight line-clamp-2">
                        {currentBook.title}
                      </h3>
                      {currentBook.subtitle && (
                        <p className="font-serif text-xs text-ink-muted italic line-clamp-1">
                          {currentBook.subtitle}
                        </p>
                      )}
                      <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5">
                        by <strong className="text-ink dark:text-ink-dark">{currentBook.authors || 'Unknown author'}</strong>
                      </p>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-3xs">
                      {currentBook.genre && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-raised dark:bg-surface-dark-raised border border-rule/50 text-ink-secondary">
                          <Tag size={10} />
                          <span>{currentBook.genre.split(',')[0].trim()}</span>
                        </span>
                      )}
                      {currentBook.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-raised dark:bg-surface-dark-raised border border-rule/50 text-ink-secondary">
                          <MapPin size={10} className="text-accent" />
                          <span>{currentBook.location}</span>
                        </span>
                      )}
                      {currentBook.publication_year && (
                        <span className="px-2 py-0.5 rounded-md bg-surface-raised dark:bg-surface-dark-raised border border-rule/50 text-ink-muted">
                          {currentBook.publication_year}
                        </span>
                      )}
                    </div>

                    {/* Brief Note / Description if present */}
                    {currentBook.notes && (
                      <p className="text-2xs text-ink-secondary italic bg-surface-raised/50 dark:bg-surface-dark-raised/50 p-2 rounded-lg line-clamp-2">
                        "{currentBook.notes}"
                      </p>
                    )}
                  </div>
                </motion.div>
              </div>
            ) : null}
          </div>

          {/* Action Footer */}
          {currentBook && (
            <div className="p-4 sm:p-5 border-t border-rule/60 dark:border-rule-dark/60 bg-surface/50 dark:bg-surface-dark/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                disabled={isShuffling || filteredCandidates.length <= 1}
                onClick={() => drawRandomBook()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised text-ink text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Shuffle size={14} className={isShuffling ? 'animate-spin text-accent' : ''} />
                <span>Shuffle Another Book</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDetails(currentBook);
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-rule dark:border-rule-dark hover:border-ink-muted text-ink-secondary hover:text-ink text-xs font-medium transition-colors"
                >
                  View Details
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onStartReading(currentBook);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <BookOpen size={14} />
                  <span>Start Reading Now</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
