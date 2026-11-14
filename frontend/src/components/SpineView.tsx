import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { Book } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { BookCover } from './BookCover';
import { Bookmark, MapPin, Star } from 'lucide-react';

interface SpineViewProps {
  books: Book[];
}

export const SpineView: React.FC<SpineViewProps> = ({ books }) => {
  const { setSelectedBook } = useLibraryStore();
  const [activeLocationFilter, setActiveLocationFilter] = useState<string>('ALL');

  // Distinct locations for quick shelf filter pills
  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => set.add(b.location || 'Home Shelf'));
    return Array.from(set).sort();
  }, [books]);

  // Group books into shelves (either by physical location or display tiers)
  const shelves = useMemo(() => {
    const filtered =
      activeLocationFilter === 'ALL'
        ? books
        : books.filter((b) => (b.location || 'Home Shelf') === activeLocationFilter);

    // Chunk into shelves of 3-4 books per display ledge on mobile, 5-6 on larger screens
    // To ensure clean wrapping across all viewports, we chunk into shelves of 6 books
    const chunkSize = 6;
    const list: { id: string; name: string; books: Book[] }[] = [];

    for (let i = 0; i < filtered.length; i += chunkSize) {
      const chunk = filtered.slice(i, i + chunkSize);
      const tier = Math.floor(i / chunkSize) + 1;
      const shelfName =
        activeLocationFilter !== 'ALL'
          ? `${activeLocationFilter} • Tier ${tier}`
          : `Display Shelf ${tier}`;
      list.push({
        id: `shelf-${i}`,
        name: shelfName,
        books: chunk,
      });
    }

    return list;
  }, [books, activeLocationFilter]);

  // Touch/haptic feedback
  const triggerHaptic = (ms: number = 25) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* 1. View Header & Shelf Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-ink dark:text-ink-dark flex items-center gap-2">
            <span>Bookshelf Display</span>
            <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono">
              {books.length} Volumes
            </span>
          </h3>
          <p className="text-3xs text-ink-muted">
            3D Angled Ledges &bull; Tap any volume to open full catalog record and reading tracker
          </p>
        </div>

        {/* Shelf location filter pills */}
        {distinctLocations.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActiveLocationFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-all shrink-0 cursor-pointer ${
                activeLocationFilter === 'ALL'
                  ? 'bg-ink text-canvas dark:bg-canvas-dark dark:text-ink shadow-xs'
                  : 'bg-surface dark:bg-surface-dark text-ink-muted hover:text-ink border border-rule/50'
              }`}
            >
              All Shelves
            </button>
            {distinctLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveLocationFilter(loc)}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-all shrink-0 cursor-pointer ${
                  activeLocationFilter === loc
                    ? 'bg-ink text-canvas dark:bg-canvas-dark dark:text-ink shadow-xs'
                    : 'bg-surface dark:bg-surface-dark text-ink-muted hover:text-ink border border-rule/50'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. FLOATING ARCHITECTURAL DISPLAY SHELVES */}
      <div className="space-y-10 sm:space-y-12">
        {shelves.map((shelf) => (
          <div key={shelf.id} className="space-y-2">
            {/* Shelf Nameplate */}
            <div className="flex items-center justify-between px-2 text-3xs font-mono uppercase tracking-widest text-ink-muted">
              <span className="flex items-center gap-1.5 font-bold text-accent dark:text-accent-dark">
                <Bookmark size={11} />
                {shelf.name}
              </span>
              <span>{shelf.books.length} volumes</span>
            </div>

            {/* 3D Angled Books Row */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-5 px-2 pt-4 pb-2 items-end">
              {shelf.books.map((book) => {
                const isCompleted = book.reading_status === 'COMPLETED';
                const isReading = book.reading_status === 'READING';

                return (
                  <div
                    key={book.book_id}
                    className="relative group cursor-pointer flex flex-col items-center"
                    onClick={() => {
                      triggerHaptic(30);
                      setSelectedBook(book);
                    }}
                  >
                    {/* 3D PERSPECTIVE BOOK CONTAINER */}
                    <div
                      className="w-full relative transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-translate-y-2"
                      style={{
                        perspective: '900px',
                      }}
                    >
                      <div
                        className="relative w-full transition-transform duration-300 ease-out group-hover:rotate-0"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: 'rotateY(-16deg) rotateX(2deg)',
                        }}
                      >
                        {/* 1. Front Book Cover */}
                        <div className="relative aspect-[2/3] w-full rounded-l-xs rounded-r-xs overflow-hidden shadow-xl bg-rule dark:bg-rule-dark">
                          <BookCover
                            title={book.title}
                            authors={book.authors}
                            coverUrl={book.cover_url}
                            readingStatus={book.reading_status}
                            className="w-full h-full object-cover"
                          />

                          {/* Left Bound Spine Crease Shadow */}
                          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 via-white/10 to-transparent pointer-events-none" />

                          {/* Subtle Right Edge Page Fold Sheen */}
                          <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
                        </div>

                        {/* 2. 3D Right Side Page Block (Physical Cream Paper Pages Edge) */}
                        <div
                          className="absolute top-1 bottom-1 right-0 w-3.5 sm:w-4 bg-[#F5EEDB] dark:bg-[#2A2B2E] border-y border-r border-[#D9CEBA] dark:border-[#3E4044] rounded-r-2xs pointer-events-none origin-left shadow-md"
                          style={{
                            transform: 'translateX(100%) rotateY(90deg)',
                            backgroundImage:
                              'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 3px)',
                          }}
                        />

                        {/* 3. 3D Top Page Block (Top Edge Pages) */}
                        <div
                          className="absolute top-0 left-1 right-0 h-3.5 sm:h-4 bg-[#EFE6D2] dark:bg-[#222326] border-t border-x border-[#D9CEBA] dark:border-[#3E4044] rounded-t-2xs pointer-events-none origin-bottom shadow-xs"
                          style={{
                            transform: 'translateY(-100%) rotateX(90deg)',
                          }}
                        />

                        {/* 4. Contact Shadow resting on the shelf ledge */}
                        <div className="absolute -bottom-2 inset-x-1.5 h-3 bg-black/45 dark:bg-black/75 blur-md rounded-full pointer-events-none group-hover:bg-black/60 transition-colors" />
                      </div>
                    </div>

                    {/* Book Metadata Below Ledge */}
                    <div className="mt-3.5 text-center w-full px-1">
                      <h4 className="font-serif text-[11px] sm:text-xs font-semibold text-ink dark:text-ink-dark truncate group-hover:text-accent transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-3xs text-ink-muted truncate mt-0.5">
                        {book.authors?.split(' ')[0] || 'Unknown'}
                      </p>

                      {/* Status indicator pill */}
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]'
                              : isReading
                              ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)] animate-pulse'
                              : 'bg-ink-muted/30'
                          }`}
                        />
                        <span className="text-[9px] font-mono uppercase tracking-wider text-ink-muted">
                          {book.reading_status.slice(0, 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MINIMALIST ARCHITECTURAL FLOATING SHELF LEDGE */}
            <div className="relative w-full pt-1">
              {/* Shelf Top Face with Beveled Highlight */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#EAE2D5] via-[#F4EFE6] to-[#EAE2D5] dark:from-[#252830] dark:via-[#2F343F] dark:to-[#252830] rounded-t-xs border-t border-rule dark:border-rule-dark" />
              {/* Shelf Front Lip */}
              <div className="h-3 w-full bg-gradient-to-b from-[#D8CCA9] to-[#BAA988] dark:from-[#20232B] dark:to-[#14161C] border-t border-black/10 dark:border-white/5 shadow-md flex items-center justify-between px-3">
                <div className="h-[1px] w-full bg-white/20 dark:bg-white/5" />
              </div>
              {/* Soft Drop Shadow under the ledge */}
              <div className="h-4 w-full bg-gradient-to-b from-black/15 to-transparent pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
