import React, { useEffect } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import {
  BookOpen,
  Flame,
  ShoppingBag,
  Wrench,
  Search,
  LayoutGrid,
  Library,
  Table,
  Camera,
  KeyRound,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

import { StreakBanner } from './components/StreakBanner';
import { ActiveReadingCard } from './components/ActiveReadingCard';
import { BookCover } from './components/BookCover';
import { SpineView } from './components/SpineView';
import { FinancialTable } from './components/FinancialTable';
import { BookDetailDrawer } from './components/BookDetailDrawer';
import { QuickLogModal } from './components/QuickLogModal';
import { HeatmapScreen } from './components/HeatmapScreen';
import { WishlistScreen } from './components/WishlistScreen';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { KeySettingsModal } from './components/KeySettingsModal';

export default function App() {
  const {
    books,
    portfolio,
    loading,
    error,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    genreFilter,
    setGenreFilter,
    conditionFilter,
    setConditionFilter,
    setSelectedBook,
    setScannerOpen,
    setKeyModalOpen,
    loadAllData,
    theme,
    toggleTheme,
    triggerCoverEnrichment,
  } = useLibraryStore();

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Extract unique genres for filter dropdown
  const allGenres = Array.from(new Set(books.map((b) => b.genre).filter(Boolean))) as string[];

  // Filter books based on search and facet filters
  const filteredBooks = books.filter((b) => {
    if (activeTab === 'maintenance') {
      // Maintenance filter: books missing covers or damaged or missing ISBN
      const needsCover = !b.cover_url;
      const isDamaged = b.condition === 'Damaged';
      const missingIsbn = !b.isbn_13 && !b.isbn_10;
      if (!needsCover && !isDamaged && !missingIsbn) return false;
    }

    if (statusFilter !== 'ALL' && b.reading_status !== statusFilter) return false;
    if (genreFilter !== 'ALL' && b.genre !== genreFilter) return false;
    if (conditionFilter !== 'ALL' && b.condition !== conditionFilter) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      (b.authors && b.authors.toLowerCase().includes(q)) ||
      (b.genre && b.genre.toLowerCase().includes(q)) ||
      b.book_id.toLowerCase().includes(q) ||
      (b.location && b.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors duration-200 pb-16">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-rule dark:border-rule-dark bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-2.5">
            <BookOpen className="text-accent dark:text-accent-dark h-6 w-6 shrink-0" />
            <div>
              <h1 className="font-serif text-xl font-medium tracking-tight">Ondorpata / Molat</h1>
              <p className="text-3xs text-ink-muted dark:text-ink-dark-muted hidden sm:block">
                Personal Physical Book Library • Google Sheets Persistence
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1 bg-surface dark:bg-surface-dark p-1 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium">
            <button
              onClick={() => setActiveTab('shelf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'shelf'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <Library size={14} />
              <span>Bookshelf</span>
            </button>
            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'tracker'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <Flame size={14} className="text-accent" />
              <span>Reading Streak</span>
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'wishlist'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <ShoppingBag size={14} />
              <span>Wishlist</span>
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'maintenance'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <Wrench size={14} />
              <span>Audit</span>
            </button>
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setScannerOpen(true)}
              className="p-2 rounded-lg border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink transition-colors"
              title="Scan ISBN Barcode / Add Volume"
            >
              <Camera size={17} />
            </button>
            <button
              onClick={() => setKeyModalOpen(true)}
              className="p-2 rounded-lg border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink transition-colors"
              title="X-Library-Key & Tools"
            >
              <KeyRound size={17} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink transition-colors"
              title="Toggle Dark/Light Mode"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => loadAllData()}
              disabled={loading}
              className="p-2 rounded-lg border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink transition-colors"
              title="Refresh from Google Sheets"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex border-t border-rule/60 dark:border-rule-dark/60 bg-surface/50 dark:bg-surface-dark/50 px-2 py-1.5 gap-1">
          <button
            onClick={() => setActiveTab('shelf')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center ${
              activeTab === 'shelf'
                ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark font-semibold'
                : 'text-ink-secondary'
            }`}
          >
            Shelf
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center ${
              activeTab === 'tracker'
                ? 'bg-canvas dark:bg-canvas-dark text-accent dark:text-accent-dark font-semibold'
                : 'text-ink-secondary'
            }`}
          >
            Streak
          </button>
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center ${
              activeTab === 'wishlist'
                ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark font-semibold'
                : 'text-ink-secondary'
            }`}
          >
            Wishlist
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center ${
              activeTab === 'maintenance'
                ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark font-semibold'
                : 'text-ink-secondary'
            }`}
          >
            Audit
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* VIEW TAB: READING TRACKER & HEATMAP */}
        {activeTab === 'tracker' && <HeatmapScreen />}

        {/* VIEW TAB: WISHLIST */}
        {activeTab === 'wishlist' && <WishlistScreen />}

        {/* VIEW TAB: BOOKSHELF OR MAINTENANCE AUDIT */}
        {(activeTab === 'shelf' || activeTab === 'maintenance') && (
          <div className="space-y-6">
            {/* Top Streak & Goal Banner (on Shelf) */}
            {activeTab === 'shelf' && <StreakBanner />}

            {/* Currently Reading Active Card */}
            {activeTab === 'shelf' && <ActiveReadingCard />}

            {/* Portfolio Savings KPI Strip */}
            {portfolio && (
              <section
                aria-label="Portfolio Summary"
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
                  <span className="text-3xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">
                    Total Volumes
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 tabular-nums">
                    {portfolio.total_books}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
                  <span className="text-3xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">
                    Total Cost (CP)
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 tabular-nums">
                    ₹{portfolio.total_cp.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
                  <span className="text-3xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">
                    Retail MRP (RP)
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 tabular-nums">
                    ₹{portfolio.total_rp.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-accent-subtle dark:bg-accent-dark-subtle border-accent/20 dark:border-accent-dark/30">
                  <span className="text-3xs uppercase tracking-wider text-accent dark:text-accent-dark font-medium">
                    Saved ({portfolio.discount_pct}%)
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 text-accent dark:text-accent-dark tabular-nums">
                    ₹{portfolio.total_saved.toLocaleString('en-IN')}
                  </p>
                </div>
              </section>
            )}

            {/* Maintenance Audit Banner if on maintenance tab */}
            {activeTab === 'maintenance' && (
              <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="text-accent h-5 w-5" />
                    <h2 className="font-serif text-lg font-medium">Catalogue Health & Audit</h2>
                  </div>
                  <button
                    onClick={() => setKeyModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium"
                  >
                    <Sparkles size={13} />
                    <span>Run Cover Enrichment</span>
                  </button>
                </div>
                <p className="text-xs text-ink-secondary">
                  Showing books requiring curation: missing covers (eligible for Google Books/Apple Books enrichment), Damaged physical condition, or missing ISBN codes.
                </p>
              </div>
            )}

            {/* Search & Multi-Facet Filtering Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search 55+ volumes by title, author, genre, shelf location..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-surface dark:bg-surface-dark p-1 rounded-xl border border-rule dark:border-rule-dark self-start sm:self-auto">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-canvas dark:bg-canvas-dark text-accent shadow-xs'
                        : 'text-ink-secondary hover:text-ink'
                    }`}
                    title="Cover Grid View (2:3 aspect)"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('spine')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'spine'
                        ? 'bg-canvas dark:bg-canvas-dark text-accent shadow-xs'
                        : 'text-ink-secondary hover:text-ink'
                    }`}
                    title="Tactile Spine Shelf View"
                  >
                    <Library size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'table'
                        ? 'bg-canvas dark:bg-canvas-dark text-accent shadow-xs'
                        : 'text-ink-secondary hover:text-ink'
                    }`}
                    title="Financial Table View"
                  >
                    <Table size={16} />
                  </button>
                </div>
              </div>

              {/* Facet Filters */}
              <div className="flex flex-wrap items-center gap-2 text-2xs">
                {/* Reading Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNREAD">Unread</option>
                  <option value="READING">Reading</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PAUSED">Paused</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>

                {/* Genre Filter */}
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                >
                  <option value="ALL">All Genres</option>
                  {allGenres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>

                {/* Condition Filter */}
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                >
                  <option value="ALL">All Conditions</option>
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                </select>

                {(search || statusFilter !== 'ALL' || genreFilter !== 'ALL' || conditionFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('ALL');
                      setGenreFilter('ALL');
                      setConditionFilter('ALL');
                    }}
                    className="px-2 py-1 rounded text-ink-muted hover:text-accent underline transition-colors"
                  >
                    Reset filters
                  </button>
                )}

                <span className="ml-auto text-ink-muted">
                  Showing {filteredBooks.length} of {books.length} volumes
                </span>
              </div>
            </div>

            {/* Collection View Renderers */}
            {loading && books.length === 0 ? (
              <div className="py-20 text-center text-ink-muted animate-pulse">
                Loading library catalogue from Google Sheets...
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="py-16 text-center text-ink-muted space-y-1">
                <p>No books match your active filters.</p>
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setGenreFilter('ALL');
                    setConditionFilter('ALL');
                  }}
                  className="text-xs text-accent underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : viewMode === 'spine' ? (
              <SpineView books={filteredBooks} />
            ) : viewMode === 'table' ? (
              <FinancialTable books={filteredBooks} portfolio={portfolio} />
            ) : (
              /* Default Grid View */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {filteredBooks.map((book) => (
                  <article
                    key={book.book_id}
                    onClick={() => setSelectedBook(book)}
                    className="group flex flex-col gap-2 p-2 rounded-xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark hover:border-accent/40 dark:hover:border-accent-dark/40 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    {/* Cover Container */}
                    <BookCover
                      title={book.title}
                      authors={book.authors}
                      coverUrl={book.cover_url}
                      readingStatus={book.reading_status}
                    />

                    {/* Metadata Card Footer */}
                    <div className="space-y-0.5">
                      <h3 className="font-serif text-xs font-medium line-clamp-2 leading-tight group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-3xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                        {book.authors || 'Unknown author'}
                      </p>
                      <div className="flex items-center justify-between text-3xs pt-1 text-ink-muted">
                        <span className="truncate max-w-[80px]">{book.genre || 'General'}</span>
                        {book.purchase_price !== undefined && (
                          <span className="font-mono font-medium text-ink dark:text-ink-dark tabular-nums">
                            ₹{book.purchase_price}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <BookDetailDrawer />
      <QuickLogModal />
      <BarcodeScannerModal />
      <KeySettingsModal />
    </div>
  );
}
