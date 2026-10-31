import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Bookmark,
  Calendar,
  MapPin,
  Tag,
  BookOpen,
  Clock,
  AlertCircle,
  RefreshCw,
  Edit3,
  Star,
  Quote,
  Layers,
  Sparkles,
  Handshake,
  MessageCircle,
  RotateCcw,
  Phone,
} from 'lucide-react';
import type { Book, ReadingStatus, BookCondition, ReadingLog } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { BookCover } from './BookCover';
import { CoverPickerModal } from './CoverPickerModal';
import { fetchReadingLogs } from '../api/client';

// In-memory synopsis cache so previously fetched blurbs load with 0ms delay
const synopsisCache = new Map<string, string>();

async function fetchDynamicSynopsis(
  isbn?: string,
  title?: string,
  authors?: string
): Promise<string | null> {
  const cleanIsbn = (isbn || '').replace(/[^0-9X]/gi, '').trim();
  if (cleanIsbn && synopsisCache.has(cleanIsbn)) {
    return synopsisCache.get(cleanIsbn) || null;
  }

  // 1. Google Books API lookup
  if (cleanIsbn) {
    try {
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`
      );
      if (gbRes.ok) {
        const data = await gbRes.json();
        if (data.items && data.items.length > 0) {
          const desc = data.items[0].volumeInfo?.description;
          if (desc && desc.trim().length > 20) {
            const clean = desc.replace(/<[^>]*>/g, '').trim();
            synopsisCache.set(cleanIsbn, clean);
            return clean;
          }
        }
      }
    } catch (err) {
      console.warn('Google Books synopsis notice:', err);
    }
  }

  // 2. Open Library Work Description lookup
  if (cleanIsbn) {
    try {
      const olRes = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
      if (olRes.ok) {
        const olData = await olRes.json();
        const works = olData.works;
        if (works && works.length > 0) {
          const workKey = works[0].key;
          const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
          if (workRes.ok) {
            const workData = await workRes.json();
            const desc =
              typeof workData.description === 'string'
                ? workData.description
                : workData.description?.value;
            if (desc && desc.trim().length > 20) {
              const clean = desc.replace(/<[^>]*>/g, '').trim();
              synopsisCache.set(cleanIsbn, clean);
              return clean;
            }
          }
        }
      }
    } catch (olErr) {
      console.warn('Open Library synopsis notice:', olErr);
    }
  }

  // 3. Title + Author query fallback if ISBN was absent or unindexed
  if (title) {
    try {
      const q = encodeURIComponent(`${title} ${authors || ''}`.trim());
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
      if (gbRes.ok) {
        const data = await gbRes.json();
        if (data.items && data.items.length > 0) {
          const desc = data.items[0].volumeInfo?.description;
          if (desc && desc.trim().length > 20) {
            const clean = desc.replace(/<[^>]*>/g, '').trim();
            if (cleanIsbn) synopsisCache.set(cleanIsbn, clean);
            return clean;
          }
        }
      }
    } catch (fallbackErr) {
      // Ignore
    }
  }

  return null;
}

export const BookDetailDrawer: React.FC = () => {
  const {
    selectedBook,
    setSelectedBook,
    updateBookDetails,
    openQuickLog,
    setKeyModalOpen,
    lendingRecords,
    openLendModal,
    returnBookRecord,
  } = useLibraryStore();

  const [returningLend, setReturningLend] = useState(false);

  const [status, setStatus] = useState<ReadingStatus>('UNREAD');
  const [condition, setCondition] = useState<BookCondition>('Good');
  const [location, setLocation] = useState<string>('Home Shelf');
  const [notes, setNotes] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [loadingSynopsis, setLoadingSynopsis] = useState<boolean>(false);
  const [expandedSynopsis, setExpandedSynopsis] = useState<boolean>(false);

  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [coverModalOpen, setCoverModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (selectedBook) {
      setStatus(selectedBook.reading_status);
      setCondition(selectedBook.condition);
      setLocation(selectedBook.location || 'Home Shelf');
      setNotes(selectedBook.notes || '');
      setIsEditing(false);
      setSaveSuccess(false);
      setErrorMsg(null);
      setExpandedSynopsis(false);

      // 1. Dynamic fetch synopsis (Approach A - Zero Sheet Bloat)
      setLoadingSynopsis(true);
      const isbn = selectedBook.isbn_13 || selectedBook.isbn_10;
      fetchDynamicSynopsis(isbn, selectedBook.title, selectedBook.authors)
        .then((text) => setSynopsis(text))
        .catch(() => setSynopsis(null))
        .finally(() => setLoadingSynopsis(false));

      // 2. Load past reading sessions
      setLoadingLogs(true);
      fetchReadingLogs(selectedBook.book_id)
        .then((data) => setLogs(data))
        .catch((err) => console.warn('Could not load session history:', err))
        .finally(() => setLoadingLogs(false));
    }
  }, [selectedBook]);

  // Close on Escape key (macOS Inspector standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBook(null);
      }
    };
    if (selectedBook) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBook, setSelectedBook]);

  const genres = (selectedBook?.genre || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  const handleCancel = () => {
    if (!selectedBook) return;
    setStatus(selectedBook.reading_status);
    setCondition(selectedBook.condition);
    setLocation(selectedBook.location || 'Home Shelf');
    setNotes(selectedBook.notes || '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedBook) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await updateBookDetails(selectedBook.book_id, {
        reading_status: status,
        condition,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setErrorMsg('Authentication key required to edit books.');
        setKeyModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Failed to update book.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedBook(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Elevated Full-Screen Sheet Canvas (Bit of space on top, minimal on sides) */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 w-full h-[95vh] sm:h-[93vh] max-w-6xl mx-auto px-1 sm:px-2 md:px-3 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
            >
              <div className="w-full h-full bg-canvas dark:bg-canvas-dark border-t border-x border-rule dark:border-rule-dark rounded-t-2xl sm:rounded-t-3xl shadow-[0_-16px_50px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden">
                {/* Clean Molat Header with Volume ID */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-1 bg-ink-muted/30 rounded-full sm:hidden mr-1" />
                    <span className="font-mono text-2xs uppercase tracking-wider text-accent dark:text-accent-dark font-medium px-2 py-0.5 rounded-md bg-accent/10 dark:bg-accent/20 border border-accent/20">
                      {selectedBook.book_id}
                    </span>
                    <span className="text-3xs text-ink-muted hidden sm:inline">Volume Details & Ledger</span>
                  </div>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
                    aria-label="Close book details"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Elevated Canvas Content */}
                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
                  {errorMsg && (
                    <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {saveSuccess && (
                    <div className="p-3 text-xs rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
                      <Check size={15} />
                      <span>Book record updated successfully in Google Sheets!</span>
                    </div>
                  )}

                  {/* 2-Column Responsive Layout Using Full Space */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Left Column (Col 5): Identity, Action, Synopsis */}
                    <div className="md:col-span-5 lg:col-span-4 space-y-5">
                      {/* 1. HERO BOOK IDENTITY */}
                      <div className="flex gap-4 sm:gap-5 items-start">
                        <div className="w-24 sm:w-28 shrink-0 flex flex-col items-center gap-2">
                          <div className="w-full shadow-md rounded-lg overflow-hidden">
                            <BookCover
                              title={selectedBook.title}
                              authors={selectedBook.authors}
                              coverUrl={selectedBook.cover_url}
                              readingStatus={status}
                            />
                          </div>
                          {/* Change Cover Single-Line Button */}
                          <button
                            type="button"
                            onClick={() => setCoverModalOpen(true)}
                            className="w-full whitespace-nowrap py-1 px-2 rounded-lg border border-rule/80 dark:border-rule-dark/80 bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised text-3xs font-medium text-ink-secondary hover:text-accent dark:hover:text-accent-dark transition-colors flex items-center justify-center gap-1 shadow-2xs shrink-0"
                            title="Change or refetch cover edition"
                          >
                            <Sparkles size={11} className="text-accent dark:text-accent-dark shrink-0" />
                            <span className="whitespace-nowrap">Change Cover</span>
                          </button>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2">
                          <div className="space-y-1">
                            <h2
                              id="drawer-title"
                              className="font-serif text-lg sm:text-xl font-medium text-ink dark:text-ink-dark leading-snug"
                            >
                              {selectedBook.title}
                            </h2>
                            {selectedBook.subtitle && (
                              <p className="font-serif text-xs text-ink-secondary dark:text-ink-dark-secondary italic">
                                {selectedBook.subtitle}
                              </p>
                            )}
                            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary font-medium">
                              {selectedBook.authors || 'Unknown author'}
                            </p>

                            {/* Genre badges */}
                            {genres.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {genres.map((g, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 text-3xs font-medium text-ink-secondary"
                                  >
                                    {g}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Personal Star Rating */}
                          <div className="pt-1 text-2xs text-ink-muted">
                            {selectedBook.rating ? (
                              <span className="inline-flex items-center gap-1 font-mono font-medium text-amber-600 dark:text-amber-400">
                                <Star size={12} className="fill-amber-400 text-amber-500" />
                                <span>Personal Rating: {selectedBook.rating}/5</span>
                              </span>
                            ) : (
                              <span className="italic">Unrated volume</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. PRIMARY ACTION: LOG READING SESSION */}
                      <button
                        onClick={() => openQuickLog(selectedBook)}
                        className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
                      >
                        <BookOpen size={16} />
                        <span>Log Reading Session on This Book</span>
                      </button>

                      {/* Active Lending Banner or Lend Action */}
                      {(() => {
                        const activeLend = lendingRecords.find(
                          (r) => r.book_id === selectedBook.book_id && r.status === 'ACTIVE'
                        );

                        if (activeLend) {
                          const openWhatsApp = () => {
                            if (!activeLend.borrower_contact) return;
                            const cleanPhone = activeLend.borrower_contact.replace(/[^0-9]/g, '');
                            let text = `Hi ${activeLend.borrower_name}! Hope you're enjoying reading "${selectedBook.title}". Just checking in from my personal library collection — let me know whenever you're ready to pass it back! 📚`;
                            if (activeLend.is_overdue && activeLend.due_date) {
                              text = `Hi ${activeLend.borrower_name}! Gentle ping regarding "${selectedBook.title}" from my personal library (it was expected back around ${activeLend.due_date}). Let me know when it might be convenient to return it! 📚`;
                            }
                            const waUrl = cleanPhone
                              ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
                              : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                            window.open(waUrl, '_blank');
                          };

                          return (
                            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                  <Handshake size={14} className="text-amber-600" />
                                  <span>Currently Lent to {activeLend.borrower_name}</span>
                                </span>
                                {activeLend.is_overdue && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 text-3xs font-semibold uppercase animate-pulse">
                                    Overdue
                                  </span>
                                )}
                              </div>

                              <div className="text-3xs text-ink-secondary dark:text-ink-dark-secondary space-y-0.5">
                                <div>Lent: {activeLend.lent_date} ({activeLend.days_lent || 0}d ago)</div>
                                {activeLend.due_date && (
                                  <div className={activeLend.is_overdue ? 'text-rose-600 font-medium' : ''}>
                                    Due: {activeLend.due_date}
                                  </div>
                                )}
                                {activeLend.borrower_contact && (
                                  <div className="flex items-center gap-1 pt-0.5 text-ink-muted">
                                    <Phone size={10} />
                                    <span>{activeLend.borrower_contact}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                {activeLend.borrower_contact && (
                                  <button
                                    type="button"
                                    onClick={openWhatsApp}
                                    className="flex-1 py-1 px-2 rounded-lg border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-3xs font-medium flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <MessageCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                                    <span>WhatsApp Ping</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={returningLend}
                                  onClick={async () => {
                                    setReturningLend(true);
                                    try {
                                      await returnBookRecord(activeLend.lending_id, 'Home Shelf');
                                    } catch (err: any) {
                                      if (err.message && err.message.includes('401')) {
                                        setKeyModalOpen(true);
                                      }
                                    } finally {
                                      setReturningLend(false);
                                    }
                                  }}
                                  className="flex-1 py-1 px-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-3xs font-medium flex items-center justify-center gap-1 transition-colors"
                                >
                                  {returningLend ? (
                                    <RefreshCw size={11} className="animate-spin text-white" />
                                  ) : (
                                    <RotateCcw size={11} />
                                  )}
                                  <span>Mark Returned</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => openLendModal(selectedBook)}
                            className="w-full py-2 px-3 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised text-xs font-medium text-ink-secondary hover:text-ink transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Handshake size={14} className="text-accent" />
                            <span>Lend This Volume to Someone</span>
                          </button>
                        );
                      })()}

                      {/* 3. DYNAMIC SYNOPSIS / ABOUT THE BOOK (Approach A - Zero Sheet Bloat) */}
                      {loadingSynopsis ? (
                        <div className="p-4 rounded-xl border border-rule/50 dark:border-rule-dark/50 bg-surface/50 dark:bg-surface-dark/50 space-y-2 animate-pulse">
                          <div className="h-3 w-28 bg-rule/60 rounded" />
                          <div className="space-y-1.5 pt-1">
                            <div className="h-2.5 w-full bg-rule/40 rounded" />
                            <div className="h-2.5 w-4/5 bg-rule/40 rounded" />
                          </div>
                        </div>
                      ) : synopsis ? (
                        <div className="p-4 rounded-xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-2 shadow-2xs">
                          <span className="text-3xs uppercase tracking-wider text-ink-muted font-medium flex items-center gap-1.5">
                            <Quote size={11} className="text-accent" />
                            About the Work
                          </span>
                          <p
                            className={`font-serif text-xs text-ink-secondary dark:text-ink-dark-secondary italic leading-relaxed whitespace-pre-wrap ${
                              !expandedSynopsis ? 'line-clamp-5' : ''
                            }`}
                          >
                            "{synopsis}"
                          </p>
                          {synopsis.length > 220 && (
                            <button
                              type="button"
                              onClick={() => setExpandedSynopsis(!expandedSynopsis)}
                              className="text-3xs font-medium text-accent dark:text-accent-dark hover:underline flex items-center gap-0.5 pt-0.5"
                            >
                              {expandedSynopsis ? 'Show less' : '... Read more'}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Right Column (Col 7): Status/Location, Volume Ledger, History */}
                    <div className="md:col-span-7 lg:col-span-8 space-y-5">
                      {/* 4. STATUS, SHELF LOCATION & NOTES (EDITABLE IN-PLACE) */}
                <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-ink-muted">
                      Status & Shelf Placement
                    </h3>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-2xs font-medium text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
                      >
                        <Edit3 size={11} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="space-y-2.5 text-xs">
                      {/* Simple Clean Status & Shelf Location Grid */}
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-raised/70 dark:bg-surface-dark-raised/70 border border-rule/40 dark:border-rule-dark/40">
                        <div className="space-y-1">
                          <span className="text-3xs uppercase tracking-wider text-ink-muted block font-medium">
                            Reading Status
                          </span>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                status === 'READING'
                                  ? 'bg-accent animate-pulse'
                                  : status === 'COMPLETED'
                                  ? 'bg-emerald-600'
                                  : status === 'PAUSED'
                                  ? 'bg-purple-500'
                                  : status === 'ABANDONED'
                                  ? 'bg-rose-500'
                                  : 'bg-ink-muted/60'
                              }`}
                            />
                            <span className="font-serif text-xs font-medium text-ink dark:text-ink-dark">
                              {status === 'READING'
                                ? 'Currently Reading'
                                : status === 'COMPLETED'
                                ? 'Completed'
                                : status === 'PAUSED'
                                ? 'Paused'
                                : status === 'ABANDONED'
                                ? 'Abandoned'
                                : 'To Be Read'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-3xs uppercase tracking-wider text-ink-muted block font-medium flex items-center gap-1">
                            <MapPin size={11} className="text-accent shrink-0" />
                            Shelf Location
                          </span>
                          <span className="font-serif text-xs font-medium text-ink dark:text-ink-dark truncate block pt-0.5">
                            {location || 'Home Shelf'}
                          </span>
                        </div>
                      </div>

                      {notes && (
                        <div className="pt-2 border-t border-rule/40 dark:border-rule-dark/40 text-xs">
                          <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block mb-0.5">
                            Inscription / Personal Notes
                          </span>
                          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary italic whitespace-pre-wrap">
                            "{notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Inline Edit Form */
                    <div className="space-y-3 pt-1">
                      {/* Top Row: Reading Status & Shelf Location side-by-side */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                            Reading Status
                          </label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as ReadingStatus)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                          >
                            <option value="UNREAD">UNREAD</option>
                            <option value="READING">READING</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="PAUSED">PAUSED</option>
                            <option value="ABANDONED">ABANDONED</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1">
                            <MapPin size={11} className="text-accent" />
                            Shelf Location
                          </label>
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Home Shelf, Top Rack"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                          Physical Condition
                        </label>
                        <select
                          value={condition}
                          onChange={(e) => setCondition(e.target.value as BookCondition)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                        >
                          <option value="New">New</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="Damaged">Damaged</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                          Notes / Inscription
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Ownership inscription, notes, or quotes..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-3 py-1.5 rounded-lg border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          {saving ? (
                            <>
                              <RefreshCw size={12} className="animate-spin text-white" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. VOLUME & EDITION DETAILS (PHYSICAL CONDITION DISPLAYED ONCE HERE) */}
                <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-2.5 text-xs shadow-2xs">
                  <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-ink-muted">
                    Volume & Edition Details
                  </h3>

                  <div className="divide-y divide-rule/50 dark:divide-rule-dark/50 space-y-2">
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-ink-muted">Publisher</span>
                      <span className="font-medium text-ink dark:text-ink-dark">
                        {selectedBook.publisher || 'Unspecified'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-ink-muted">Publication Year</span>
                      <span className="font-mono text-ink dark:text-ink-dark">
                        {selectedBook.publication_year || '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-ink-muted">Language</span>
                      <span className="text-ink dark:text-ink-dark">
                        {selectedBook.language || 'English'}
                      </span>
                    </div>

                    {/* Physical Condition shown ONCE cleanly in the edition ledger */}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-ink-muted">Physical Condition</span>
                      <span className="font-medium text-ink dark:text-ink-dark">
                        {condition || 'Good'}
                      </span>
                    </div>

                    {selectedBook.rp !== undefined && selectedBook.rp > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-ink-muted">Retail Price (MRP)</span>
                        <span className="font-mono font-medium text-ink dark:text-ink-dark">
                          ₹{selectedBook.rp.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {selectedBook.purchase_price !== undefined && selectedBook.purchase_price > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-ink-muted">Acquisition Cost</span>
                        <span className="font-mono text-ink-secondary dark:text-ink-dark-secondary">
                          ₹{selectedBook.purchase_price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-ink-muted">Acquired Date</span>
                      <span className="font-mono text-ink dark:text-ink-dark">
                        {selectedBook.purchase_date || '—'}
                      </span>
                    </div>

                    {(selectedBook.isbn_13 || selectedBook.isbn_10) && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-ink-muted">ISBN (13 / 10)</span>
                        <span className="font-mono text-ink dark:text-ink-dark text-3xs">
                          {[selectedBook.isbn_13, selectedBook.isbn_10].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. PAST READING SESSIONS */}
                <div className="space-y-2.5">
                  <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Clock size={14} className="text-accent" />
                    <span>Session History ({logs.length})</span>
                  </h3>

                  {loadingLogs ? (
                    <p className="text-2xs text-ink-muted italic">Loading sessions...</p>
                  ) : logs.length === 0 ? (
                    <p className="text-2xs text-ink-muted italic p-3 rounded-xl border border-rule/50 bg-surface/50 text-center">
                      No reading sessions recorded for this volume yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {logs.map((log) => (
                        <div
                          key={log.log_id}
                          className="p-3 rounded-xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-2xs text-ink-muted">
                              {log.session_date}
                            </span>
                            <span className="font-mono text-accent dark:text-accent-dark font-medium">
                              +{log.pages_read} pages ({log.duration_minutes}m)
                            </span>
                          </div>
                          {log.session_note && (
                            <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary italic">
                              "{log.session_note}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alternative Cover Picker Modal */}
      {selectedBook && (
        <CoverPickerModal
          book={selectedBook}
          isOpen={coverModalOpen}
          onClose={() => setCoverModalOpen(false)}
          onSaveCover={async (newUrl: string) => {
            await updateBookDetails(selectedBook.book_id, { cover_url: newUrl });
          }}
        />
      )}
    </>
  );
};
