import { useMemo } from 'react';
import { cn, readingProgress } from '../lib/utils';
import { useApp } from '../contexts/AppContext';
import { BookCover } from '../components/books/BookCover';
import { ProgressBar, StarRating } from '../components/books/ProgressBar';
import { EmptyState } from '../components/common/States';
import { SectionHeading } from '../components/common/States';
import { BookOpen, CheckCircle2, List, XCircle } from 'lucide-react';
import type { Book, ReadingStatus } from '../types/book';

interface ReadingViewProps {
  onSelectBook: (book: Book) => void;
}

const SECTIONS: { status: ReadingStatus; title: string; icon: React.ReactNode; emptyText: string }[] = [
  {
    status: 'Reading',
    title: 'Currently reading',
    icon: <BookOpen size={16} />,
    emptyText: 'No books in progress.',
  },
  {
    status: 'Unread',
    title: 'Unread queue',
    icon: <List size={16} />,
    emptyText: 'Nothing in your unread queue.',
  },
  {
    status: 'Completed',
    title: 'Completed',
    icon: <CheckCircle2 size={16} />,
    emptyText: 'No completed books yet.',
  },
  {
    status: 'Abandoned',
    title: 'Abandoned',
    icon: <XCircle size={16} />,
    emptyText: "No abandoned books — you're a finisher!",
  },
];

export function ReadingView({ onSelectBook }: ReadingViewProps) {
  const { books } = useApp();

  const byStatus = useMemo(() => {
    const map = new Map<ReadingStatus, Book[]>();
    for (const s of ['Reading', 'Unread', 'Completed', 'Abandoned'] as ReadingStatus[]) {
      map.set(s, books.filter(b => b.reading_status === s && b.ownership_status === 'Owned'));
    }
    return map;
  }, [books]);

  // Yearly stats
  const thisYear = new Date().getFullYear();
  const completedThisYear = (byStatus.get('Completed') ?? []).filter(b => {
    if (!b.updated_at) return false;
    return new Date(b.updated_at).getFullYear() === thisYear;
  });

  const totalPagesRead = (byStatus.get('Reading') ?? []).reduce(
    (sum, b) => sum + (b.current_page ?? 0), 0,
  );

  if (books.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={36} />}
        title="No books to track yet"
        description="Add books to your library and update their reading status here."
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading title="Reading tracker" level={1} />

      {/* Summary bar — only data-backed metrics */}
      {(completedThisYear.length > 0 || totalPagesRead > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {completedThisYear.length > 0 && (
            <div className="px-4 py-3 rounded-md border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
              <p className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Completed {thisYear}</p>
              <p className="text-2xl font-serif font-medium text-ink dark:text-ink-dark tabular-nums">{completedThisYear.length}</p>
            </div>
          )}
          {totalPagesRead > 0 && (
            <div className="px-4 py-3 rounded-md border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
              <p className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Pages in progress</p>
              <p className="text-2xl font-serif font-medium text-ink dark:text-ink-dark tabular-nums">{totalPagesRead.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map(({ status, title, icon, emptyText }) => {
        const sectionBooks = byStatus.get(status) ?? [];
        return (
          <section key={status} aria-label={title}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-ink-muted dark:text-ink-dark-muted" aria-hidden="true">{icon}</span>
              <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark">{title}</h2>
              <span className="text-xs text-ink-muted dark:text-ink-dark-muted ml-1">({sectionBooks.length})</span>
            </div>

            {sectionBooks.length === 0 ? (
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted italic pl-6">{emptyText}</p>
            ) : (
              <div className="flex flex-col divide-y divide-rule dark:divide-rule-dark">
                {sectionBooks.map(book => {
                  const pct = readingProgress(book.current_page, book.total_pages);
                  return (
                    <article key={book.book_id} className="group">
                      <button
                        onClick={() => onSelectBook(book)}
                        className={cn(
                          'w-full flex items-center gap-4 py-3 px-2 -mx-2 text-left',
                          'hover:bg-surface dark:hover:bg-surface-dark rounded-md transition-colors',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                        )}
                        aria-label={`View ${book.title}`}
                      >
                        <BookCover
                          title={book.title}
                          author={book.author}
                          coverUrl={book.cover_url}
                          className="w-10 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-ink dark:text-ink-dark truncate group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                            {book.title}
                          </p>
                          {book.author && (
                            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                              {book.author}
                            </p>
                          )}
                          {pct !== null && status === 'Reading' && (
                            <ProgressBar current={book.current_page} total={book.total_pages} size="xs" showLabel className="max-w-[180px]" />
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {book.personal_rating && status === 'Completed' && (
                            <StarRating value={book.personal_rating} />
                          )}
                          {status === 'Abandoned' && book.current_page && (
                            <span className="text-2xs text-ink-muted dark:text-ink-dark-muted tabular-nums">
                              p. {book.current_page}
                              {book.total_pages ? ` / ${book.total_pages}` : ''}
                            </span>
                          )}
                        </div>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

