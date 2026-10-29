import React, { useMemo } from 'react';
import { cn, formatDate } from '../lib/utils';
import { useApp } from '../contexts/AppContext';
import { BookCover } from '../components/books/BookCover';
import { StatusPill } from '../components/books/StatusPill';
import { SectionHeading, EmptyState } from '../components/common/States';
import { MapPin, AlertCircle, Package } from 'lucide-react';
import type { Book } from '../types/book';

interface InventoryViewProps {
  onSelectBook: (book: Book) => void;
}

export function InventoryView({ onSelectBook }: InventoryViewProps) {
  const { books } = useApp();

  const owned = useMemo(() => books.filter(b => b.ownership_status === 'Owned'), [books]);
  const onLoan = useMemo(() => owned.filter(b => b.loaned_to), [owned]);
  const overdue = useMemo(() => onLoan.filter(b =>
    b.expected_return_date && new Date(b.expected_return_date) < new Date(),
  ), [onLoan]);
  const damaged = useMemo(() => owned.filter(b => b.condition === 'Damaged'), [owned]);

  const byLocation = useMemo(() => {
    const map = new Map<string, Book[]>();
    for (const b of owned) {
      const loc = b.shelf_location ?? 'Location unknown';
      map.set(loc, [...(map.get(loc) ?? []), b]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [owned]);

  if (owned.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeading title="Physical inventory" level={1} />
        <EmptyState
          icon={<Package size={36} />}
          title="No owned books yet"
          description="Books you mark as 'Owned' will appear here for physical inventory management."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Physical inventory"
        level={1}
        description={`${owned.length} owned books`}
      />

      {/* Attention items */}
      {(overdue.length > 0 || damaged.length > 0) && (
        <section aria-label="Items needing attention">
          <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-3">Needs attention</h2>
          <div className="space-y-2">
            {overdue.map(book => (
              <LoanRow key={book.book_id} book={book} overdue onClick={() => onSelectBook(book)} />
            ))}
            {damaged.map(book => (
              <article key={book.book_id} className="group">
                <button
                  onClick={() => onSelectBook(book)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left',
                    'bg-error-subtle dark:bg-error-dark-subtle border border-error/20 dark:border-error-dark/20',
                    'hover:border-error/40 transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  )}
                >
                  <BookCover title={book.title} coverUrl={book.cover_url} className="w-8 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink dark:text-ink-dark truncate">{book.title}</p>
                    <p className="text-xs text-error dark:text-error-dark">Condition: Damaged</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* On loan — non-overdue */}
      {onLoan.filter(b => !overdue.includes(b)).length > 0 && (
        <section aria-label="Currently on loan">
          <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-3">On loan</h2>
          <div className="flex flex-col divide-y divide-rule dark:divide-rule-dark">
            {onLoan.filter(b => !overdue.includes(b)).map(book => (
              <LoanRow key={book.book_id} book={book} overdue={false} onClick={() => onSelectBook(book)} />
            ))}
          </div>
        </section>
      )}

      {/* By location */}
      <section aria-label="Books by location">
        <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-4">By shelf location</h2>
        <div className="space-y-6">
          {byLocation.map(([location, locBooks]) => (
            <div key={location}>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin size={12} className="text-ink-muted dark:text-ink-dark-muted" aria-hidden="true" />
                <h3 className="text-xs uppercase tracking-wider font-semibold text-ink-muted dark:text-ink-dark-muted">
                  {location} <span className="font-normal">({locBooks.length})</span>
                </h3>
              </div>
              <div className="flex flex-col divide-y divide-rule dark:divide-rule-dark">
                {locBooks.map(book => (
                  <article key={book.book_id} className="group">
                    <button
                      onClick={() => onSelectBook(book)}
                      className={cn(
                        'w-full flex items-center gap-3 py-2.5 text-left',
                        'hover:bg-surface dark:hover:bg-surface-dark rounded-md px-2 -mx-2 transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                      )}
                    >
                      <BookCover title={book.title} coverUrl={book.cover_url} className="w-8 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-ink-dark truncate">{book.title}</p>
                        {book.author && <p className="text-xs text-ink-muted dark:text-ink-dark-muted truncate">{book.author}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusPill variant="condition" value={book.condition} />
                        {book.loaned_to && (
                          <span className="text-2xs text-warn dark:text-warn-dark">On loan</span>
                        )}
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LoanRow({ book, overdue, onClick }: { book: Book; overdue: boolean; onClick: () => void }) {
  return (
    <article className="group">
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-3 rounded-md text-left',
          overdue
            ? 'bg-error-subtle dark:bg-error-dark-subtle border border-error/20 dark:border-error-dark/20 hover:border-error/40'
            : 'bg-warn-subtle dark:bg-warn-dark-subtle border border-warn/20 dark:border-warn-dark/20 hover:border-warn/40',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        )}
      >
        <BookCover title={book.title} coverUrl={book.cover_url} className="w-9 shrink-0" />
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-ink dark:text-ink-dark truncate">{book.title}</p>
          <p className="text-xs">
            <span className={overdue ? 'text-error dark:text-error-dark' : 'text-warn dark:text-warn-dark'}>
              {overdue ? 'Overdue — ' : 'Loaned to '}
            </span>
            <span className="text-ink-secondary dark:text-ink-dark-secondary">{book.loaned_to}</span>
          </p>
          {book.expected_return_date && (
            <p className="text-2xs text-ink-muted dark:text-ink-dark-muted">
              Due: {formatDate(book.expected_return_date)}
            </p>
          )}
        </div>
        {overdue && (
          <AlertCircle size={16} className="text-error dark:text-error-dark shrink-0" aria-label="Overdue" />
        )}
      </button>
    </article>
  );
}

