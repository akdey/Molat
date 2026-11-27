import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  LayoutGrid,
  Library,
  Table,
  ArrowUpDown,
  SlidersHorizontal,
  Wrench,
  Sparkles,
  Users,
  X,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { useLibraryStore, ShelfSortOption } from '../store/useLibraryStore';
import { updateAlcoveBookHolder } from '../api/client';
import type { AlcoveBookItem, Book } from '../types/book';
import { BookCover } from '../components/BookCover';
import { SpineView } from '../components/SpineView';
import { FinancialTable } from '../components/FinancialTable';
import { GenreFilterPopover } from '../components/GenreFilterPopover';
import { PageSkeletonLoader } from '../components/PageSkeletonLoader';
import { InlineSpinner } from '../components/InlineSpinner';

interface ShelfScreenProps {
  onSelectAlcoveBook: (book: AlcoveBookItem) => void;
}

export const ShelfScreen: React.FC<ShelfScreenProps> = ({ onSelectAlcoveBook }) => {
  const {
    books,
    portfolio,
    loading,
    refreshing,
    activeTab,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
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
    triggerCoverEnrichment,
    setScannerOpen,
    alcoveOverview,
    shelfScope,
    setShelfScope,
    loadAlcoves,
    addToast,
    authUser,
  } = useLibraryStore();

  const [enrichingCovers, setEnrichingCovers] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    genreFilter !== 'ALL' ||
    selectedGenres.length > 0 ||
    conditionFilter !== 'ALL';

  const allGenres = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .flatMap((b) => (b.genre ? b.genre.split(',') : []))
            .map((g) => g.trim())
            .filter((g) => g.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [books]
  );

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
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
  }, [books, activeTab, statusFilter, selectedGenres, genreFilter, conditionFilter, search]);

  const sortedBooks = useMemo(() => {
    const list = [...filteredBooks];
    switch (sortBy) {
      case 'title_asc':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'title_desc':
        return list.sort((a, b) => b.title.localeCompare(a.title));
      case 'author_asc':
        return list.sort((a, b) => (a.authors || '').localeCompare(b.authors || ''));
      case 'recent':
        return list.sort((a, b) => {
          const keyA = a.created_at || a.book_id;
          const keyB = b.created_at || b.book_id;
          return keyB.localeCompare(keyA, undefined, { numeric: true });
        });
      case 'rating_desc':
        return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'pub_year_desc':
        return list.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
      case 'pub_year_asc':
        return list.sort((a, b) => (a.publication_year || 9999) - (b.publication_year || 9999));
      case 'default':
      default:
        return list;
    }
  }, [filteredBooks, sortBy]);

  const resetAllFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setGenreFilter('ALL');
    clearSelectedGenres();
    setConditionFilter('ALL');
    setSortBy('default');
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      {/* Maintenance Audit Banner */}
      {activeTab === 'maintenance' && (
        <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="text-accent dark:text-accent-dark h-5 w-5" />
              <h2 className="font-serif text-lg font-medium">Needs Attention (Audit)</h2>
            </div>
            <button
              type="button"
              onClick={async () => {
                setEnrichingCovers(true);
                try {
                  await triggerCoverEnrichment();
                } finally {
                  setEnrichingCovers(false);
                }
              }}
              disabled={enrichingCovers}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-60 transition-all active:scale-[0.97] shadow-xs"
            >
              {enrichingCovers ? <InlineSpinner /> : <Sparkles size={14} />}
              <span>{enrichingCovers ? 'Enriching Jackets...' : 'Enrich Missing Covers'}</span>
            </button>
          </div>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
            Showing volumes requiring attention: missing cover art, damaged physical condition, or missing ISBN identification.
          </p>
        </div>
      )}

      {/* Family Alcove vs Personal Shelf Minimal Switcher */}
      {activeTab === 'shelf' && alcoveOverview && alcoveOverview.alcoves.length > 0 && (
        <div className="flex items-center gap-4 border-b border-rule/60 dark:border-rule-dark/60 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setShelfScope('mine')}
            className={`pb-1 transition-colors cursor-pointer relative ${
              shelfScope === 'mine'
                ? 'text-accent dark:text-accent-dark font-semibold'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            My Shelf ({books.length})
            {shelfScope === 'mine' && (
              <span className="absolute inset-x-0 -bottom-2 h-0.5 bg-accent dark:bg-accent-dark rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShelfScope('alcove')}
            title={alcoveOverview.alcoves[0].name}
            className={`inline-flex items-center gap-1.5 pb-1 transition-colors cursor-pointer relative ${
              shelfScope === 'alcove'
                ? 'text-accent dark:text-accent-dark font-semibold'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Users size={13} className="shrink-0" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              Alcove ({alcoveOverview.shared_books.length})
            </span>
            {shelfScope === 'alcove' && (
              <span className="absolute inset-x-0 -bottom-2 h-0.5 bg-accent dark:bg-accent-dark rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* Collapsed Single-Row Search & Controls Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={books.length > 0 ? `Search ${books.length} volumes...` : 'Search collection...'}
              className="w-full pl-9 pr-3 py-2 rounded-input border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent h-10"
            />
          </div>

          {/* Clean View Mode Icons with Active Underline */}
          <div className="shrink-0 flex items-center gap-0.5 h-10">
            {(['grid', 'spine', 'table'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`relative w-9 h-9 rounded-button flex items-center justify-center transition-colors cursor-pointer ${
                  viewMode === mode
                    ? 'text-accent dark:text-accent-dark'
                    : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark'
                }`}
                title={
                  mode === 'grid'
                    ? 'Cover Grid View (2:3 aspect)'
                    : mode === 'spine'
                      ? 'Tactile Spine Shelf View'
                      : 'Catalog List View'
                }
                aria-label={`${mode} view`}
              >
                {mode === 'grid' && <LayoutGrid size={16} />}
                {mode === 'spine' && <Library size={16} />}
                {mode === 'table' && <Table size={16} />}
                {viewMode === mode && (
                  <motion.span
                    layoutId="activeViewModePill"
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="absolute bottom-0.5 inset-x-2 h-0.5 bg-accent dark:bg-accent-dark rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Sort Icon Selector */}
          <div className="relative shrink-0">
            <div
              className={`h-10 w-10 rounded-button border flex items-center justify-center transition-colors ${
                sortBy !== 'default'
                  ? 'border-accent bg-accent/10 text-accent dark:text-accent-dark'
                  : 'border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink-secondary hover:text-ink'
              }`}
              title="Sort Bookshelf"
            >
              <ArrowUpDown size={15} />
              {sortBy !== 'default' && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent dark:bg-accent-dark" />
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ShelfSortOption)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Sort Bookshelf"
              aria-label="Sort Bookshelf"
            >
              <option value="default">Default Order</option>
              <option value="title_asc">Title (A → Z)</option>
              <option value="title_desc">Title (Z → A)</option>
              <option value="author_asc">Author (A → Z)</option>
              <option value="recent">Recently Added</option>
              <option value="rating_desc">Rating (Highest First)</option>
              <option value="pub_year_desc">Year (Newest First)</option>
              <option value="pub_year_asc">Year (Oldest First)</option>
            </select>
          </div>

          {/* Expandable Filters Toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`relative shrink-0 h-10 px-2.5 sm:px-3 rounded-button border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
              filtersOpen || hasActiveFilters
                ? 'border-accent bg-accent/10 text-accent dark:text-accent-dark'
                : 'border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink-secondary hover:text-ink'
            }`}
            aria-expanded={filtersOpen}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-accent-dark" />
            )}
          </button>
        </div>

        {/* Collapsible Filter Row */}
        <AnimatePresence>
          {(filtersOpen || hasActiveFilters) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 sm:flex-initial sm:w-auto text-xs py-1.5 px-2.5 rounded-input border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent truncate cursor-pointer min-h-[38px]"
                  title="Filter by Reading Status"
                >
                  <option value="ALL">All Status</option>
                  <option value="UNREAD">Unread</option>
                  <option value="READING">Reading</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PAUSED">Paused</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>

                <div className="flex-1 sm:flex-initial min-w-0 sm:w-auto">
                  <GenreFilterPopover allGenres={allGenres} books={books} />
                </div>

                {(search || hasActiveFilters || sortBy !== 'default') && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="shrink-0 px-2.5 py-1.5 text-2xs text-ink-muted hover:text-accent underline transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
                  >
                    Reset all
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Genre Pill Badges */}
        {selectedGenres.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs text-ink-muted font-medium">Genres:</span>
            {selectedGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent-dark hover:bg-accent/20 border border-accent/20 transition-colors cursor-pointer"
                title="Click to remove"
              >
                <span>{genre}</span>
                <X size={10} />
              </button>
            ))}
            <button
              type="button"
              onClick={clearSelectedGenres}
              className="text-2xs text-ink-muted hover:text-accent underline ml-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-2xs text-ink-muted px-0.5">
          <span>
            Showing {filteredBooks.length} of {books.length} volumes
          </span>
          {(loading || refreshing) && (
            <span className="inline-flex items-center gap-1 text-accent dark:text-accent-dark font-medium">
              <RefreshCw size={11} className="animate-spin" />
              Syncing...
            </span>
          )}
        </div>
      </div>

      {/* Collection View Renderers (Preserved Middle-View Browsing Experience) */}
      {activeTab === 'shelf' && shelfScope === 'alcove' ? (
        (() => {
          const q = search.trim().toLowerCase();
          const sharedList = (alcoveOverview?.shared_books || []).filter((sb) => {
            if (!q) return true;
            return (
              sb.title.toLowerCase().includes(q) ||
              (sb.authors || '').toLowerCase().includes(q) ||
              sb.owner_username.toLowerCase().includes(q)
            );
          });
          if (sharedList.length === 0) {
            return (
              <div className="py-16 flex-1 flex flex-col items-center justify-center text-center text-ink-muted space-y-2">
                <Users size={28} className="opacity-40" />
                <p className="text-sm font-medium text-ink dark:text-ink-dark">
                  No shared books in this Alcove yet.
                </p>
                <p className="text-xs max-w-sm">
                  Open any book on your shelf and tap &ldquo;Share in Alcove&rdquo;, or turn on Auto-Share in Profile.
                </p>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
              {sharedList.map((sb) => {
                const isHeldByMe = sb.held_by_label === `ex/${authUser}`;
                const bookProjection: Book = {
                  book_id: sb.book_id,
                  title: sb.title,
                  subtitle: sb.subtitle,
                  authors: sb.authors,
                  isbn_10: sb.isbn_10,
                  isbn_13: sb.isbn_13,
                  publisher: sb.publisher,
                  publication_year: sb.publication_year,
                  language: sb.language,
                  genre: sb.genres.join(', '),
                  cover_url: sb.cover_url,
                  reading_status: sb.my_reading_status,
                  condition: sb.condition,
                  location: sb.location,
                  rating: sb.my_rating ?? undefined,
                  notes: sb.my_notes ?? undefined,
                  alcove_id: sb.alcove_id,
                  held_by_label: sb.held_by_label,
                  created_at: '',
                  updated_at: '',
                };
                return (
                  <div
                    key={sb.book_id}
                    className="group flex flex-col p-2 rounded-card border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-2 shadow-2xs"
                  >
                    <div
                      onClick={() => onSelectAlcoveBook(sb)}
                      className="cursor-pointer"
                      title="Tap to view details, rating & personal notes"
                    >
                      <BookCover
                        title={sb.title}
                        authors={sb.authors}
                        coverUrl={sb.cover_url}
                        readingStatus={sb.my_reading_status}
                      />
                    </div>
                    <div className="space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serif text-xs font-medium line-clamp-1 text-ink dark:text-ink-dark">
                          {sb.title}
                        </h3>
                        <p className="text-2xs text-ink-muted line-clamp-1">
                          ex/{sb.owner_username} &bull; {sb.location || 'Home Shelf'}
                        </p>
                        {sb.held_by_label && (
                          <p className="text-3xs font-mono text-accent dark:text-accent-dark mt-0.5 line-clamp-1">
                            With {sb.held_by_label}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => openQuickLog(bookProjection)}
                          className="flex-1 py-1.5 px-2 rounded-button bg-accent hover:bg-accent-hover text-white text-2xs font-medium cursor-pointer transition-all active:scale-[0.97] min-h-[36px]"
                        >
                          Log Read
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const nextHolder = isHeldByMe ? null : `ex/${authUser || 'reader'}`;
                              await updateAlcoveBookHolder(sb.book_id, nextHolder);
                              await loadAlcoves();
                              addToast(
                                nextHolder ? `Marked as with ${nextHolder}` : 'Returned to shared shelf',
                                'success'
                              );
                            } catch (err: any) {
                              addToast(err.message || 'Could not update holder', 'error');
                            }
                          }}
                          className="py-1.5 px-2 rounded-button border border-rule dark:border-rule-dark text-2xs font-medium text-ink-secondary hover:border-accent cursor-pointer transition-colors min-h-[36px]"
                          title={isHeldByMe ? 'Return to shared shelf' : 'Mark that you have this copy'}
                        >
                          {isHeldByMe ? 'Return' : 'Have It'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : loading && books.length === 0 ? (
        <PageSkeletonLoader activeTab="shelf" />
      ) : books.length === 0 ? (
        <div className="py-16 flex-1 flex flex-col items-center justify-center text-center text-ink-muted space-y-3">
          <div className="w-12 h-12 rounded-card bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark flex items-center justify-center text-accent dark:text-accent-dark">
            <Library size={22} />
          </div>
          <div className="space-y-1">
            <p className="font-serif text-base font-medium text-ink dark:text-ink-dark">
              Your library is empty
            </p>
            <p className="text-xs max-w-xs">
              Scan an ISBN barcode with your camera or enter a volume manually to begin cataloguing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer transition-all active:scale-[0.97]"
          >
            <Camera size={15} />
            <span>Add First Book</span>
          </button>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="py-16 flex-1 flex flex-col items-center justify-center text-center text-ink-muted space-y-2.5">
          <p className="font-serif text-base font-medium text-ink dark:text-ink-dark">
            No matching volumes
          </p>
          <p className="text-xs max-w-xs">
            Try broadening your search or removing one of the active filters.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="px-3.5 py-2 rounded-button border border-rule dark:border-rule-dark text-xs font-medium text-accent dark:text-accent-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors cursor-pointer min-h-[40px]"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'spine' ? (
        <SpineView books={sortedBooks} />
      ) : viewMode === 'table' ? (
        <FinancialTable books={sortedBooks} portfolio={portfolio} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3.5">
          {sortedBooks.map((book) => (
            <motion.article
              key={book.book_id}
              onClick={() => setSelectedBook(book)}
              whileHover={{ y: -2, scale: 1.005 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="group flex flex-col gap-2 p-2 rounded-card border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark hover:border-accent/40 dark:hover:border-accent-dark/40 transition-colors cursor-pointer shadow-2xs hover:shadow-sm"
            >
              <BookCover
                title={book.title}
                authors={book.authors}
                coverUrl={book.cover_url}
                readingStatus={book.reading_status}
              />

              <div className="space-y-0.5">
                <h3 className="font-serif text-xs font-medium line-clamp-2 leading-tight group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                  {book.title}
                </h3>
                <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
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
                            className="px-1.5 py-0.5 rounded bg-canvas dark:bg-canvas-dark border border-rule/50 dark:border-rule-dark/50 text-3xs font-medium text-ink-secondary dark:text-ink-dark-secondary truncate max-w-[85px]"
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
                    <span
                      className="text-3xs text-ink-muted truncate shrink-0 ml-1 max-w-[65px]"
                      title={book.location}
                    >
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
  );
};
