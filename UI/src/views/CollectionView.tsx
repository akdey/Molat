import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { BookGrid, BookList } from '../components/books/BookCard';
import { SearchBar, FilterPanel, SortSelector, ActiveFilters, applyFilters, applySort } from '../components/filters/FilterControls';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button, IconButton } from '../components/common/FormControls';
import type { Book, BookFilters, BookSort } from '../types/book';
import { SlidersHorizontal, LayoutGrid, AlignJustify, PlusCircle } from 'lucide-react';

type ViewMode = 'grid' | 'list';

interface CollectionViewProps {
  onSelectBook: (book: Book) => void;
  onAddBook: () => void;
}

const DEFAULT_FILTERS: BookFilters = { search: '' };
const DEFAULT_SORT: BookSort = { field: 'created_at', direction: 'desc' };

export function CollectionView({ onSelectBook, onAddBook }: CollectionViewProps) {
  const { books, booksLoading, booksError } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<BookFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<BookSort>(DEFAULT_SORT);
  const [showFilters, setShowFilters] = useState(false);

  // Derive genres and locations from the current collection
  const genres = useMemo(() =>
    [...new Set(books.map(b => b.genre).filter(Boolean))].sort() as string[],
    [books],
  );
  const locations = useMemo(() =>
    [...new Set(books.map(b => b.shelf_location).filter(Boolean))].sort() as string[],
    [books],
  );

  const filtered = useMemo(() => applyFilters(books, filters), [books, filters]);
  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort]);

  const hasActiveFilters = Object.entries(filters)
    .some(([k, v]) => k !== 'search' && v !== undefined && v !== '');

  function removeFilter(key: keyof BookFilters) {
    setFilters(prev => { const next = { ...prev }; delete next[key]; return next; });
  }

  if (booksError) {
    return <ErrorState message={booksError} title="Could not load your books" />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium text-ink dark:text-ink-dark">My Books</h1>
        <Button
          variant="primary"
          size="sm"
          iconLeft={<PlusCircle size={15} />}
          onClick={onAddBook}
        >
          <span className="hidden sm:inline">Add book</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <SearchBar
            value={filters.search}
            onChange={v => setFilters(f => ({ ...f, search: v }))}
            className="flex-1"
          />

          {/* Filters toggle */}
          <IconButton
            label={showFilters ? 'Close filters' : 'Open filters'}
            variant={showFilters || hasActiveFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal size={16} />
          </IconButton>

          {/* View toggle */}
          <div className="hidden sm:flex items-center border border-rule dark:border-rule-dark rounded-md overflow-hidden">
            <IconButton
              label="Grid view"
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <LayoutGrid size={15} />
            </IconButton>
            <IconButton
              label="List view"
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none border-l border-rule dark:border-rule-dark"
            >
              <AlignJustify size={15} />
            </IconButton>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            genres={genres}
            locations={locations}
            onChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Sort + active filters row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ActiveFilters
            filters={filters}
            onRemove={removeFilter}
            resultCount={sorted.length}
            totalCount={books.length}
          />
          <SortSelector sort={sort} onChange={setSort} className="ml-auto" />
        </div>
      </div>

      {/* Book list */}
      {!booksLoading && sorted.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={filters.search || hasActiveFilters ? 'No books match your search' : 'Your collection is empty'}
          description={
            filters.search || hasActiveFilters
              ? 'Try adjusting your search or clearing filters to see more books.'
              : 'Add your first book by scanning its barcode or entering details manually.'
          }
          action={
            filters.search || hasActiveFilters ? (
              <Button
                variant="secondary"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Clear search and filters
              </Button>
            ) : (
              <Button variant="primary" iconLeft={<PlusCircle size={16} />} onClick={onAddBook}>
                Add your first book
              </Button>
            )
          }
        />
      ) : viewMode === 'grid' ? (
        <BookGrid books={sorted} loading={booksLoading} onSelect={onSelectBook} />
      ) : (
        <BookList books={sorted} loading={booksLoading} onSelect={onSelectBook} />
      )}
    </div>
  );
}

