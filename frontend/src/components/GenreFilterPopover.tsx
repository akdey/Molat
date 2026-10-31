import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, Tag } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import type { Book } from '../types/book';

interface GenreFilterPopoverProps {
  allGenres: string[];
  books: Book[];
}

export const GenreFilterPopover: React.FC<GenreFilterPopoverProps> = ({
  allGenres,
  books,
}) => {
  const { selectedGenres, toggleGenre, clearSelectedGenres, setSelectedGenres } =
    useLibraryStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  // Compute book counts per genre
  const genreCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of books) {
      if (!b.genre) continue;
      const parts = b.genre.split(',').map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        map[p] = (map[p] || 0) + 1;
      }
    }
    return map;
  }, [books]);

  const filteredGenres = React.useMemo(() => {
    if (!query.trim()) return allGenres;
    const q = query.toLowerCase();
    return allGenres.filter((g) => g.toLowerCase().includes(q));
  }, [allGenres, query]);

  const countSelected = selectedGenres.length;

  return (
    <div className="relative w-full sm:w-auto" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full sm:w-auto text-xs py-1.5 px-2.5 rounded-lg border flex items-center justify-between gap-1.5 transition-colors cursor-pointer min-h-[34px] ${
          countSelected > 0
            ? 'border-accent text-accent font-medium bg-accent/10 dark:bg-accent/20'
            : 'border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark hover:border-ink-muted'
        }`}
        title="Filter by Categories / Genres"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Tag size={12} className={countSelected > 0 ? 'text-accent' : 'text-ink-muted'} />
          <span className="truncate">
            {countSelected === 0
              ? 'All Genres'
              : countSelected === 1
              ? selectedGenres[0]
              : `Genres (${countSelected})`}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-accent' : 'text-ink-muted'
          }`}
        />
      </button>

      {/* Popover Menu */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:inset-x-auto sm:top-full sm:left-0 sm:absolute sm:mt-1.5 w-auto sm:w-72 max-w-sm mx-auto sm:mx-0 bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-rule/50 dark:border-rule-dark/50 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-xs font-medium text-ink dark:text-ink-dark">
                  Categories
                </span>
                {countSelected > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-3xs font-mono font-medium bg-accent text-white">
                    {countSelected}
                  </span>
                )}
              </div>

              {countSelected > 0 && (
                <button
                  type="button"
                  onClick={clearSelectedGenres}
                  className="text-3xs text-ink-muted hover:text-accent dark:hover:text-accent-dark transition-colors font-medium flex items-center gap-0.5"
                >
                  <X size={10} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search genres..."
                className="w-full pl-7 pr-2.5 py-1 text-2xs rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                autoFocus
              />
            </div>

            {/* Checkbox List */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1 text-xs">
              {filteredGenres.length === 0 ? (
                <p className="text-2xs text-ink-muted italic py-3 text-center">
                  No genres matching "{query}"
                </p>
              ) : (
                filteredGenres.map((genre) => {
                  const checked = selectedGenres.includes(genre);
                  const count = genreCounts[genre] || 0;

                  return (
                    <label
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                        checked
                          ? 'bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent-dark font-medium'
                          : 'hover:bg-surface dark:hover:bg-surface-dark text-ink dark:text-ink-dark'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <div
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                            checked
                              ? 'bg-accent border-accent text-white'
                              : 'border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark'
                          }`}
                        >
                          {checked && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{genre}</span>
                      </div>

                      <span className="text-3xs font-mono text-ink-muted tabular-nums shrink-0 ml-1">
                        {count}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer Controls */}
            <div className="pt-2 border-t border-rule/50 dark:border-rule-dark/50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedGenres(allGenres)}
                className="text-3xs text-ink-muted hover:text-ink transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover text-white text-3xs font-medium transition-colors"
              >
                Apply ({countSelected})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

