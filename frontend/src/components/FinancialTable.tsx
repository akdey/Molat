import React from 'react';
import type { Book, PortfolioSummary } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';

interface FinancialTableProps {
  books: Book[];
  portfolio: PortfolioSummary | null;
}

export const FinancialTable: React.FC<FinancialTableProps> = ({ books, portfolio }) => {
  const { setSelectedBook } = useLibraryStore();

  return (
    <div className="rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink-secondary dark:text-ink-dark-secondary">
              <th className="py-3 px-3 font-medium">ID</th>
              <th className="py-3 px-3 font-medium">Title & Author</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-3 font-medium text-right">Cost (CP)</th>
              <th className="py-3 px-3 font-medium text-right">Retail (RP)</th>
              <th className="py-3 px-3 font-medium text-right">Saved</th>
              <th className="py-3 px-3 font-medium">Condition</th>
              <th className="py-3 px-3 font-medium">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/60 dark:divide-rule-dark/60 text-ink dark:text-ink-dark">
            {books.map((b) => {
              const cp = b.purchase_price || 0;
              const rp = b.rp || 0;
              const saved = Math.max(0, rp - cp);
              const discount = rp > 0 ? Math.round((saved / rp) * 100) : 0;

              return (
                <tr
                  key={b.book_id}
                  onClick={() => setSelectedBook(b)}
                  className="hover:bg-surface/80 dark:hover:bg-surface-dark/80 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-2xs text-ink-muted">
                    {b.book_id}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-serif font-medium line-clamp-1">{b.title}</p>
                    <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                      {b.authors || 'Unknown'}
                    </p>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-medium uppercase bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark">
                      {b.reading_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    ₹{cp.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-ink-secondary dark:text-ink-dark-secondary">
                    ₹{rp.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-accent dark:text-accent-dark font-medium">
                    {saved > 0 ? `₹${saved.toLocaleString('en-IN')} (${discount}%)` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-2xs text-ink-secondary">
                    {b.condition}
                  </td>
                  <td className="py-2.5 px-3 text-2xs text-ink-secondary truncate max-w-[120px]">
                    {b.location || 'Home Shelf'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {portfolio && (
            <tfoot>
              <tr className="border-t-2 border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark font-medium text-ink dark:text-ink-dark">
                <td colSpan={3} className="py-3 px-3 font-serif">
                  Total Portfolio Value ({books.length} volumes)
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  ₹{portfolio.total_cp.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  ₹{portfolio.total_rp.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-accent dark:text-accent-dark font-semibold">
                  ₹{portfolio.total_saved.toLocaleString('en-IN')} ({portfolio.discount_pct}%)
                </td>
                <td colSpan={2} className="py-3 px-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

