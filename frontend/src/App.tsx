import React, { useEffect, useState } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import {
  Home,
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
  Plus,
  ChevronRight,
  ArrowRight,
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
    openQuickLog,
    setScannerOpen,
    setKeyModalOpen,
    loadAllData,
    authToken,
    theme,
    toggleTheme,
  } = useLibraryStore();

  const [centerMenuOpen, setCenterMenuOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Extract unique genres for filter dropdown
  const allGenres = Array.from(new Set(books.map((b) => b.genre).filter(Boolean))) as string[];

  // Filter books based on search and facet filters
  const filteredBooks = books.filter((b) => {
    if (activeTab === 'maintenance') {
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

  const readingBooks = books.filter((b) => b.reading_status === 'READING');

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors duration-200 pb-24 md:pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-rule dark:border-rule-dark bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab('home')}
          >
            <BookOpen className="text-accent dark:text-accent-dark h-6 w-6 shrink-0" />
            <div>
              <h1 className="font-serif text-xl font-medium tracking-tight">Ondorpata / Molat</h1>
              <p className="text-3xs text-ink-muted dark:text-ink-dark-muted hidden sm:block">
                Personal Physical Book Library • Google Sheets Persistence
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Rail/Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-surface dark:bg-surface-dark p-1 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                activeTab === 'home'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs font-semibold'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <Home size={14} />
              <span>Home</span>
            </button>
            <button
              onClick={() => setActiveTab('shelf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                activeTab === 'shelf'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs font-semibold'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <Library size={14} />
              <span>Bookshelf</span>
            </button>
            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                activeTab === 'tracker'
                  ? 'bg-canvas dark:bg-canvas-dark text-accent dark:text-accent-dark shadow-xs font-semibold'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <Flame size={14} className="text-accent" />
              <span>Reading Streak</span>
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                activeTab === 'wishlist'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs font-semibold'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <ShoppingBag size={14} />
              <span>Wishlist</span>
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                activeTab === 'maintenance'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs font-semibold'
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
              className="p-2.5 rounded-xl border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Scan ISBN Barcode / Add Volume"
              aria-label="Scan ISBN Barcode"
            >
              <Camera size={18} />
            </button>
            <button
              onClick={() => setKeyModalOpen(true)}
              className={`p-2.5 rounded-xl border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center relative ${
                authToken ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-ink-secondary hover:text-ink'
              }`}
              title={authToken ? "Signed in as Owner" : "Owner Sign In"}
              aria-label="Owner Authentication"
            >
              <KeyRound size={18} />
              {authToken && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Toggle Dark/Light Mode"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => loadAllData()}
              disabled={loading}
              className="p-2.5 rounded-xl border border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Refresh from Google Sheets"
              aria-label="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container across all 6 viewports */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-5 sm:py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 1. HOME / COMMAND DASHBOARD */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Top Streak & Daily Goal Banner */}
            <StreakBanner />

            {/* Currently Reading Active Card */}
            <ActiveReadingCard />

            {/* Portfolio Savings KPI Strip */}
            {portfolio && (
              <section
                aria-label="Portfolio Summary"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3"
              >
                <div className="p-3.5 sm:p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
                  <span className="text-3xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">
                    Total Volumes
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 tabular-nums">
                    {portfolio.total_books}
                  </p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
                  <span className="text-3xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">
                    Total Cost (CP)
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 tabular-nums">
                    ₹{portfolio.total_cp.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
                  <span className="text-3xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">
                    Retail MRP (RP)
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 tabular-nums">
                    ₹{portfolio.total_rp.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-xl border border-rule dark:border-rule-dark bg-accent-subtle dark:bg-accent-dark-subtle border-accent/20 dark:border-accent-dark/30">
                  <span className="text-3xs uppercase tracking-wider text-accent dark:text-accent-dark font-medium">
                    Saved ({portfolio.discount_pct}%)
                  </span>
                  <p className="text-2xl font-serif font-medium mt-1 text-accent dark:text-accent-dark tabular-nums">
                    ₹{portfolio.total_saved.toLocaleString('en-IN')}
                  </p>
                </div>
              </section>
            )}

            {/* Quick Link to Visual Bookshelf */}
            <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <h3 className="font-serif text-base font-medium">
                  Explore Your Physical Collection
                </h3>
                <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
                  Browse {books.length} physical volumes across Cover Grid, Tactile Wooden Spine Shelf, or Compact Financial Table.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('shelf')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark transition-colors self-start sm:self-auto min-h-[44px]"
              >
                <span>Open Bookshelf</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* 2. READING TRACKER & HEATMAP */}
        {activeTab === 'tracker' && <HeatmapScreen />}

        {/* 3. WISHLIST ACQUISITION BOARD */}
        {activeTab === 'wishlist' && <WishlistScreen />}

        {/* 4. VISUAL BOOKSHELF OR MAINTENANCE AUDIT */}
        {(activeTab === 'shelf' || activeTab === 'maintenance') && (
          <div className="space-y-5">
            {/* Maintenance Audit Banner */}
            {activeTab === 'maintenance' && (
              <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="text-accent h-5 w-5" />
                    <h2 className="font-serif text-lg font-medium">Catalogue Health & Audit</h2>
                  </div>
                  <button
                    onClick={() => setKeyModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-white text-xs font-medium min-h-[44px]"
                  >
                    <Sparkles size={14} />
                    <span>Run Cover Enrichment</span>
                  </button>
                </div>
                <p className="text-xs text-ink-secondary">
                  Showing volumes requiring attention: missing cover art, damaged physical condition, or missing ISBN identification.
                </p>
              </div>
            )}

            {/* Search Bar & Multi-Facet Filtering Bar */}
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
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent min-h-[44px]"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-surface dark:bg-surface-dark p-1 rounded-xl border border-rule dark:border-rule-dark self-start sm:self-auto min-h-[44px]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
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
                    className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
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
                    className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
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
                  className="px-3 py-2 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent min-h-[44px]"
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
                  className="px-3 py-2 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent min-h-[44px]"
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
                  className="px-3 py-2 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent min-h-[44px]"
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
                    className="px-2 py-2 rounded text-ink-muted hover:text-accent underline transition-colors min-h-[44px] flex items-center"
                  >
                    Reset filters
                  </button>
                )}

                <span className="ml-auto text-ink-muted py-2">
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
              <div className="py-16 text-center text-ink-muted space-y-2">
                <p>No books match your active search or filters.</p>
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
              /* Cover Grid View across 6 viewports:
                 Small Mobile: 2-col (gap-2.5)
                 Typical Mobile: 2-col (gap-3)
                 Tablet Portrait: 4-col
                 Small Laptop: 5-col
                 Laptop: 6-col
                 Wide Desktop: 7-col
              */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3.5">
                {filteredBooks.map((book) => (
                  <article
                    key={book.book_id}
                    onClick={() => setSelectedBook(book)}
                    className="group flex flex-col gap-2 p-2 rounded-xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark hover:border-accent/40 dark:hover:border-accent-dark/40 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    {/* Cover Container (strict 2:3 aspect) */}
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

      {/* Center Action Popup on Mobile */}
      {centerMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setCenterMenuOpen(false)}
        >
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-2xl shadow-2xl p-2 space-y-1 animate-in slide-in-from-bottom duration-150">
            <button
              onClick={() => {
                setCenterMenuOpen(false);
                openQuickLog();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium text-ink dark:text-ink-dark text-left transition-colors min-h-[44px]"
            >
              <BookOpen size={16} className="text-accent" />
              <span>Log Reading Session</span>
            </button>
            <button
              onClick={() => {
                setCenterMenuOpen(false);
                setScannerOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium text-ink dark:text-ink-dark text-left transition-colors min-h-[44px]"
            >
              <Camera size={16} className="text-accent" />
              <span>Scan ISBN Barcode</span>
            </button>
          </div>
        </div>
      )}

      {/* Thumb-Zone Sticky Mobile Bottom Navigation Bar (h-16, pb-[env(safe-area-inset-bottom)], <768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-canvas/95 dark:bg-canvas-dark/95 border-t border-rule dark:border-rule-dark backdrop-blur-md pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-2"
      >
        {/* 1. Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
            activeTab === 'home'
              ? 'text-accent dark:text-accent-dark font-semibold'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <Home size={19} />
          <span className="text-3xs mt-1">Home</span>
        </button>

        {/* 2. Shelf */}
        <button
          onClick={() => setActiveTab('shelf')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
            activeTab === 'shelf'
              ? 'text-accent dark:text-accent-dark font-semibold'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <Library size={19} />
          <span className="text-3xs mt-1">Shelf</span>
        </button>

        {/* 3. Center Elevated Action Button (+ Scan/Log) */}
        <div className="relative -top-3">
          <button
            onClick={() => setCenterMenuOpen(!centerMenuOpen)}
            className="w-12 h-12 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-all"
            aria-label="Create or scan"
          >
            <Plus size={22} className={`transition-transform duration-200 ${centerMenuOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>

        {/* 4. Streak */}
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
            activeTab === 'tracker'
              ? 'text-accent dark:text-accent-dark font-semibold'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <Flame size={19} />
          <span className="text-3xs mt-1">Streak</span>
        </button>

        {/* 5. Maintenance / Audit */}
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
            activeTab === 'maintenance'
              ? 'text-accent dark:text-accent-dark font-semibold'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <Wrench size={19} />
          <span className="text-3xs mt-1">Audit</span>
        </button>
      </nav>

      {/* Global Modals & Drawers */}
      <BookDetailDrawer />
      <QuickLogModal />
      <BarcodeScannerModal />
      <KeySettingsModal />
    </div>
  );
}
