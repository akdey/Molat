import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Book } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { BookCover } from './BookCover';
import {
  BookOpen,
  X,
  MapPin,
  Bookmark,
  Sparkles,
  CheckCircle2,
  Handshake,
  ArrowRight,
  Star,
  ExternalLink,
  Flame,
  Volume2,
} from 'lucide-react';

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

// Deterministic string hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate deterministic realistic physical spine characteristics
function getSpineSpecs(book: Book) {
  const hash = hashString(book.book_id + book.title);
  const palette = PALETTES[hash % PALETTES.length];

  // Height variance: 195px to 230px (paperback vs hardcover)
  const height = 195 + (hash % 36);

  // Width variance: 28px to 42px (page thickness)
  // Higher page counts or longer titles give thicker spine
  const width = 28 + (hash % 15);

  return { palette, height, width };
}

export const SpineView: React.FC<SpineViewProps> = ({ books }) => {
  const { setSelectedBook, openQuickLog, openLendModal } = useLibraryStore();

  // Interactive Book Selection & Page-Turning State
  const [pulledBookId, setPulledBookId] = useState<string | null>(null);
  const [openedBook, setOpenedBook] = useState<Book | null>(null);
  const [isPageFlipping, setIsPageFlipping] = useState<boolean>(false);
  const [activeShelfFilter, setActiveShelfFilter] = useState<string>('ALL');

  const pullTimerRef = useRef<any>(null);

  // Synthesize realistic paper rustle / page turn swoosh sound
  const playPageTurnSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // Filtered pink noise flutter
      const bufferSize = ctx.sampleRate * 0.22;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 1.8;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.22);
      filter.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.23);
    } catch {
      // Audio autoplay restrictions fallback gracefully
    }
  };

  // Mobile haptic vibration
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  // Group books by physical shelf location or chunk into realistic rows
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

    // If books are filtered by a single location or multiple locations exist
    locations.forEach((bookList, locName) => {
      // If a location has many books, split into sub-shelves (e.g., Row 1, Row 2 of ~14 books)
      const chunkSize = 14;
      for (let i = 0; i < bookList.length; i += chunkSize) {
        const chunk = bookList.slice(i, i + chunkSize);
        const shelfNum = Math.floor(i / chunkSize) + 1;
        const displayName =
          bookList.length > chunkSize
            ? `${locName} • Tier ${shelfNum}`
            : locName;
        result.push({
          id: `${locName}-${i}`,
          name: displayName,
          books: chunk,
        });
      }
    });

    return result;
  }, [books]);

  // Distinct location list for filter chips
  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => set.add(b.location || 'Home Shelf'));
    return Array.from(set).sort();
  }, [books]);

  // Handle clicking a book spine: Pull out -> Flip open page turn -> Show Details
  const handleSpineClick = (book: Book) => {
    triggerHaptic(25);
    setPulledBookId(book.book_id);

    // After brief pull-out gesture (240ms), open the 3D book cover
    if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
    pullTimerRef.current = setTimeout(() => {
      setOpenedBook(book);
      setIsPageFlipping(true);
      playPageTurnSound();
      triggerHaptic([15, 30]);

      // Complete page-turn swing
      setTimeout(() => {
        setIsPageFlipping(false);
      }, 480);
    }, 220);
  };

  const handleCloseBook = () => {
    setIsPageFlipping(true);
    playPageTurnSound();
    triggerHaptic(15);
    setTimeout(() => {
      setIsPageFlipping(false);
      setOpenedBook(null);
      setPulledBookId(null);
    }, 320);
  };

  useEffect(() => {
    return () => {
      if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Bookcase Header & Shelf Location Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-ink dark:text-ink-dark flex items-center gap-2">
            <span>Library Bookcase</span>
            <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono">
              {books.length} Volumes
            </span>
          </h3>
          <p className="text-3xs text-ink-muted">
            Tactile Spines &bull; Tap any spine to pull it from the shelf and open its title page
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

      {/* 2. REALISTIC WOODEN BOOKCASE CASING */}
      <div className="relative rounded-2xl bg-[#26150B] dark:bg-[#140B06] border-4 border-[#3A1F11] dark:border-[#201008] shadow-2xl overflow-hidden p-2.5 sm:p-4 space-y-6">
        {/* Bookshelf inner shadow gradient for deep recessed lighting */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none z-10" />

        {shelves
          .filter((s) => activeShelfFilter === 'ALL' || s.name.startsWith(activeShelfFilter))
          .map((shelf, shelfIdx) => (
            <div key={shelf.id} className="relative z-20 space-y-1">
              {/* Brass / Wood Nameplate */}
              <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                  <span className="text-3xs uppercase tracking-widest font-mono text-amber-200/90 font-bold drop-shadow-xs">
                    {shelf.name}
                  </span>
                </div>
                <span className="text-3xs font-mono text-amber-300/60">
                  {shelf.books.length} bks
                </span>
              </div>

              {/* Shelf Compartment & Book Row */}
              <div className="relative min-h-[235px] flex items-end">
                {/* Horizontal Scrollable Book Row */}
                <div className="w-full overflow-x-auto no-scrollbar scroll-smooth flex items-end px-3 pt-6 pb-0.5 gap-1 sm:gap-1.5">
                  {shelf.books.map((book) => {
                    const { palette, height, width } = getSpineSpecs(book);
                    const isPulled = pulledBookId === book.book_id;
                    const isCompleted = book.reading_status === 'COMPLETED';
                    const isReading = book.reading_status === 'READING';

                    return (
                      <motion.button
                        key={book.book_id}
                        onClick={() => handleSpineClick(book)}
                        animate={{
                          y: isPulled ? -20 : 0,
                          scale: isPulled ? 1.05 : 1,
                        }}
                        whileHover={{ y: -10, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                        className="group relative shrink-0 flex flex-col justify-between rounded-t-sm select-none cursor-pointer text-left transition-shadow"
                        style={{
                          height: `${height}px`,
                          width: `${width}px`,
                          backgroundColor: palette.bg,
                          color: palette.text,
                          boxShadow: isPulled
                            ? '0 16px 24px -4px rgba(0,0,0,0.7), 0 0 12px rgba(251,191,36,0.3)'
                            : '2px 0 5px rgba(0,0,0,0.35), inset -2px 0 4px rgba(0,0,0,0.3)',
                        }}
                        title={`"${book.title}" by ${book.authors || 'Unknown'} • Tap to pull & open`}
                      >
                        {/* 1. Realistic Top Headband & Archival Paper Edge */}
                        <div className="w-full h-1.5 bg-[#EFE7D8] rounded-t-xs border-b border-black/40 overflow-hidden flex">
                          <div className="w-full h-full bg-gradient-to-r from-red-700/60 via-amber-200/80 to-red-700/60 opacity-80" />
                        </div>

                        {/* 2. 3D Cylindrical Spine Curvature Specular Lighting Shader */}
                        <div
                          className="absolute inset-0 pointer-events-none rounded-t-xs"
                          style={{
                            background:
                              'linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(255,255,255,0.22) 18%, rgba(255,255,255,0.03) 42%, rgba(0,0,0,0.08) 78%, rgba(0,0,0,0.52) 100%)',
                          }}
                        />

                        {/* 3. Gold Tooled Header Band & Call Number */}
                        <div className="relative z-10 w-full pt-1 px-0.5 text-center flex flex-col items-center">
                          <div
                            className="w-full border-t border-b py-0.5"
                            style={{ borderColor: `${palette.accent}40` }}
                          >
                            <span
                              className="text-[8px] font-mono tracking-widest uppercase block truncate font-bold"
                              style={{ color: palette.accent }}
                            >
                              {book.book_id.replace('BOOK-', '')}
                            </span>
                          </div>
                        </div>

                        {/* 4. Raised Gilt Ribs (Upper) */}
                        <div
                          className="relative z-10 w-full h-[2px] opacity-60"
                          style={{
                            backgroundColor: palette.rib,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.2)',
                          }}
                        />

                        {/* 5. Elegant Vertical Spine Title */}
                        <div className="relative z-10 my-auto py-2 flex items-center justify-center overflow-hidden w-full h-full">
                          <span
                            className="font-serif text-[10px] sm:text-[11px] font-medium tracking-tight text-center leading-tight line-clamp-3 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] group-hover:brightness-110 transition-all"
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
                          className="relative z-10 w-full h-[2px] opacity-60"
                          style={{
                            backgroundColor: palette.rib,
                            boxShadow: '0 1px 0 rgba(255,255,255,0.2)',
                          }}
                        />

                        {/* 7. Foot Details: Author & Reading Status Dot */}
                        <div className="relative z-10 w-full pb-1 px-0.5 text-center flex flex-col items-center gap-1">
                          <p className="text-[8px] font-sans truncate opacity-85 w-full drop-shadow-xs">
                            {book.authors?.split(' ')[0] || ''}
                          </p>
                          <div className="flex items-center justify-center">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]'
                                  : isReading
                                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-pulse'
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

      {/* 3. INTERACTIVE 3D BOOK COVER OPENING & PAGE-TURN FOLIO MODAL */}
      <AnimatePresence>
        {openedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            {/* Ambient Library Dim with Cozy Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
              onClick={handleCloseBook}
            />

            {/* 3D BOOK ENCLOSURE WITH PAGE TURN EFFECT */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 25 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col select-none"
              style={{ perspective: '1400px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Book Spine Top Banner */}
              <div className="flex items-center justify-between pb-2 px-1 text-white/80">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-400" />
                  <span className="text-xs font-serif italic text-amber-200">
                    Opened from {openedBook.location || 'Library Shelf'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseBook}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  aria-label="Close Book"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 3D OPEN TWO-PAGE SPREAD (ARCHIVAL LITERARY FOLIO) */}
              <div
                className="relative rounded-2xl bg-[#FBF8F1] dark:bg-[#1D2026] text-slate-850 dark:text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-2 border-[#E5DAC8] dark:border-[#2D333F] overflow-hidden flex flex-col md:flex-row transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Book Gutter Center Shadow Crease */}
                <div
                  className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none z-20"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.03) 25%, transparent 50%, rgba(0,0,0,0.03) 75%, rgba(0,0,0,0.18) 100%)',
                  }}
                />

                {/* LEFT PAGE: FRONTISPIECE & BOOK JACKET */}
                <div className="w-full md:w-1/2 p-5 sm:p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-[#E8DEC9] dark:border-[#2A303C] bg-gradient-to-br from-[#FAF5EB] to-[#F5EEDB] dark:from-[#1A1D24] dark:to-[#171A20] relative">
                  {/* Subtle Book Cloth Paper Texture Overlay */}
                  <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:12px_12px]" />

                  {/* Top Call Number Tag */}
                  <div className="w-full flex items-center justify-between pb-3 text-3xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-accent">
                      <Bookmark size={11} />
                      {openedBook.book_id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[9px] font-bold">
                      {openedBook.reading_status}
                    </span>
                  </div>

                  {/* Center Cover Graphic */}
                  <div className="w-32 sm:w-36 my-auto py-2 shadow-xl rounded-md overflow-hidden hover:scale-105 transition-transform duration-300">
                    <BookCover
                      title={openedBook.title}
                      authors={openedBook.authors}
                      coverUrl={openedBook.cover_url}
                      readingStatus={openedBook.reading_status}
                    />
                  </div>

                  {/* Rating / Format Footer */}
                  <div className="w-full pt-3 border-t border-[#E8DEC9] dark:border-[#2A303C] text-center flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={
                          star <= (openedBook.rating || 0)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 dark:text-slate-700'
                        }
                      />
                    ))}
                    {openedBook.rating ? (
                      <span className="text-2xs font-semibold font-mono ml-1 text-amber-600 dark:text-amber-400">
                        {openedBook.rating}/5
                      </span>
                    ) : (
                      <span className="text-3xs text-ink-muted ml-1">Unrated</span>
                    )}
                  </div>
                </div>

                {/* RIGHT PAGE: EDITORIAL TITLE PAGE & READING ACTIONS */}
                <div className="w-full md:w-1/2 p-5 sm:p-6 flex flex-col justify-between bg-[#FDFBF7] dark:bg-[#1E222A] relative">
                  <div className="space-y-3.5">
                    {/* Location Badge */}
                    <div className="flex items-center gap-1.5 text-3xs text-slate-500 dark:text-slate-400 font-sans font-medium">
                      <MapPin size={11} className="text-accent shrink-0" />
                      <span>{openedBook.location || 'Physical Shelf'}</span>
                      {openedBook.genre && (
                        <>
                          <span>&bull;</span>
                          <span className="truncate">{openedBook.genre}</span>
                        </>
                      )}
                    </div>

                    {/* Book Title & Author */}
                    <div>
                      <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                        {openedBook.title}
                      </h2>
                      {openedBook.subtitle && (
                        <p className="font-serif text-xs text-slate-600 dark:text-slate-400 italic mt-0.5">
                          {openedBook.subtitle}
                        </p>
                      )}
                      <p className="text-xs text-accent font-medium mt-1">
                        By {openedBook.authors || 'Unknown Author'}
                      </p>
                    </div>

                    {/* Synopsis / Excerpt */}
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-slate-800/40 border border-amber-200/50 dark:border-slate-700/60 text-2xs leading-relaxed text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto no-scrollbar font-serif">
                      {openedBook.notes ? (
                        <p className="italic">&ldquo;{openedBook.notes}&rdquo;</p>
                      ) : (
                        <p className="italic text-slate-500">
                          {openedBook.reading_status === 'COMPLETED'
                            ? 'Volume completed and cataloged on your personal shelf.'
                            : openedBook.reading_status === 'READING'
                            ? 'Active reading volume. Track your progress with Molat Voice or Quick Log.'
                            : 'Unread volume waiting in your physical collection.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Log, Lend, Full 21-Column Details */}
                  <div className="space-y-2 pt-4 border-t border-[#E8DEC9] dark:border-[#2A303C]">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const b = openedBook;
                          handleCloseBook();
                          openQuickLog(b);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-semibold shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <Flame size={13} />
                        <span>Log Session</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const b = openedBook;
                          handleCloseBook();
                          openLendModal(b);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised dark:bg-surface-dark-raised border border-rule/70 dark:border-rule-dark/70 text-ink dark:text-ink-dark text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                      >
                        <Handshake size={13} className="text-accent" />
                        <span>Lend Book</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const b = openedBook;
                          handleCloseBook();
                          setSelectedBook(b);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Full 21-Col Record</span>
                        <ArrowRight size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseBook}
                        className="px-3 py-2 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium text-ink-muted hover:text-ink active:scale-95 transition-all cursor-pointer"
                      >
                        Return to Shelf
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
