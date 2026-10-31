import React from 'react';
import type { Book, PortfolioSummary } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { Star } from 'lucide-react';

interface FinancialTableProps {
  books: Book[];
  portfolio?: PortfolioSummary | null;
}

export const FinancialTable: React.FC<FinancialTableProps> = ({ books }) => {
  const { setSelectedBook } = useLibraryStore();

  const completedCount = books.filter((b) => b.reading_status === 'COMPLETED').length;
  const readingCount = books.filter((b) => b.reading_status === 'READING').length;
  const unreadCount = books.filter((b) => b.reading_status === 'UNREAD').length;

  return (
    <div className="rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink-secondary dark:text-ink-dark-secondary">
              <th className="py-3 px-3.5 font-medium">ID</th>
              <th className="py-3 px-3.5 font-medium">Title & Author</th>
              <th className="py-3 px-3.5 font-medium">Genre / Categories</th>
              <th className="py-3 px-3.5 font-medium">Reading Status</th>
              <th className="py-3 px-3.5 font-medium">Rating</th>
              <th className="py-3 px-3.5 font-medium">Year</th>
              <th className="py-3 px-3.5 font-medium">Shelf Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/60 dark:divide-rule-dark/60 text-ink dark:text-ink-dark">
            {books.map((b) => {
              const genres = (b.genre || '')
                .split(',')
                .map((g) => g.trim())
                .filter(Boolean);

              return (
                <tr
                  key={b.book_id}
                  onClick={() => setSelectedBook(b)}
                  className="hover:bg-surface/80 dark:hover:bg-surface-dark/80 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-mono text-2xs text-ink-muted">
                    {b.book_id}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <p className="font-serif font-medium line-clamp-1">{b.title}</p>
                    <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                      {b.authors || 'Unknown author'}
                    </p>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {genres.slice(0, 2).map((g, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-rule/50 dark:border-rule-dark/50 text-3xs font-medium text-ink-secondary dark:text-ink-dark-secondary truncate"
                        >
                          {g}
                        </span>
                      ))}
                      {genres.length > 2 && (
                        <span className="text-3xs text-ink-muted font-mono font-medium self-center">
                          +{genres.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-3xs font-medium uppercase tracking-wider ${
                        b.reading_status === 'COMPLETED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                          : b.reading_status === 'READING'
                          ? 'bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent-dark border border-accent/20'
                          : 'bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark text-ink-secondary'
                      }`}
                    >
                      {b.reading_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5">
                    {b.rating ? (
                      <span className="inline-flex items-center gap-1 font-mono text-2xs font-medium text-amber-600 dark:text-amber-400">
                        <Star size={11} className="fill-amber-400 text-amber-500" />
                        <span>{b.rating}/5</span>
                      </span>
                    ) : (
                      <span className="text-2xs text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-2xs text-ink-secondary dark:text-ink-dark-secondary tabular-nums">
                    {b.publication_year || '—'}
                  </td>
                  <td className="py-2.5 px-3.5 text-2xs text-ink-secondary truncate max-w-[140px]">
                    {b.location || 'Home Shelf'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark font-medium text-ink dark:text-ink-dark">
              <td colSpan={7} className="py-3 px-3.5 text-xs text-ink-secondary dark:text-ink-dark-secondary">
                <span className="font-serif font-medium text-ink dark:text-ink-dark">
                  Catalog Summary:
                </span>{' '}
                {books.length} volumes &bull;{' '}
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {completedCount} Completed
                </span>{' '}
                &bull;{' '}
                <span className="text-accent dark:text-accent-dark font-medium">
                  {readingCount} Reading
                </span>{' '}
                &bull; {unreadCount} To Read
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
