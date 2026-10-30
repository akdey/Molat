import React, { useEffect, useState } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { BookOpen, Sparkles, RefreshCw, Sun, Moon, Search } from 'lucide-react';

export default function App() {
  const { books, portfolio, loading, error, loadBooks, theme, toggleTheme } = useLibraryStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const filteredBooks = books.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      (b.authors && b.authors.toLowerCase().includes(q)) ||
      (b.genre && b.genre.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-rule dark:border-rule-dark bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="text-accent dark:text-accent-dark h-6 w-6" />
            <div>
              <h1 className="font-serif text-xl font-medium tracking-tight">Ondorpata / Molat</h1>
              <p className="text-2xs text-ink-muted dark:text-ink-dark-muted hidden sm:block">Personal Physical Book Library</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => loadBooks()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:bg-rule/40 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Portfolio Savings KPI Strip */}
        {portfolio && (
          <section aria-label="Portfolio Summary" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
              <span className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">Owned Books</span>
              <p className="text-2xl font-serif font-medium mt-1 tabular-nums">{portfolio.total_books}</p>
            </div>
            <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
              <span className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">Total Cost (CP)</span>
              <p className="text-2xl font-serif font-medium mt-1 tabular-nums">₹{portfolio.total_cp.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
              <span className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">Retail Value (MRP)</span>
              <p className="text-2xl font-serif font-medium mt-1 tabular-nums">₹{portfolio.total_rp.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-accent-subtle dark:bg-accent-dark-subtle border-accent/20 dark:border-accent-dark/30">
              <span className="text-2xs uppercase tracking-wider text-accent dark:text-accent-dark font-medium">Savings ({portfolio.discount_pct}%)</span>
              <p className="text-2xl font-serif font-medium mt-1 text-accent dark:text-accent-dark tabular-nums">₹{portfolio.total_saved.toLocaleString('en-IN')}</p>
            </div>
          </section>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search across 55+ books by title, author, or genre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Books Grid */}
        <section aria-label="Book Collection">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-medium">Library Collection ({filteredBooks.length})</h2>
          </div>

          {loading && books.length === 0 ? (
            <div className="py-20 text-center text-ink-muted animate-pulse">
              Loading library catalogue from Google Sheets...
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-16 text-center text-ink-muted">
              No books matched "{search}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBooks.map(book => (
                <article
                  key={book.book_id}
                  className="group flex flex-col gap-2 p-2 rounded-xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark hover:border-accent/40 dark:hover:border-accent-dark/40 transition-all duration-200"
                >
                  {/* Cover */}
                  <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-rule dark:bg-rule-dark shadow-sm">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={`Cover of ${book.title}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        onError={(e) => {
                          // Hide broken image on error and trigger fallback appearance
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col justify-between p-3 bg-stone-800 text-stone-200 text-center select-none">
                        <div className="border-t border-white/20 w-full" />
                        <span className="font-serif text-3xl font-light">{book.title.charAt(0)}</span>
                        <div>
                          <p className="font-serif text-2xs line-clamp-2 leading-tight">{book.title}</p>
                          <p className="text-3xs text-stone-400 truncate mt-0.5">{book.authors}</p>
                        </div>
                        <div className="border-b border-white/20 w-full" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-3xs font-medium bg-black/60 backdrop-blur-sm text-white">
                      {book.reading_status}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-0.5">
                    <h3 className="font-serif text-xs font-medium line-clamp-2 leading-tight group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                      {book.authors || 'Unknown author'}
                    </p>
                    <div className="flex items-center justify-between text-2xs pt-1 text-ink-muted">
                      <span>{book.genre || 'General'}</span>
                      {book.purchase_price !== undefined && (
                        <span className="font-medium text-ink dark:text-ink-dark tabular-nums">
                          ₹{book.purchase_price}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
