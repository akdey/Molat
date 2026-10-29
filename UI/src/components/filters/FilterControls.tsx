import React from 'react';
import { cn } from '../../lib/utils';
import type { Book, BookFilters, BookSort, BookSortField } from '../../types/book';
import { Search, X, ChevronDown } from 'lucide-react';
import { Button } from '../common/FormControls';

// =================== Search Bar ===================

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search title, author, ISBN…', className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search books"
        className={cn(
          'w-full pl-9 pr-3 py-2',
          'bg-surface-raised dark:bg-surface-dark-raised',
          'border border-rule dark:border-rule-dark rounded-md',
          'text-sm text-ink dark:text-ink-dark',
          'placeholder:text-ink-muted dark:placeholder:text-ink-dark-muted',
          'focus:outline-none focus:border-accent dark:focus:border-accent-dark focus:ring-1 focus:ring-accent/30',
          'transition-colors duration-fast',
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors p-0.5"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// =================== Active Filter Pills ===================

interface ActiveFiltersProps {
  filters: BookFilters;
  onRemove: (key: keyof BookFilters) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}

const FILTER_LABELS: Partial<Record<keyof BookFilters, (v: unknown) => string>> = {
  ownership_status: v => String(v),
  reading_status: v => String(v),
  genre: v => String(v),
  condition: v => String(v),
  shelf_location: v => `Shelf: ${v}`,
  on_loan: () => 'On loan',
  missing_cover: () => 'Missing cover',
  missing_metadata: () => 'Incomplete metadata',
};

export function ActiveFilters({ filters, onRemove, resultCount, totalCount, className }: ActiveFiltersProps) {
  const active = Object.entries(filters)
    .filter(([k, v]) => k !== 'search' && v !== undefined && v !== '')
    .map(([k, v]) => ({ key: k as keyof BookFilters, label: FILTER_LABELS[k as keyof BookFilters]?.(v) ?? String(v) }));

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs text-ink-muted dark:text-ink-dark-muted tabular-nums shrink-0">
        {resultCount === totalCount ? `${totalCount} books` : `${resultCount} of ${totalCount}`}
      </span>
      {active.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onRemove(key)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
            'bg-accent-subtle text-accent dark:bg-accent-dark-subtle dark:text-accent-dark',
            'border border-accent/20 dark:border-accent-dark/20',
            'hover:bg-accent/10 transition-colors',
          )}
          aria-label={`Remove filter: ${label}`}
        >
          {label}
          <X size={10} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// =================== Sort selector ===================

interface SortSelectorProps {
  sort: BookSort;
  onChange: (sort: BookSort) => void;
  className?: string;
}

const SORT_OPTIONS: { value: BookSortField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'created_at', label: 'Date added' },
  { value: 'purchase_date', label: 'Purchase date' },
  { value: 'purchase_price', label: 'Price' },
  { value: 'reading_status', label: 'Reading status' },
  { value: 'personal_rating', label: 'My rating' },
];

export function SortSelector({ sort, onChange, className }: SortSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <label htmlFor="sort-field" className="text-xs text-ink-muted dark:text-ink-dark-muted whitespace-nowrap">Sort by</label>
      <select
        id="sort-field"
        value={sort.field}
        onChange={e => onChange({ ...sort, field: e.target.value as BookSortField })}
        className={cn(
          'text-xs text-ink dark:text-ink-dark bg-transparent',
          'border-none focus:outline-none focus:ring-0 cursor-pointer',
          'appearance-none pr-4 py-1',
        )}
      >
        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button
        onClick={() => onChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
        aria-label={sort.direction === 'asc' ? 'Sort descending' : 'Sort ascending'}
        className="text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors p-1"
      >
        <ChevronDown
          size={13}
          className={cn('transition-transform', sort.direction === 'asc' ? 'rotate-180' : '')}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

// =================== Filter panel ===================

interface FilterPanelProps {
  filters: BookFilters;
  genres: string[];
  locations: string[];
  onChange: (filters: BookFilters) => void;
  onClose: () => void;
}

export function FilterPanel({ filters, genres, locations, onChange, onClose }: FilterPanelProps) {
  const set = <K extends keyof BookFilters>(key: K, val: BookFilters[K]) =>
    onChange({ ...filters, [key]: val });

  const clear = <K extends keyof BookFilters>(key: K) =>
    onChange({ ...filters, [key]: undefined });

  return (
    <div
      role="region"
      aria-label="Book filters"
      className={cn(
        'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark',
        'rounded-lg shadow-md p-4',
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
        'animate-fade-in',
      )}
    >
      {/* Ownership */}
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Ownership</span>
        {(['Owned', 'Wishlist', 'Borrowed'] as const).map(s => (
          <label key={s} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="ownership"
              checked={filters.ownership_status === s}
              onChange={() => set('ownership_status', s)}
              className="accent-accent dark:accent-accent-dark"
            />
            <span className="text-sm text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">{s}</span>
          </label>
        ))}
        {filters.ownership_status && (
          <button onClick={() => clear('ownership_status')} className="text-2xs text-ink-muted hover:text-accent transition-colors text-left">Clear</button>
        )}
      </div>

      {/* Reading status */}
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Reading status</span>
        {(['Unread', 'Reading', 'Completed', 'Abandoned'] as const).map(s => (
          <label key={s} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="reading"
              checked={filters.reading_status === s}
              onChange={() => set('reading_status', s)}
              className="accent-accent dark:accent-accent-dark"
            />
            <span className="text-sm text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">{s}</span>
          </label>
        ))}
        {filters.reading_status && (
          <button onClick={() => clear('reading_status')} className="text-2xs text-ink-muted hover:text-accent transition-colors text-left">Clear</button>
        )}
      </div>

      {/* Genre */}
      {genres.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Genre</span>
          <select
            value={filters.genre ?? ''}
            onChange={e => e.target.value ? set('genre', e.target.value) : clear('genre')}
            aria-label="Filter by genre"
            className="text-sm bg-surface-raised dark:bg-surface-dark-raised border border-rule dark:border-rule-dark rounded px-2 py-1.5 text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
          >
            <option value="">All genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}

      {/* Location */}
      {locations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Shelf Location</span>
          <select
            value={filters.shelf_location ?? ''}
            onChange={e => e.target.value ? set('shelf_location', e.target.value) : clear('shelf_location')}
            aria-label="Filter by shelf location"
            className="text-sm bg-surface-raised dark:bg-surface-dark-raised border border-rule dark:border-rule-dark rounded px-2 py-1.5 text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
          >
            <option value="">All locations</option>
            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>
      )}

      {/* Quick toggles */}
      <div className="flex flex-col gap-2">
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Quick filters</span>
        {[
          { key: 'on_loan' as const, label: 'On loan' },
          { key: 'missing_cover' as const, label: 'Missing cover' },
          { key: 'missing_metadata' as const, label: 'Incomplete metadata' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!filters[key]}
              onChange={e => e.target.checked ? set(key, true as BookFilters[typeof key]) : clear(key)}
              className="accent-accent dark:accent-accent-dark"
            />
            <span className="text-sm text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">{label}</span>
          </label>
        ))}
      </div>

      {/* Footer */}
      <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2 border-t border-rule dark:border-rule-dark">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { onChange({ search: filters.search }); onClose(); }}
        >
          Clear all filters
        </Button>
        <Button size="sm" variant="primary" onClick={onClose} className="ml-2">
          Done
        </Button>
      </div>
    </div>
  );
}

// =================== Client-side filtering / sorting logic ===================

export function applyFilters(books: Book[], filters: BookFilters): Book[] {
  return books.filter(b => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [b.title, b.author, b.isbn_13, b.isbn_10, b.publisher, b.genre, b.notes]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.ownership_status && b.ownership_status !== filters.ownership_status) return false;
    if (filters.reading_status && b.reading_status !== filters.reading_status) return false;
    if (filters.genre && b.genre !== filters.genre) return false;
    if (filters.condition && b.condition !== filters.condition) return false;
    if (filters.shelf_location && b.shelf_location !== filters.shelf_location) return false;
    if (filters.on_loan && !b.loaned_to) return false;
    if (filters.missing_cover && b.cover_url) return false;
    if (filters.missing_metadata && b.isbn_13 && b.author && b.publisher) return false;
    return true;
  });
}

export function applySort(books: Book[], sort: BookSort): Book[] {
  return [...books].sort((a, b) => {
    let va: unknown = a[sort.field as keyof Book];
    let vb: unknown = b[sort.field as keyof Book];
    if (va === undefined || va === null) va = '';
    if (vb === undefined || vb === null) vb = '';
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
    return sort.direction === 'asc' ? cmp : -cmp;
  });
}

