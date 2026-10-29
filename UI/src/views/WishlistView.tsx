import React, { useMemo } from 'react';
import { cn, formatCurrency } from '../lib/utils';
import { useApp } from '../contexts/AppContext';
import { BookCover } from '../components/books/BookCover';
import { EmptyState } from '../components/common/States';
import { Button } from '../components/common/FormControls';
import { SectionHeading } from '../components/common/States';
import { PlusCircle, ShoppingCart, Star, ChevronRight } from 'lucide-react';
import type { Book } from '../types/book';

interface WishlistViewProps {
  onSelectBook: (book: Book) => void;
  onAddBook: () => void;
}

export function WishlistView({ onSelectBook, onAddBook }: WishlistViewProps) {
  const { books, currency } = useApp();

  const wishlist = useMemo(() =>
    books
      .filter(b => b.ownership_status === 'Wishlist')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [books],
  );

  const knownBudget = wishlist
    .filter(b => typeof b.retail_price === 'number')
    .reduce((s, b) => s + (b.retail_price ?? 0), 0);

  if (wishlist.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeading title="Wishlist" level={1} />
        <EmptyState
          icon={<Star size={36} />}
          title="Your wishlist is empty"
          description="Add books you want to read or buy. Wishlisted books are separate from your owned collection."
          action={
            <Button variant="primary" iconLeft={<PlusCircle size={16} />} onClick={onAddBook}>
              Add to wishlist
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Wishlist"
        level={1}
        description={`${wishlist.length} book${wishlist.length !== 1 ? 's' : ''} planned`}
        action={
          <Button variant="primary" size="sm" iconLeft={<PlusCircle size={14} />} onClick={onAddBook}>
            Add
          </Button>
        }
      />

      {/* Budget summary */}
      {knownBudget > 0 && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-info-subtle dark:bg-info-dark-subtle border border-info/20 dark:border-info-dark/20">
          <ShoppingCart size={14} className="text-info dark:text-info-dark shrink-0" aria-hidden="true" />
          <p className="text-xs text-info dark:text-info-dark">
            Known retail prices total{' '}
            <strong className="tabular-nums">{formatCurrency(knownBudget, currency)}</strong>
            {' '}— retail prices are for reference only
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col divide-y divide-rule dark:divide-rule-dark" role="list">
        {wishlist.map(book => (
          <article key={book.book_id} role="listitem" className="group">
            <button
              onClick={() => onSelectBook(book)}
              className={cn(
                'w-full flex items-center gap-4 py-4 text-left',
                'hover:bg-surface dark:hover:bg-surface-dark rounded-md px-2 -mx-2',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              )}
              aria-label={`View ${book.title}`}
            >
              <BookCover
                title={book.title}
                author={book.author}
                coverUrl={book.cover_url}
                className="w-12 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-ink dark:text-ink-dark leading-snug line-clamp-2 group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                  {book.title}
                </p>
                {book.author && (
                  <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                    {book.author}
                  </p>
                )}
                {book.genre && (
                  <p className="text-2xs text-ink-muted dark:text-ink-dark-muted">{book.genre}</p>
                )}
              </div>
              <div className="shrink-0 text-right space-y-1">
                {book.retail_price !== undefined && (
                  <div>
                    <p className="text-sm tabular-nums text-ink dark:text-ink-dark font-medium">
                      {formatCurrency(book.retail_price, currency)}
                    </p>
                    <p className="text-2xs text-ink-muted dark:text-ink-dark-muted">retail price</p>
                  </div>
                )}
              </div>
              <ChevronRight size={14} className="text-ink-muted dark:text-ink-dark-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

