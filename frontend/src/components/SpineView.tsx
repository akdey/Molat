import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { Book } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';

interface SpineViewProps {
  books: Book[];
}

// Rich Archival Bookcloth & Leather Palettes
interface SpinePalette {
  bg: string;
  text: string;
  accent: string;
  rib: string;
  name: string;
}

const PALETTES: SpinePalette[] = [
  { bg: '#58181F', text: '#FCECEB', accent: '#F2C94C', rib: '#3D0D12', name: 'Oxblood Leather' },
  { bg: '#16273E', text: '#E8F1FA', accent: '#E0AA3E', rib: '#0D1A2B', name: 'Navy Buckram' },
  { bg: '#163829', text: '#E7F5ED', accent: '#F2C94C', rib: '#0E241A', name: 'Forest Morocco' },
  { bg: '#735122', text: '#FDF7EB', accent: '#FFE5A3', rib: '#4F3613', name: 'Aged Ochre' },
  { bg: '#252930', text: '#EDEFEA', accent: '#D4AF37', rib: '#17191E', name: 'Slate Charcoal' },
  { bg: '#78351B', text: '#FDF1EB', accent: '#F5C682', rib: '#54210D', name: 'Terracotta Bookcloth' },
  { bg: '#15363D', text: '#E8F6F8', accent: '#D4AF37', rib: '#0D2328', name: 'Midnight Teal' },
  { bg: '#481D33', text: '#FBEFF5', accent: '#E0AA3E', rib: '#2F1020', name: 'Plum Levant' },
  { bg: '#2E381A', text: '#F2F6E9', accent: '#D4AF37', rib: '#1D240E', name: 'Olive Binding' },
  { bg: '#4C2719', text: '#FBEFEA', accent: '#F5C682', rib: '#31170C', name: 'Burnt Walnut' },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSpineSpecs(book: Book) {
  const hash = hashString(book.book_id + book.title);
  const palette = PALETTES[hash % PALETTES.length];

  // Natural organic height variation (190px - 225px)
  const height = 190 + (hash % 36);

  return { palette, height };
}

export const SpineView: React.FC<SpineViewProps> = ({ books }) => {
  const { setSelectedBook } = useLibraryStore();

  const [pulledBookId, setPulledBookId] = useState<string | null>(null);
  const [activeShelfFilter, setActiveShelfFilter] = useState<string>('ALL');
  const [booksPerShelf, setBooksPerShelf] = useState<number>(7);

  const pullTimerRef = useRef<any>(null);

  // Responsive books-per-shelf: Fits on phone screens without horizontal scroll!
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 440) {
        setBooksPerShelf(7); // Mobile: 7 books fit completely without any scroll
      } else if (w < 640) {
        setBooksPerShelf(8);
      } else if (w < 768) {
        setBooksPerShelf(10);
      } else if (w < 1024) {
        setBooksPerShelf(12);
      } else {
        setBooksPerShelf(15);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Haptic feedback
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  // Group books into shelf tiers that fit screen width without horizontal scroll
  const shelves = useMemo(() => {
    const locations = new Map<string, Book[]>();

    books.forEach((book) => {
      const loc = (book.location || 'Home Shelf').trim();
      if (!locations.has(loc)) {
        locations.set(loc, []);
      }
      locations.get(loc)!.push(book);
    });

    const result: { id: string; name: string; books: Book[] }[] = [];

    locations.forEach((bookList, locName) => {
      for (let i = 0; i < bookList.length; i += booksPerShelf) {
        const chunk = bookList.slice(i, i + booksPerShelf);
        const tierNum = Math.floor(i / booksPerShelf) + 1;
        const displayName =
          bookList.length > booksPerShelf
            ? `${locName} • Shelf ${tierNum}`
            : locName;
        result.push({
          id: `${locName}-${i}`,
          name: displayName,
          books: chunk,
        });
      }
    });

    return result;
  }, [books, booksPerShelf]);

  // Distinct locations for quick filter chips
  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => set.add(b.location || 'Home Shelf'));
    return Array.from(set).sort();
  }, [books]);

  // On click on the spine: pull out slightly and open the same familiar detail drawer as earlier!
  const handleSpineClick = (book: Book) => {
    triggerHaptic(30);
    setPulledBookId(book.book_id);

    if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
    pullTimerRef.current = setTimeout(() => {
      setPulledBookId(null);
      setSelectedBook(book); // Opens BookDetailDrawer directly as earlier!
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header & Location Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-ink dark:text-ink-dark flex items-center gap-2">
            <span>Library Bookcase</span>
            <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono">
              {books.length} Volumes
            </span>
          </h3>
          <p className="text-3xs text-ink-muted">
            Tactile Spines &bull; Tap any spine to pull it from the shelf and open book details
          </p>
        </div>

        {/* Location selector pills */}
        {distinctLocations.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActiveShelfFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-all shrink-0 cursor-pointer ${
                activeShelfFilter === 'ALL'
                  ? 'bg-ink text-canvas dark:bg-canvas-dark dark:text-ink shadow-xs'
                  : 'bg-surface dark:bg-surface-dark text-ink-muted hover:text-ink border border-rule/50'
              }`}
            >
              All Shelves
            </button>
            {distinctLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveShelfFilter(loc)}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-all shrink-0 cursor-pointer ${
                  activeShelfFilter === loc
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

      {/* 2. REALISTIC WOODEN BOOKCASE (NO HORIZONTAL SCROLL) */}
      <div className="relative rounded-2xl bg-[#26150B] dark:bg-[#140B06] border-4 border-[#3A1F11] dark:border-[#201008] shadow-2xl p-2.5 sm:p-4 space-y-6">
        {/* Bookshelf inner shadow gradient for deep recessed lighting */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none z-10 rounded-xl" />

        {shelves
          .filter((s) => activeShelfFilter === 'ALL' || s.name.startsWith(activeShelfFilter))
          .map((shelf) => (
            <div key={shelf.id} className="relative z-20 space-y-1">
              {/* Brass / Wood Nameplate */}
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                  <span className="text-3xs uppercase tracking-widest font-mono text-amber-200/90 font-bold drop-shadow-xs truncate max-w-[240px]">
                    {shelf.name}
                  </span>
                </div>
                <span className="text-3xs font-mono text-amber-300/60 shrink-0">
                  {shelf.books.length} bks
                </span>
              </div>

              {/* Shelf Compartment & Book Row: NO horizontal scroll, fits across width */}
              <div className="relative min-h-[230px] flex items-end">
                <div className="w-full flex items-end justify-start px-1 sm:px-2 pt-6 pb-0.5 gap-1 sm:gap-1.5 overflow-hidden">
                  {shelf.books.map((book) => {
                    const { palette, height } = getSpineSpecs(book);
                    const isPulled = pulledBookId === book.book_id;
                    const isCompleted = book.reading_status === 'COMPLETED';
                    const isReading = book.reading_status === 'READING';

                    return (
                      <motion.button
                        key={book.book_id}
                        type="button"
                        onClick={() => handleSpineClick(book)}
                        animate={{
                          y: isPulled ? -18 : 0,
                          scale: isPulled ? 1.04 : 1,
                        }}
                        whileHover={{ y: -8, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                        className="group relative flex-1 min-w-[26px] max-w-[46px] shrink-0 flex flex-col justify-between rounded-t-xs select-none cursor-pointer text-left overflow-hidden transition-shadow"
                        style={{
                          height: `${height}px`,
                          backgroundColor: palette.bg,
                          boxShadow: isPulled
                            ? '0 16px 24px -4px rgba(0,0,0,0.8), 0 0 12px rgba(251,191,36,0.35)'
                            : '2px 0 6px rgba(0,0,0,0.4), inset -2px 0 4px rgba(0,0,0,0.35)',
                        }}
                        title={`"${book.title}" by ${book.authors || 'Unknown'}`}
                      >
                        {/* A. REAL COVER ARTWORK AS PHYSICAL SPINE WRAP */}
                        {book.cover_url ? (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-xs">
                            {/* 1. Ambient Blurred Cover Tone (ensures the entire spine is tinted in the cover's exact color) */}
                            <img
                              src={book.cover_url}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 w-full h-full object-cover scale-150 blur-[3px] opacity-90"
                            />
                            {/* 2. Left Edge of the Actual Book Jacket (mimicking real physical spine wrap) */}
                            <img
                              src={book.cover_url}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover object-left opacity-95 contrast-[1.08] brightness-[0.88]"
                            />
                            {/* 3. Darkened Vignette for Typographic Legibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/50 pointer-events-none" />
                          </div>
                        ) : (
                          /* Fallback Archival Leather/Cloth when no cover image exists */
                          <div
                            className="absolute inset-0 pointer-events-none rounded-t-xs"
                            style={{ backgroundColor: palette.bg }}
                          />
                        )}

                        {/* B. Realistic Top Headband & Archival Paper Edge */}
                        <div className="relative z-10 w-full h-1.5 bg-[#EFE7D8] rounded-t-xs border-b border-black/50 overflow-hidden flex shrink-0">
                          <div className="w-full h-full bg-gradient-to-r from-red-700/70 via-amber-200/90 to-red-700/70 opacity-85" />
                        </div>

                        {/* C. 3D Cylindrical Spine Curvature Specular Lighting Shader */}
                        <div
                          className="absolute inset-0 pointer-events-none z-10 rounded-t-xs"
                          style={{
                            background:
                              'linear-gradient(90deg, rgba(0,0,0,0.52) 0%, rgba(255,255,255,0.22) 18%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.58) 100%)',
                          }}
                        />

                        {/* D. Gold Tooled Header Band & Call Number */}
                        <div className="relative z-20 w-full pt-1 px-0.5 text-center flex flex-col items-center">
                          <div className="w-full border-t border-b border-amber-300/40 py-0.5">
                            <span className="text-[8px] font-mono tracking-widest uppercase block truncate font-bold text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                              {book.book_id.replace('BOOK-', '')}
                            </span>
                          </div>
                        </div>

                        {/* E. Raised Gilt Ribs (Upper) */}
                        <div className="relative z-20 w-full h-[2px] bg-black/40 shadow-[0_1px_0_rgba(255,255,255,0.2)]" />

                        {/* F. Elegant Vertical Spine Title */}
                        <div className="relative z-20 my-auto py-2 flex items-center justify-center overflow-hidden w-full h-full">
                          <span
                            className="font-serif text-[10px] sm:text-[11px] font-semibold tracking-tight text-center leading-tight line-clamp-3 select-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] group-hover:text-amber-200 transition-colors"
                            style={{
                              writingMode: 'vertical-rl',
                              transform: 'rotate(180deg)',
                            }}
                          >
                            {book.title}
                          </span>
                        </div>

                        {/* G. Raised Gilt Ribs (Lower) */}
                        <div className="relative z-20 w-full h-[2px] bg-black/40 shadow-[0_1px_0_rgba(255,255,255,0.2)]" />

                        {/* H. Foot Details: Author & Reading Status Dot */}
                        <div className="relative z-20 w-full pb-1 px-0.5 text-center flex flex-col items-center gap-1">
                          <p className="text-[8px] font-sans truncate font-medium text-white/90 w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            {book.authors?.split(' ')[0] || ''}
                          </p>
                          <div className="flex items-center justify-center">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                                  : isReading
                                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)] animate-pulse'
                                  : 'bg-white/60'
                              }`}
                              title={`Status: ${book.reading_status}`}
                            />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* REALISTIC SOLID OAK/WALNUT SHELF PLANK */}
              <div className="relative w-full">
                {/* Plank Top Edge with Warm Lighting Highlight */}
                <div className="h-2 w-full bg-gradient-to-r from-[#734324] via-[#945B36] to-[#734324] border-t border-[#B57C53]/40 shadow-xs" />
                {/* Beveled Front Lip of the Shelf */}
                <div className="h-4 w-full bg-gradient-to-b from-[#542F18] to-[#381E0D] border-t border-black/30 flex items-center justify-between px-3 shadow-md">
                  <div className="h-[1px] w-full bg-white/10" />
                </div>
                {/* Deep Cast Shadow under the shelf board onto wall/books below */}
                <div className="h-3 w-full bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
