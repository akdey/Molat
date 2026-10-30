import React from 'react';
import { BookOpen, Clock, Calendar, ChevronRight, Bookmark } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { BookCover } from './BookCover';

export const ActiveReadingCard: React.FC = () => {
  const { books, streakSummary, openQuickLog, setSelectedBook } = useLibraryStore();

  const activeBooks = books.filter((b) => b.reading_status === 'READING');
  if (activeBooks.length === 0) return null;

  const primaryBook = activeBooks[0];
  const velocity = streakSummary?.reading_velocity_pages_per_day || 0;

  return (
    <section aria-label="Currently Reading" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-medium tracking-tight text-ink dark:text-ink-dark flex items-center gap-2">
          <Bookmark className="text-accent dark:text-accent-dark h-4 w-4" />
          Currently Reading
        </h2>
        {activeBooks.length > 1 && (
          <span className="text-2xs text-ink-muted">
            +{activeBooks.length - 1} other active book{activeBooks.length > 2 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-sm hover:border-accent/40 transition-colors">
        <div className="flex gap-4">
          {/* Cover thumbnail */}
          <div
            className="w-20 shrink-0 cursor-pointer"
            onClick={() => setSelectedBook(primaryBook)}
          >
            <BookCover
              title={primaryBook.title}
              authors={primaryBook.authors}
              coverUrl={primaryBook.cover_url}
              readingStatus={primaryBook.reading_status}
            />
          </div>

          {/* Book Info & Velocity ETA */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="space-y-1">
              <h3
                onClick={() => setSelectedBook(primaryBook)}
                className="font-serif text-base font-medium text-ink dark:text-ink-dark truncate cursor-pointer hover:text-accent dark:hover:text-accent-dark transition-colors"
              >
                {primaryBook.title}
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                {primaryBook.authors || 'Unknown author'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-muted pt-0.5">
                <span>{primaryBook.genre || 'General'}</span>
                <span>•</span>
                <span>{primaryBook.location || 'Home Shelf'}</span>
              </div>
            </div>

            {/* Velocity Strip */}
            <div className="pt-2 border-t border-rule/50 dark:border-rule-dark/50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                <Clock size={12} className="text-accent" />
                <span>
                  Velocity:{' '}
                  <strong className="text-ink dark:text-ink-dark">
                    {velocity > 0 ? `${velocity} pgs/day` : '0 pgs/day'}
                  </strong>
                </span>
              </div>

              <button
                onClick={() => openQuickLog(primaryBook)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark transition-colors"
              >
                <span>+ Log Pages</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

