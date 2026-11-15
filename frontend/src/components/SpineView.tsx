import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { Book } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';

interface SpineViewProps {
  books: Book[];
}

// Authentic Publisher Cloth & Paper Palettes
interface SpineTheme {
  bg: string;
  text: string;
  accent: string;
  rib: string;
  paperType: 'cloth' | 'leather' | 'paperback';
}

const PALETTES: SpineTheme[] = [
  { bg: '#2B231D', text: '#FDFBF7', accent: '#D4AF37', rib: '#1A1511', paperType: 'leather' }, // Deep Havana Leather
  { bg: '#172738', text: '#F0F5FA', accent: '#E5C07B', rib: '#0E1924', paperType: 'cloth' },   // Oxford Navy Buckram
  { bg: '#541C24', text: '#FDF4F5', accent: '#F2C94C', rib: '#361117', paperType: 'leather' }, // Crimson Morocco
  { bg: '#1B382B', text: '#EDF7F2', accent: '#E0AA3E', rib: '#10221A', paperType: 'cloth' },   // Forest Green Cloth
  { bg: '#6B4A23', text: '#FEF9F0', accent: '#FFE29A', rib: '#452F16', paperType: 'cloth' },   // Aged Ochre Binding
  { bg: '#1E2229', text: '#EDEDED', accent: '#D4AF37', rib: '#12151A', paperType: 'paperback' },// Matte Noir Paperback
  { bg: '#6E2C1B', text: '#FDF2EE', accent: '#F5C682', rib: '#471B10', paperType: 'cloth' },   // Terracotta Rust
  { bg: '#153338', text: '#EBF6F8', accent: '#D4AF37', rib: '#0C2023', paperType: 'cloth' },   // Vintage Teal
  { bg: '#3E1C2F', text: '#FBF0F6', accent: '#F2C94C', rib: '#26111C', paperType: 'leather' }, // Plum Levant
  { bg: '#DCD4C4', text: '#1F242E', accent: '#8B261D', rib: '#B8AD98', paperType: 'paperback' },// Classic Penguin Cream
  { bg: '#2A351D', text: '#F3F7EC', accent: '#E0AA3E', rib: '#1A2111', paperType: 'cloth' },   // Antique Olive
  { bg: '#40241A', text: '#FDF0EA', accent: '#F5C682', rib: '#281510', paperType: 'leather' }, // Burnt Walnut
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getSpineTheme(book: Book) {
  const hash = hashString(book.book_id + (book.title || ''));
  const palette = PALETTES[hash % PALETTES.length];

  // Natural organic height variation across books (180px to 215px)
  const height = 180 + (hash % 36);

  return { palette, height };
}

export const SpineView: React.FC<SpineViewProps> = ({ books }) => {
  const { setSelectedBook } = useLibraryStore();

  const [pulledBookId, setPulledBookId] = useState<string | null>(null);
  const [activeLocationFilter, setActiveLocationFilter] = useState<string>('ALL');
  const [booksPerShelf, setBooksPerShelf] = useState<number>(8);

  const pullTimerRef = useRef<any>(null);

  // Responsive shelf capacity: Fits completely on mobile screens WITHOUT horizontal scroll
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 420) {
        setBooksPerShelf(8); // Phone portrait: 8 books fit comfortably across screen
      } else if (w < 640) {
        setBooksPerShelf(10);
      } else if (w < 768) {
        setBooksPerShelf(12);
      } else if (w < 1024) {
        setBooksPerShelf(14);
      } else {
        setBooksPerShelf(16); // Desktop
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Distinct locations for shelf tabs
  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => set.add(b.location || 'Home Shelf'));
    return Array.from(set).sort();
  }, [books]);

  // Group books into stacked wooden shelves
  const shelves = useMemo(() => {
    const filtered =
      activeLocationFilter === 'ALL'
        ? books
        : books.filter((b) => (b.location || 'Home Shelf') === activeLocationFilter);

    const list: { id: string; name: string; books: Book[] }[] = [];

    for (let i = 0; i < filtered.length; i += booksPerShelf) {
      const chunk = filtered.slice(i, i + booksPerShelf);
      const tier = Math.floor(i / booksPerShelf) + 1;
      const shelfName =
        activeLocationFilter !== 'ALL'
          ? `${activeLocationFilter} • Tier ${tier}`
          : `Shelf Tier ${tier}`;
      list.push({
        id: `shelf-tier-${i}`,
        name: shelfName,
        books: chunk,
      });
    }

    return list;
  }, [books, activeLocationFilter, booksPerShelf]);

  // Touch haptics
  const triggerHaptic = (ms: number = 25) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  const handleSpineClick = (book: Book) => {
    triggerHaptic(30);
    setPulledBookId(book.book_id);

    if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
    pullTimerRef.current = setTimeout(() => {
      setPulledBookId(null);
      setSelectedBook(book); // Opens standard BookDetailDrawer as requested
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 select-none">
      {/* 1. Header & Location Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-ink dark:text-ink-dark flex items-center gap-2">
            <span>Bookshelf</span>
            <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono">
              {books.length} Volumes
            </span>
          </h3>
          <p className="text-3xs text-ink-muted">
            Standing Spines &bull; Tap any volume on the shelf to inspect full book details
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

      {/* 2. REALISTIC WOODEN BOOKCASE UNIT */}
      <div className="relative rounded-2xl bg-[#24160E] dark:bg-[#120B07] border-4 border-[#351E12] dark:border-[#1E1008] shadow-2xl p-2 sm:p-4 space-y-6 overflow-hidden">
        {/* Deep ambient bookcase backboard shadow */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/35 pointer-events-none z-10 rounded-xl" />

        {shelves.map((shelf) => (
          <div key={shelf.id} className="relative z-20 space-y-1">
            {/* Brass Shelf Nameplate Tag */}
            <div className="flex items-center justify-between px-2 pt-1 pb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                <span className="text-[10px] uppercase tracking-widest font-mono text-amber-200/90 font-bold drop-shadow-xs truncate max-w-[240px]">
                  {shelf.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-300/60 shrink-0">
                {shelf.books.length} vols
              </span>
            </div>

            {/* Shelf Book Row: Stacked horizontally when <= 4 books ("one upon one"), or standing side-by-side */}
            <div className="relative min-h-[225px] flex items-end">
              {shelf.books.length <= 4 ? (
                /* HORIZONTAL BOOK STACK ("Stacked one upon one") */
                <div className="w-full flex items-end justify-start px-2 sm:px-4 pt-6 pb-0.5">
                  <div className="flex flex-col-reverse items-start w-full max-w-sm space-y-reverse space-y-1 py-1">
                    {shelf.books.map((book, idx) => {
                      const { palette } = getSpineTheme(book);
                      const hash = hashString(book.book_id + (book.title || ''));
                      const isPulled = pulledBookId === book.book_id;
                      const isCompleted = book.reading_status === 'COMPLETED';
                      const isReading = book.reading_status === 'READING';
                      const isLightSpine = palette.bg === '#DCD4C4';

                      // Organic stack width & thickness
                      const thickness = 38 + (hash % 8); // 38px to 45px spine height
                      const widthPercent = 94 - idx * 4 + ((hash % 7) - 3); // Slightly narrower as stack goes up
                      const rotation = idx === 0 ? 0 : idx % 2 === 1 ? -0.5 : 0.6; // Subtle organic tilt
                      const offsetLeft = idx === 0 ? 0 : (hash % 12) + 2;

                      return (
                        <motion.button
                          key={book.book_id}
                          type="button"
                          onClick={() => handleSpineClick(book)}
                          animate={{
                            y: isPulled ? -10 : 0,
                            scale: isPulled ? 1.02 : 1,
                          }}
                          whileHover={{ y: -4, transition: { duration: 0.15 } }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: 'spring', damping: 24, stiffness: 360 }}
                          className="group relative flex items-center justify-between rounded-xs select-none cursor-pointer text-left overflow-hidden transition-all shrink-0"
                          style={{
                            height: `${thickness}px`,
                            width: `${Math.min(100, Math.max(75, widthPercent))}%`,
                            marginLeft: `${offsetLeft}px`,
                            transform: `rotate(${rotation}deg)`,
                            backgroundColor: palette.bg,
                            color: palette.text,
                            boxShadow: isPulled
                              ? '0 12px 20px -3px rgba(0,0,0,0.85), 0 0 10px rgba(251,191,36,0.35)'
                              : '0 4px 6px -1px rgba(0,0,0,0.55), inset 0 2px 3px rgba(255,255,255,0.12), inset 0 -2px 3px rgba(0,0,0,0.4)',
                            zIndex: idx + 10,
                          }}
                          title={`"${book.title}" by ${book.authors || 'Unknown'}`}
                        >
                          {/* Left Edge Headband Stitch */}
                          <div className="relative z-10 h-full w-2 bg-[#F2EBDE] border-r border-black/40 overflow-hidden flex shrink-0">
                            <div className="w-full h-full bg-gradient-to-b from-red-700/80 via-amber-300/90 to-red-700/80 opacity-90" />
                          </div>

                          {/* 3D Cylindrical Spine Shading (top-to-bottom curved lighting) */}
                          <div
                            className="absolute inset-0 pointer-events-none z-10"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 24%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.42) 100%)',
                            }}
                          />

                          {/* Raised Horizontal Gilt Edge Lines */}
                          <div
                            className="absolute top-0 inset-x-0 h-[1.5px] opacity-60 z-20"
                            style={{ backgroundColor: palette.rib, boxShadow: '0 1px 0 rgba(255,255,255,0.15)' }}
                          />
                          <div
                            className="absolute bottom-0 inset-x-0 h-[1.5px] opacity-70 z-20"
                            style={{ backgroundColor: palette.rib, boxShadow: '0 -1px 0 rgba(0,0,0,0.3)' }}
                          />

                          {/* Spine Content (Horizontal Layout) */}
                          <div className="relative z-20 flex-1 flex items-center justify-between px-2.5 sm:px-3.5 gap-2 overflow-hidden">
                            {/* Call Number Tag */}
                            <div
                              className="px-1.5 py-0.5 rounded-xs border shrink-0 text-center"
                              style={{ borderColor: `${palette.accent}60` }}
                            >
                              <span
                                className="text-[8px] font-mono font-bold tracking-wider uppercase block"
                                style={{
                                  color: isLightSpine ? '#8B261D' : palette.accent,
                                  textShadow: isLightSpine ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
                                }}
                              >
                                {book.book_id.replace('BOOK-', '')}
                              </span>
                            </div>

                            {/* Title & Author */}
                            <div className="flex-1 min-w-0 flex items-baseline gap-2">
                              <span
                                className={`font-serif text-xs sm:text-[13px] font-semibold tracking-tight truncate group-hover:text-amber-200 transition-colors ${
                                  isLightSpine
                                    ? 'text-slate-900 font-bold'
                                    : 'text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                                }`}
                              >
                                {book.title}
                              </span>
                              {book.authors && (
                                <span
                                  className={`text-[9px] font-sans truncate shrink-0 hidden xs:inline ${
                                    isLightSpine ? 'text-slate-700' : 'text-white/70'
                                  }`}
                                >
                                  &bull; {book.authors.split(',')[0]}
                                </span>
                              )}
                            </div>

                            {/* Status Indicator Dot */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isCompleted
                                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                                    : isReading
                                    ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)] animate-pulse'
                                    : isLightSpine
                                    ? 'bg-slate-400'
                                    : 'bg-white/40'
                                }`}
                                title={`Status: ${book.reading_status}`}
                              />
                            </div>
                          </div>

                          {/* Right Paper Block Edge */}
                          <div className="relative z-10 h-full w-2.5 bg-[#FAF6ED] border-l border-black/30 overflow-hidden flex flex-col justify-around shrink-0 opacity-80">
                            <div className="w-full h-[1px] bg-black/10" />
                            <div className="w-full h-[1px] bg-black/10" />
                            <div className="w-full h-[1px] bg-black/10" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* STANDING SPINES (Packed side-by-side with justify-start, no gaps) */
                <div className="w-full flex items-end justify-start px-1 sm:px-2 pt-6 pb-0.5 gap-1 sm:gap-1.5 overflow-hidden">
                  {shelf.books.map((book) => {
                    const { palette, height } = getSpineTheme(book);
                    const isPulled = pulledBookId === book.book_id;
                    const isCompleted = book.reading_status === 'COMPLETED';
                    const isReading = book.reading_status === 'READING';
                    const isLightSpine = palette.bg === '#DCD4C4';

                    return (
                      <motion.button
                        key={book.book_id}
                        type="button"
                        onClick={() => handleSpineClick(book)}
                        animate={{
                          y: isPulled ? -16 : 0,
                          scale: isPulled ? 1.03 : 1,
                        }}
                        whileHover={{ y: -8, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 360 }}
                        className="group relative flex-1 min-w-[24px] max-w-[48px] shrink-0 flex flex-col justify-between rounded-t-xs select-none cursor-pointer text-left overflow-hidden transition-shadow"
                        style={{
                          height: `${height}px`,
                          backgroundColor: palette.bg,
                          color: palette.text,
                          boxShadow: isPulled
                            ? '0 16px 24px -4px rgba(0,0,0,0.85), 0 0 10px rgba(251,191,36,0.4)'
                            : '2px 0 5px rgba(0,0,0,0.45), inset -2px 0 4px rgba(0,0,0,0.3)',
                        }}
                        title={`"${book.title}" by ${book.authors || 'Unknown'}`}
                      >
                        {/* 1. Top Headband & Archival Paper Edge */}
                        <div className="relative z-10 w-full h-1.5 bg-[#F2EBDE] rounded-t-xs border-b border-black/40 overflow-hidden flex shrink-0">
                          <div className="w-full h-full bg-gradient-to-r from-red-700/70 via-amber-200/90 to-red-700/70 opacity-90" />
                        </div>

                        {/* 2. 3D Cylindrical Spine Curvature Lighting Shader */}
                        <div
                          className="absolute inset-0 pointer-events-none z-10 rounded-t-xs"
                          style={{
                            background:
                              'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.03) 42%, rgba(0,0,0,0.1) 78%, rgba(0,0,0,0.52) 100%)',
                          }}
                        />

                        {/* 3. Gold Tooled Call Number Header */}
                        <div className="relative z-20 w-full pt-1 px-0.5 text-center flex flex-col items-center">
                          <div
                            className="w-full border-t border-b py-0.5"
                            style={{ borderColor: `${palette.accent}50` }}
                          >
                            <span
                              className="text-[8px] font-mono tracking-widest uppercase block truncate font-bold"
                              style={{
                                color: isLightSpine ? '#8B261D' : palette.accent,
                                textShadow: isLightSpine ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
                              }}
                            >
                              {book.book_id.replace('BOOK-', '')}
                            </span>
                          </div>
                        </div>

                        {/* 4. Raised Gilt Ribs (Upper) */}
                        <div
                          className="relative z-20 w-full h-[2px] opacity-70"
                          style={{
                            backgroundColor: palette.rib,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.18)',
                          }}
                        />

                        {/* 5. Crisp Vertical Spine Title */}
                        <div className="relative z-20 my-auto py-2 flex items-center justify-center overflow-hidden w-full h-full px-0.5">
                          <span
                            className={`font-serif text-[10px] sm:text-[11px] font-medium tracking-tight text-center leading-tight line-clamp-3 select-none group-hover:text-amber-200 transition-colors ${
                              isLightSpine
                                ? 'text-slate-900 drop-shadow-xs font-semibold'
                                : 'text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                            }`}
                            style={{
                              writingMode: 'vertical-rl',
                              transform: 'rotate(180deg)',
                            }}
                          >
                            {book.title}
                          </span>
                        </div>

                        {/* 6. Raised Gilt Ribs (Lower) */}
                        <div
                          className="relative z-20 w-full h-[2px] opacity-70"
                          style={{
                            backgroundColor: palette.rib,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.18)',
                          }}
                        />

                        {/* 7. Foot Details: Author & Reading Status Dot */}
                        <div className="relative z-20 w-full pb-1 px-0.5 text-center flex flex-col items-center gap-1">
                          <p
                            className={`text-[8px] font-sans truncate font-medium w-full ${
                              isLightSpine ? 'text-slate-800' : 'text-white/85 drop-shadow-xs'
                            }`}
                          >
                            {book.authors?.split(' ')[0] || ''}
                          </p>
                          <div className="flex items-center justify-center">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]'
                                  : isReading
                                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)] animate-pulse'
                                  : isLightSpine
                                  ? 'bg-slate-400'
                                  : 'bg-white/40'
                              }`}
                              title={`Status: ${book.reading_status}`}
                            />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SOLID WALNUT SHELF PLANK */}
            <div className="relative w-full">
              {/* Plank Top Face with Warm Light Highlight */}
              <div className="h-2 w-full bg-gradient-to-r from-[#6E3F21] via-[#8F5632] to-[#6E3F21] border-t border-[#B57C53]/40 shadow-xs" />
              {/* Beveled Front Lip of the Shelf */}
              <div className="h-4 w-full bg-gradient-to-b from-[#4E2A15] to-[#30190B] border-t border-black/35 flex items-center justify-between px-3 shadow-md">
                <div className="h-[1px] w-full bg-white/10" />
              </div>
              {/* Deep Cast Shadow under the shelf board */}
              <div className="h-3 w-full bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
