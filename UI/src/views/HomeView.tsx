import { useMemo } from 'react';
import { cn, formatCurrency, relativeTime } from '../lib/utils';
import { useApp } from '../contexts/AppContext';
import { BookCover } from '../components/books/BookCover';
import { ProgressBar } from '../components/books/ProgressBar';
import { ConnectionBadge } from '../components/common/States';
import { EmptyState } from '../components/common/States';
import { Button } from '../components/common/FormControls';
import { BookOpen, ScanLine, PlusCircle, Search } from 'lucide-react';
import type { Book } from '../types/book';

type HomeProps = {
  onNavigate: (r: string) => void;
  onSelectBook: (book: Book) => void;
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function StatCard({ label, value, onClick, className }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'flex flex-col gap-0.5 px-4 py-3 rounded-md border',
        'border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark',
        onClick
          ? 'cursor-pointer hover:border-accent/40 dark:hover:border-accent-dark/40 hover:bg-accent-subtle dark:hover:bg-accent-dark-subtle transition-colors text-left'
          : '',
        className,
      )}
      {...(onClick ? { 'aria-label': `Filter by ${label}` } : {})}
    >
      <span className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">{label}</span>
      <span className="text-2xl font-serif font-medium text-ink dark:text-ink-dark tabular-nums leading-tight">{value}</span>
    </Tag>
  );
}

export function HomeView({ onNavigate, onSelectBook }: HomeProps) {
  const { books, booksLoading, connectionStatus, lastRefresh, currency } = useApp();

  const stats = useMemo(() => {
    const owned = books.filter(b => b.ownership_status === 'Owned');
    const wishlist = books.filter(b => b.ownership_status === 'Wishlist');
    const reading = books.filter(b => b.reading_status === 'Reading');
    const completed = books.filter(b => b.reading_status === 'Completed');
    const knownSpend = owned
      .filter(b => typeof b.purchase_price === 'number')
      .reduce((sum, b) => sum + (b.purchase_price ?? 0), 0);

    return { owned, wishlist, reading, completed, knownSpend };
  }, [books]);

  const recentlyAdded = useMemo(() =>
    [...books]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6),
    [books],
  );

  const currentlyReading = useMemo(() =>
    books.filter(b => b.reading_status === 'Reading').slice(0, 3),
    [books],
  );

  const isFirstVisit = !booksLoading && books.length === 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-ink dark:text-ink-dark leading-tight">
            Your Library
          </h1>
          {lastRefresh && (
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-1">
              Updated {relativeTime(lastRefresh)}
            </p>
          )}
        </div>
        <ConnectionBadge status={connectionStatus} lastRefresh={lastRefresh} />
      </div>

      {/* Empty state — first visit */}
      {isFirstVisit ? (
        <EmptyState
          icon="📚"
          title="Your library is empty"
          description="Start by scanning an ISBN barcode, searching for a title, or adding a book manually."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="primary" iconLeft={<ScanLine size={16} />} onClick={() => onNavigate('add')}>
                Scan ISBN
              </Button>
              <Button variant="secondary" iconLeft={<PlusCircle size={16} />} onClick={() => onNavigate('add')}>
                Add manually
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Stats */}
          <section aria-label="Collection statistics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Owned"
                value={stats.owned.length}
                onClick={() => onNavigate('collection')}
              />
              <StatCard
                label="Reading"
                value={stats.reading.length}
                onClick={() => onNavigate('reading')}
              />
              <StatCard
                label="Completed"
                value={stats.completed.length}
                onClick={() => onNavigate('reading')}
              />
              <StatCard
                label="Wishlist"
                value={stats.wishlist.length}
                onClick={() => onNavigate('wishlist')}
              />
            </div>

            {/* Known spend — separate, clearly labelled */}
            {stats.knownSpend > 0 && (
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-2">
                Known purchase spend:{' '}
                <span className="text-ink dark:text-ink-dark tabular-nums font-medium">
                  {formatCurrency(stats.knownSpend, currency)}
                </span>{' '}
                — books with recorded purchase prices only
              </p>
            )}
          </section>

          {/* Quick actions */}
          <section aria-label="Quick actions">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="md"
                iconLeft={<ScanLine size={16} />}
                onClick={() => onNavigate('add')}
              >
                Scan ISBN
              </Button>
              <Button
                variant="secondary"
                size="md"
                iconLeft={<Search size={16} />}
                onClick={() => onNavigate('collection')}
              >
                Browse collection
              </Button>
              <Button
                variant="ghost"
                size="md"
                iconLeft={<PlusCircle size={16} />}
                onClick={() => onNavigate('add')}
              >
                Add manually
              </Button>
            </div>
          </section>

          {/* Currently reading */}
          {currentlyReading.length > 0 && (
            <section aria-label="Currently reading">
              <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-4">
                Continue reading
              </h2>
              <div className="flex flex-col gap-3">
                    {
                      currentlyReading.map(book => (
                        <button
                          key={book.book_id}
                          onClick={() => onSelectBook(book)}
                          className={cn(
                            'flex items-center gap-4 p-3 rounded-lg text-left',
                            'bg-surface dark:bg-surface-dark',
                            'border border-rule dark:border-rule-dark',
                            'hover:border-accent/40 dark:hover:border-accent-dark/40 transition-colors',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                          )}
                          aria-label={`Continue reading ${book.title}`}
                        >
                          <BookCover
                            title={book.title}
                            author={book.author}
                            coverUrl={book.cover_url}
                            className="w-12 shrink-0"
                            priority
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink dark:text-ink-dark leading-snug truncate">
                              {book.title}
                            </p>
                            {book.author && (
                              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 truncate">
                                {book.author}
                              </p>
                            )}
                            <ProgressBar
                              current={book.current_page}
                              total={book.total_pages}
                              showLabel
                              className="mt-2"
                              size="xs"
                            />
                          </div>
                          <BookOpen size={16} className="text-ink-muted dark:text-ink-dark-muted shrink-0" aria-hidden="true" />
                        </button>
                ))}
              </div>
            </section>
          )}

          {/* Recently added */}
          {recentlyAdded.length > 0 && (
            <section aria-label="Recently added books">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark">Recently added</h2>
                <Button variant="link" size="sm" onClick={() => onNavigate('collection')}>
                  View all
                </Button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {recentlyAdded.map(book => (
                  <button
                    key={book.book_id}
                    onClick={() => onSelectBook(book)}
                    className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                    aria-label={`View ${book.title}`}
                  >
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverUrl={book.cover_url}
                      className="w-full hover:shadow-md transition-shadow"
                    />
                    <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary mt-1.5 line-clamp-2 leading-snug">
                      {book.title}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

