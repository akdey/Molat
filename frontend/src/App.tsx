import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  MoreVertical,
  PieChart,
  X,
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
import { ToastContainer } from './components/ToastContainer';
import { GenreFilterPopover } from './components/GenreFilterPopover';
import { LibraryInsights } from './components/LibraryInsights';
import { HomeDashboard } from './components/HomeDashboard';

export default function App() {
  const {
    books,
    portfolio,
    streakSummary,
    loading,
    refreshing,
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
    selectedGenres,
    toggleGenre,
    clearSelectedGenres,
    conditionFilter,
    setConditionFilter,
    setSelectedBook,
    openQuickLog,
    setScannerOpen,
    setKeyModalOpen,
    loadAllData,
    authToken,
    authUser,
    theme,
    toggleTheme,
  } = useLibraryStore();

  const [centerMenuOpen, setCenterMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Per-tab scroll position memory (native mobile & desktop standard)
  const scrollPositions = useRef<Record<string, number>>({});

  const switchTab = (newTab: typeof activeTab) => {
    if (newTab === activeTab) {
      // Tap on active tab: smoothly scroll back to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCenterMenuOpen(false);
      return;
    }
    // Record current scroll position before switching away
    scrollPositions.current[activeTab] = window.scrollY;
    setCenterMenuOpen(false);
    setActiveTab(newTab);
  };

  useEffect(() => {
    // When activeTab changes, restore that tab's saved scroll position (defaulting to 0)
    const targetY = scrollPositions.current[activeTab] ?? 0;
    window.scrollTo({ top: targetY, behavior: 'instant' });
    const timer = setTimeout(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }, 20);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Extract unique individual genres for filter dropdown
  const allGenres = Array.from(
    new Set(
      books
        .flatMap((b) => (b.genre ? b.genre.split(',') : []))
        .map((g) => g.trim())
        .filter((g) => g.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Filter books based on search and facet filters
  const filteredBooks = books.filter((b) => {
    if (activeTab === 'maintenance') {
      const needsCover = !b.cover_url;
      const isDamaged = b.condition === 'Damaged';
      const missingIsbn = !b.isbn_13 && !b.isbn_10;
      if (!needsCover && !isDamaged && !missingIsbn) return false;
    }

    if (statusFilter !== 'ALL' && b.reading_status !== statusFilter) return false;
    if (selectedGenres.length > 0) {
      const bookGenres = (b.genre || '')
        .split(',')
        .map((g) => g.trim().toLowerCase());
      const hasMatch = selectedGenres.some((sg) =>
        bookGenres.includes(sg.toLowerCase())
      );
      if (!hasMatch) return false;
    } else if (genreFilter !== 'ALL') {
      const bookGenres = (b.genre || '')
        .split(',')
        .map((g) => g.trim().toLowerCase());
      if (!bookGenres.includes(genreFilter.toLowerCase())) return false;
    }
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
    <div className="min-h-screen min-h-dvh w-full max-w-full overflow-x-hidden bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors duration-200 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-rule dark:border-rule-dark bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => switchTab('home')}
          >
            <BookOpen className="text-accent dark:text-accent-dark h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <div>
              <h1 className="font-serif text-lg sm:text-xl font-medium tracking-tight">Molat</h1>
              <p className="text-3xs text-ink-muted dark:text-ink-dark-muted hidden sm:block">
                Personal Physical Book Library • Google Sheets Persistence
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Rail/Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-surface dark:bg-surface-dark p-1 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium">
            <button
              onClick={() => switchTab('home')}
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
              onClick={() => switchTab('shelf')}
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
              onClick={() => switchTab('insights')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                activeTab === 'insights'
                  ? 'bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark shadow-xs font-semibold'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <PieChart size={14} />
              <span>Insights</span>
            </button>
            <button
              onClick={() => switchTab('tracker')}
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
              onClick={() => switchTab('wishlist')}
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
              onClick={() => switchTab('maintenance')}
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

          {/* Action Tools — Clean & Decluttered */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Sync button with Sheets (accessible with 1 tap, spins when refreshing) */}
            <button
              onClick={() => loadAllData(true)}
              disabled={loading || refreshing}
              className="p-2 rounded-xl text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark transition-colors relative"
              title="Force Refresh from Google Sheets"
              aria-label="Refresh Data"
            >
              <RefreshCw
                size={16}
                className={loading || refreshing ? 'animate-spin text-accent dark:text-accent-dark' : ''}
              />
            </button>

            {/* Desktop Only: Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex p-2 rounded-xl text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              title="Toggle Dark/Light Mode"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Desktop Only: Owner Authentication Pill */}
            <button
              onClick={() => setKeyModalOpen(true)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                authToken
                  ? 'border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                  : 'border-rule dark:border-rule-dark hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink'
              }`}
              title={authToken ? `Signed in as ${authUser || 'Owner'}` : 'Owner Sign In'}
              aria-label="Owner Authentication"
            >
              <KeyRound size={13} />
              <span>{authToken ? authUser || 'Owner' : 'Sign In'}</span>
            </button>

            {/* Mobile Overflow Menu (replaces the 4 cluttered buttons on mobile) */}
            <div className="md:hidden relative">
              <button
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                className={`p-2 rounded-xl border transition-colors relative ${
                  authToken
                    ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    : 'border-rule dark:border-rule-dark text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark'
                }`}
                title="Settings & Tools"
                aria-label="Open Settings Menu"
              >
                <MoreVertical size={16} />
                {authToken && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>

              {/* Mobile Popover Menu with macOS Spring */}
              <AnimatePresence>
                {headerMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
                      onClick={() => setHeaderMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      className="absolute right-0 top-11 z-50 w-52 p-1.5 rounded-2xl bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark shadow-xl space-y-0.5"
                    >
                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setKeyModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium transition-colors text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <KeyRound size={14} className={authToken ? 'text-emerald-600' : 'text-ink-muted'} />
                        <span>{authToken ? 'Owner Account' : 'Sign In as Owner'}</span>
                      </span>
                      {authToken && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setScannerOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium transition-colors text-left"
                    >
                      <Camera size={14} className="text-accent dark:text-accent-dark" />
                      <span>Scan ISBN Barcode</span>
                    </button>

                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        switchTab('wishlist');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium transition-colors text-left"
                    >
                      <ShoppingBag size={14} className="text-accent dark:text-accent-dark" />
                      <span>Acquisitions Wishlist</span>
                    </button>

                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        switchTab('insights');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium transition-colors text-left"
                    >
                      <PieChart size={14} className="text-accent dark:text-accent-dark" />
                      <span>Library Insights</span>
                    </button>

                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        switchTab('maintenance');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium transition-colors text-left"
                    >
                      <Wrench size={14} className="text-ink-muted" />
                      <span>Catalogue Health Audit</span>
                    </button>

                    <button
                      onClick={() => {
                        toggleTheme();
                        setHeaderMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium transition-colors text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        <span>Appearance</span>
                      </span>
                      <span className="text-3xs text-ink-muted capitalize font-normal">{theme}</span>
                    </button>

                    <button
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        loadAllData(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-xs font-medium transition-colors text-left text-accent dark:text-accent-dark border-t border-rule/50 dark:border-rule-dark/50 pt-2 mt-1"
                    >
                      <RefreshCw size={13} className={loading || refreshing ? 'animate-spin' : ''} />
                      <span>Sync with Google Sheets</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container across all 6 viewports */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 pb-0 md:pb-6 space-y-6 flex-1 flex flex-col w-full">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Animated View Transitions across Main Tabs */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="space-y-6 flex-1 flex flex-col"
          >
            {/* 1. HOME / COMMAND DASHBOARD */}
            {activeTab === 'home' && (
              <HomeDashboard
                books={books}
                streakSummary={streakSummary}
                openQuickLog={openQuickLog}
                setSelectedBook={setSelectedBook}
                setActiveTab={switchTab}
              />
            )}

            {/* 2. LIBRARY INSIGHTS & ANALYTICS */}
            {activeTab === 'insights' && (
              <LibraryInsights
                books={books}
                portfolio={portfolio}
                streakSummary={streakSummary}
              />
            )}

            {/* 3. READING TRACKER & HEATMAP */}
            {activeTab === 'tracker' && <HeatmapScreen />}

            {/* 4. WISHLIST ACQUISITION BOARD */}
            {activeTab === 'wishlist' && <WishlistScreen />}

            {/* 5. VISUAL BOOKSHELF OR MAINTENANCE AUDIT */}
            {(activeTab === 'shelf' || activeTab === 'maintenance') && (
          <div className="space-y-5 flex-1 flex flex-col">
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={books.length > 0 ? `Search ${books.length} volumes...` : "Search collection..."}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent h-10"
                  />
                </div>

                {/* View Mode Toggle with macOS Segmented Indicator */}
                <div className="shrink-0 flex items-center gap-0.5 bg-surface dark:bg-surface-dark p-0.5 rounded-xl border border-rule dark:border-rule-dark h-10">
                  {(['grid', 'spine', 'table'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`relative p-1.5 rounded-lg w-8 h-8 flex items-center justify-center transition-colors ${
                        viewMode === mode
                          ? 'text-accent dark:text-accent-dark font-medium'
                          : 'text-ink-secondary hover:text-ink'
                      }`}
                      title={
                        mode === 'grid'
                          ? 'Cover Grid View (2:3 aspect)'
                          : mode === 'spine'
                          ? 'Tactile Spine Shelf View'
                          : 'Catalog List View'
                      }
                    >
                      {viewMode === mode && (
                        <motion.span
                          layoutId="activeViewModePill"
                          className="absolute inset-0 bg-canvas dark:bg-canvas-dark rounded-lg shadow-xs"
                          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        />
                      )}
                      <span className="relative z-10">
                        {mode === 'grid' && <LayoutGrid size={15} />}
                        {mode === 'spine' && <Library size={15} />}
                        {mode === 'table' && <Table size={15} />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Facet Filters */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                  {/* Reading Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto text-xs py-1.5 px-2.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent truncate cursor-pointer min-h-[36px]"
                    title="Filter by Reading Status"
                  >
                    <option value="ALL">All Status</option>
                    <option value="UNREAD">Unread</option>
                    <option value="READING">Reading</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PAUSED">Paused</option>
                    <option value="ABANDONED">Abandoned</option>
                  </select>

                  {/* Genre Filter Popover with Multi-Select Checkboxes */}
                  <GenreFilterPopover allGenres={allGenres} books={books} />

                  {(search || statusFilter !== 'ALL' || genreFilter !== 'ALL' || selectedGenres.length > 0 || conditionFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('ALL');
                        setGenreFilter('ALL');
                        clearSelectedGenres();
                        setConditionFilter('ALL');
                      }}
                      className="col-span-2 sm:col-auto px-2 py-1 text-2xs text-ink-muted hover:text-accent underline transition-colors self-center cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                {/* Selected Genre Pill Badges */}
                {selectedGenres.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-3xs text-ink-muted font-medium">Filtering by:</span>
                    {selectedGenres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent-dark hover:bg-accent/20 border border-accent/20 transition-colors cursor-pointer"
                        title="Click to remove"
                      >
                        <span>{genre}</span>
                        <X size={10} />
                      </button>
                    ))}
                    <button
                      onClick={clearSelectedGenres}
                      className="text-3xs text-ink-muted hover:text-accent underline ml-1 cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                </div>

                <div className="flex items-center justify-between text-2xs text-ink-muted px-0.5">
                  <span>Showing {filteredBooks.length} of {books.length} volumes</span>
                  {(loading || refreshing) && (
                    <span className="inline-flex items-center gap-1 text-accent dark:text-accent-dark animate-pulse font-medium">
                      <RefreshCw size={11} className="animate-spin" />
                      Syncing with Sheets...
                    </span>
                  )}
                </div>
              </div>

            {/* Collection View Renderers */}
            {loading && books.length === 0 ? (
              <div className="space-y-4 py-8">
                <div className="flex items-center justify-center gap-2 text-xs text-ink-muted animate-pulse">
                  <RefreshCw size={14} className="animate-spin text-accent" />
                  <span>Loading library catalogue from Google Sheets...</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] rounded-xl bg-rule/30 dark:bg-rule-dark/30 animate-pulse border border-rule/50 dark:border-rule-dark/50"
                    />
                  ))}
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="py-16 flex-1 flex flex-col items-center justify-center text-center text-ink-muted space-y-2">
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
                  <motion.article
                    key={book.book_id}
                    onClick={() => setSelectedBook(book)}
                    whileHover={{ y: -4, scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                    className="group flex flex-col gap-2 p-2 rounded-xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark hover:border-accent/40 dark:hover:border-accent-dark/40 transition-colors cursor-pointer shadow-2xs hover:shadow-md"
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
                      <div className="flex items-center justify-between gap-1 text-3xs pt-1 text-ink-muted">
                        <div className="flex flex-wrap items-center gap-1 overflow-hidden max-h-5 min-w-0">
                          {book.genre ? (
                            book.genre
                              .split(',')
                              .map((g) => g.trim())
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((g, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-rule/50 dark:border-rule-dark/50 text-3xs font-medium text-ink-secondary dark:text-ink-dark-secondary truncate max-w-[85px]"
                                >
                                  {g}
                                </span>
                              ))
                          ) : (
                            <span className="truncate max-w-[80px]">General</span>
                          )}
                          {book.genre &&
                            book.genre
                              .split(',')
                              .map((g) => g.trim())
                              .filter(Boolean).length > 2 && (
                              <span className="text-3xs text-ink-muted font-mono font-medium">
                                +{book.genre.split(',').map((g) => g.trim()).filter(Boolean).length - 2}
                              </span>
                            )}
                        </div>
                        {book.publication_year ? (
                          <span className="font-mono text-3xs text-ink-muted tabular-nums shrink-0 ml-1">
                            {book.publication_year}
                          </span>
                        ) : book.location ? (
                          <span className="text-3xs text-ink-muted truncate shrink-0 ml-1 max-w-[65px]" title={book.location}>
                            {book.location}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        )}
          </motion.div>
        </AnimatePresence>

        {/* Subtle Brand & Creator Footer */}
        <footer className="mt-auto pt-3 md:pt-6 pb-[calc(4rem+10px+env(safe-area-inset-bottom,0px))] md:pb-6 text-center border-t border-rule/50 dark:border-rule-dark/50">
          <p className="text-3xs text-ink-muted">
            Molat Personal Library &bull; Engineered by{' '}
            <a
              href="https://portfolio.akdey.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink dark:text-ink-dark font-medium underline decoration-accent/60 underline-offset-2 hover:text-accent transition-colors"
            >
              AMIT KUMAR DEY
            </a>
          </p>
        </footer>
      </main>

      {/* Center Action Bottom Drawer on Mobile */}
      <AnimatePresence>
        {centerMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setCenterMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{ paddingBottom: 'calc(5.75rem + env(safe-area-inset-bottom, 0px))' }}
              className="relative z-10 w-full bg-canvas dark:bg-canvas-dark border-t border-rule dark:border-rule-dark rounded-t-3xl shadow-2xl p-4 space-y-2.5"
            >
              <div className="w-10 h-1 bg-ink-muted/30 rounded-full mx-auto mb-1" />
              <div className="flex items-center justify-between pb-1 px-1">
                <div className="w-6" />
                <div className="text-center font-serif text-sm font-medium">
                  Library Actions
                </div>
                <button
                  onClick={() => setCenterMenuOpen(false)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink transition-colors"
                  aria-label="Close actions"
                >
                  <X size={16} />
                </button>
              </div>
              <button
                onClick={() => {
                  setCenterMenuOpen(false);
                  openQuickLog();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 text-xs font-medium text-ink dark:text-ink-dark text-left transition-colors hover:bg-surface-raised dark:hover:bg-surface-dark-raised active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="font-medium text-ink dark:text-ink-dark">Log Reading Session</div>
                  <div className="text-3xs text-ink-muted">Track pages read, session duration & streak</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setCenterMenuOpen(false);
                  setScannerOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 text-xs font-medium text-ink dark:text-ink-dark text-left transition-colors hover:bg-surface-raised dark:hover:bg-surface-dark-raised active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Camera size={18} />
                </div>
                <div>
                  <div className="font-medium text-ink dark:text-ink-dark">Scan ISBN Barcode</div>
                  <div className="text-3xs text-ink-muted">Scan barcode with camera or auto-fetch by ISBN</div>
                </div>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Thumb-Zone Sticky Mobile Bottom Navigation Bar (h-16, pb-[env(safe-area-inset-bottom)], <768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-canvas/95 dark:bg-canvas-dark/95 border-t border-rule dark:border-rule-dark backdrop-blur-md pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-2"
      >
        {/* 1. Home */}
        <button
          onClick={() => switchTab('home')}
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
          onClick={() => switchTab('shelf')}
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
          onClick={() => switchTab('tracker')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
            activeTab === 'tracker'
              ? 'text-accent dark:text-accent-dark font-semibold'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <Flame size={19} />
          <span className="text-3xs mt-1">Streak</span>
        </button>

        {/* 5. Wishlist */}
        <button
          onClick={() => switchTab('wishlist')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-colors ${
            activeTab === 'wishlist'
              ? 'text-accent dark:text-accent-dark font-semibold'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <ShoppingBag size={19} />
          <span className="text-3xs mt-1">Wishlist</span>
        </button>
      </nav>

      {/* Global Modals & Drawers */}
      <BookDetailDrawer />
      <QuickLogModal />
      <BarcodeScannerModal />
      <KeySettingsModal />
      <ToastContainer />
    </div>
  );
}
