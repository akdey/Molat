import React from 'react';
import { cn } from '../../lib/utils';
import type { Book } from '../../types/book';
import { BookCover } from '../books/BookCover';
import { StatusPill, LoanBadge } from '../books/StatusPill';
import { ProgressBar, StarRating } from '../books/ProgressBar';
import { Skeleton } from '../common/States';
import { BookCardSkeleton } from '../common/States';
import { MoreHorizontal, MapPin } from 'lucide-react';

// =================== Book Card (grid) ===================

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
  className?: string;
}

export function BookCard({ book, onClick, className }: BookCardProps) {
  const isOverdue = book.expected_return_date
    ? new Date(book.expected_return_date) < new Date()
    : false;

  return (
    <article
      className={cn(
        'group flex flex-col gap-2 cursor-pointer',
        'focus-within:ring-2 focus-within:ring-accent/40 rounded',
        className,
      )}
    >
      <button
        onClick={() => onClick(book)}
        className="text-left focus:outline-none"
        aria-label={`View details for ${book.title}${book.author ? ` by ${book.author}` : ''}`}
      >
        {/* Cover */}
        <div className="relative">
          <BookCover
            title={book.title}
            author={book.author}
            coverUrl={book.cover_url}
            className="w-full shadow-sm group-hover:shadow-md transition-shadow duration-slow"
          />
          {/* Loan badge overlay */}
          {book.loaned_to && (
            <div className="absolute top-1.5 left-1.5">
              <LoanBadge loanedTo={book.loaned_to} overdue={isOverdue} />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="pt-2 space-y-0.5">
          <p className="text-sm font-medium text-ink dark:text-ink-dark leading-snug line-clamp-2 group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
            {book.title}
          </p>
          {book.author && (
            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary leading-snug line-clamp-1">
              {book.author}
            </p>
          )}

          {/* Reading progress */}
          {book.reading_status === 'Reading' && (
            <ProgressBar
              current={book.current_page}
              total={book.total_pages}
              className="mt-1.5"
              size="xs"
            />
          )}

          {/* Status pills row */}
          <div className="flex flex-wrap gap-1 pt-1">
            <StatusPill variant="reading" value={book.reading_status} />
            {book.ownership_status !== 'Owned' && (
              <StatusPill variant="ownership" value={book.ownership_status} />
            )}
          </div>
        </div>
      </button>
    </article>
  );
}

// =================== Book Row (list/table view) ===================

interface BookRowProps {
  book: Book;
  onClick: (book: Book) => void;
}

export function BookRow({ book, onClick }: BookRowProps) {
  const isOverdue = book.expected_return_date
    ? new Date(book.expected_return_date) < new Date()
    : false;

  return (
    <article className="group">
      <button
        onClick={() => onClick(book)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5',
          'hover:bg-surface dark:hover:bg-surface-dark',
          'rounded-md transition-colors duration-fast text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        )}
        aria-label={`View details for ${book.title}`}
      >
        {/* Mini cover */}
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.cover_url}
          variant="thumb"
          className="w-8 shrink-0"
        />

        {/* Title + Author */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink dark:text-ink-dark leading-snug truncate group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
            {book.title}
          </p>
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted leading-none mt-0.5 truncate">
            {book.author ?? <span className="italic">No author recorded</span>}
          </p>
        </div>

        {/* Status + location */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <StatusPill variant="reading" value={book.reading_status} />
          {book.loaned_to && <LoanBadge loanedTo={book.loaned_to} overdue={isOverdue} />}
        </div>

        <div className="hidden md:flex items-center gap-1 text-ink-muted dark:text-ink-dark-muted shrink-0">
          {book.shelf_location && (
            <>
              <MapPin size={11} aria-hidden="true" />
              <span className="text-xs truncate max-w-[12ch]">{book.shelf_location}</span>
            </>
          )}
        </div>

        {book.personal_rating && (
          <StarRating value={book.personal_rating} className="hidden lg:flex shrink-0" />
        )}

        <MoreHorizontal size={14} className="text-ink-muted dark:text-ink-dark-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
      </button>
    </article>
  );
}

// =================== Grid + List containers ===================

interface BookGridProps {
  books: Book[];
  loading?: boolean;
  onSelect: (book: Book) => void;
}

export function BookGrid({ books, loading, onSelect }: BookGridProps) {
  if (loading) {
    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        aria-busy="true"
        aria-label="Loading books"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      role="list"
      aria-label="Book covers"
    >
      {books.map(book => (
        <div key={book.book_id} role="listitem">
          <BookCard book={book} onClick={onSelect} />
        </div>
      ))}
    </div>
  );
}

export function BookList({ books, loading, onSelect }: BookGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col" aria-busy="true" aria-label="Loading books">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="w-8 aspect-[2/3] rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4 rounded" />
              <Skeleton className="h-2.5 w-2/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-rule dark:divide-rule-dark" role="list" aria-label="Book list">
      {books.map(book => (
        <div key={book.book_id} role="listitem">
          <BookRow book={book} onClick={onSelect} />
        </div>
      ))}
    </div>
  );
}

