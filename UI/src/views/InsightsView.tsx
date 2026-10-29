import { useMemo } from 'react';
import { formatCurrency } from '../lib/utils';
import { useApp } from '../contexts/AppContext';
import { SectionHeading, EmptyState } from '../components/common/States';
import { BarChart2, AlertCircle } from 'lucide-react';

export function InsightsView() {
  const { books, currency } = useApp();

  const owned = useMemo(() => books.filter(b => b.ownership_status === 'Owned'), [books]);

  const knownSpend = useMemo(() =>
    owned.filter(b => typeof b.purchase_price === 'number')
      .reduce((s, b) => s + (b.purchase_price ?? 0), 0),
    [owned],
  );
  const booksWithPrice = owned.filter(b => typeof b.purchase_price === 'number').length;

  const readingStatusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of owned) {
      map[b.reading_status] = (map[b.reading_status] ?? 0) + 1;
    }
    return map;
  }, [owned]);

  const genreCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of owned) {
      const g = b.genre ?? 'Uncategorised';
      map[g] = (map[g] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [owned]);

  const maxGenre = genreCounts[0]?.[1] ?? 1;

  if (owned.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeading title="Insights" level={1} />
        <EmptyState
          icon={<BarChart2 size={36} />}
          title="No data to show yet"
          description="Insights are based only on real data in your library. Add books to see meaningful metrics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Insights"
        level={1}
        description="Based on real data in your library — no fabricated or inferred values."
      />

      {/* Data-quality notice */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-md bg-info-subtle dark:bg-info-dark-subtle border border-info/20 dark:border-info-dark/20">
        <AlertCircle size={14} className="text-info dark:text-info-dark shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-info dark:text-info-dark leading-relaxed">
          Metrics include only fields that have been recorded. Blank fields (e.g. missing purchase prices, unknown genres) are counted but not assumed.
        </p>
      </div>

      {/* Summary stats */}
      <section aria-label="Collection summary">
        <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-4">Collection</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Owned', value: owned.length },
            { label: 'Wishlist', value: books.filter(b => b.ownership_status === 'Wishlist').length },
            { label: 'Completed', value: readingStatusCounts['Completed'] ?? 0 },
            { label: 'Currently reading', value: readingStatusCounts['Reading'] ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 px-4 py-3 rounded-md border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
              <span className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">{label}</span>
              <span className="text-2xl font-serif font-medium text-ink dark:text-ink-dark tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reading progress breakdown */}
      <section aria-label="Reading status breakdown">
        <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-4">Reading status</h2>
        <div className="space-y-2" aria-label="Reading status distribution">
          {(['Completed', 'Reading', 'Unread', 'Abandoned'] as const).map(status => {
            const count = readingStatusCounts[status] ?? 0;
            const pct = owned.length > 0 ? Math.round((count / owned.length) * 100) : 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="text-xs text-ink-secondary dark:text-ink-dark-secondary w-24 shrink-0">{status}</span>
                <div
                  className="flex-1 h-2 rounded-full bg-rule dark:bg-rule-dark overflow-hidden"
                  role="progressbar"
                  aria-label={`${status}: ${count} books (${pct}%)`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-accent dark:bg-accent-dark"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-ink-muted dark:text-ink-dark-muted w-12 text-right shrink-0">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-2xs text-ink-muted dark:text-ink-dark-muted mt-2">
          Based on {owned.length} owned books
        </p>
      </section>

      {/* Known spend */}
      <section aria-label="Purchase spend">
        <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-2">Known purchase spend</h2>
        <div className="flex flex-col gap-1 px-4 py-3 rounded-md border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark inline-table">
          <span className="text-3xl font-serif font-medium text-ink dark:text-ink-dark tabular-nums">
            {formatCurrency(knownSpend, currency)}
          </span>
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted">
            From {booksWithPrice} of {owned.length} books with recorded purchase prices.
            {owned.length - booksWithPrice > 0 && ` ${owned.length - booksWithPrice} books have no recorded price.`}
          </span>
        </div>
        {booksWithPrice > 0 && (
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-2">
            Average: {formatCurrency(Math.round(knownSpend / booksWithPrice), currency)} per book (recorded prices only)
          </p>
        )}
      </section>

      {/* Genre distribution */}
      {genreCounts.length > 0 && (
        <section aria-label="Genre distribution">
          <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark mb-4">Genres</h2>
          <div className="space-y-2" aria-label="Genre breakdown">
            {genreCounts.map(([genre, count]) => {
              const pct = Math.round((count / maxGenre) * 100);
              return (
                <div key={genre} className="flex items-center gap-3">
                  <span className="text-xs text-ink-secondary dark:text-ink-dark-secondary w-36 shrink-0 truncate" title={genre}>{genre}</span>
                  <div className="flex-1 h-2 rounded-full bg-rule dark:bg-rule-dark overflow-hidden"
                    role="progressbar"
                    aria-label={`${genre}: ${count} books`}
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={maxGenre}
                  >
                    <div className="h-full rounded-full bg-accent/60 dark:bg-accent-dark/60" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-ink-muted dark:text-ink-dark-muted w-6 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
          <p className="text-2xs text-ink-muted dark:text-ink-dark-muted mt-2">
            Top {genreCounts.length} genres; books without a genre are counted separately.
          </p>
        </section>
      )}
    </div>
  );
}

