import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { Book, ReadingStatus, BookCondition, ReadingLog } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { BookCover } from './BookCover';
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
  } = useLibraryStore();

  const [status, setStatus] = useState<ReadingStatus>('UNREAD');
  const [condition, setCondition] = useState<BookCondition>('Good');
  const [location, setLocation] = useState<string>('Home Shelf');
  const [notes, setNotes] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [loadingSynopsis, setLoadingSynopsis] = useState<boolean>(false);

  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBook) {
      setStatus(selectedBook.reading_status);
      setCondition(selectedBook.condition);
      setLocation(selectedBook.location || 'Home Shelf');
      setNotes(selectedBook.notes || '');
      setIsEditing(false);
      setSaveSuccess(false);
      setErrorMsg(null);

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

  if (!selectedBook) return null;

  const genres = (selectedBook.genre || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  const handleCancel = () => {
    setStatus(selectedBook.reading_status);
    setCondition(selectedBook.condition);
    setLocation(selectedBook.location || 'Home Shelf');
    setNotes(selectedBook.notes || '');
    setIsEditing(false);
  };

  const handleSave = async () => {
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-canvas dark:bg-canvas-dark border-l border-rule dark:border-rule-dark h-full shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-wider text-accent dark:text-accent-dark font-medium">
              {selectedBook.book_id}
            </span>
          </div>
          <button
            onClick={() => setSelectedBook(null)}
            className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
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

          {/* 1. HERO BOOK IDENTITY */}
          <div className="flex gap-4">
            <div className="w-24 shrink-0 shadow-md rounded-lg overflow-hidden">
              <BookCover
                title={selectedBook.title}
                authors={selectedBook.authors}
                coverUrl={selectedBook.cover_url}
                readingStatus={status}
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div className="space-y-1">
                {/* Status indicator dot + text */}
                <div className="flex items-center gap-1.5 pb-0.5">
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
                  <span className="font-serif text-2xs font-medium text-ink-secondary dark:text-ink-dark-secondary">
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

                <h2
                  id="drawer-title"
                  className="font-serif text-lg font-medium text-ink dark:text-ink-dark leading-snug"
                >
                  {selectedBook.title}
                </h2>
                {selectedBook.subtitle && (
                  <p className="font-serif text-xs text-ink-secondary dark:text-ink-dark-secondary italic">
                    {selectedBook.subtitle}
                  </p>
                )}
                <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
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
              <div className="pt-2 text-2xs text-ink-muted">
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
            <div className="p-4 rounded-xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-1.5 shadow-2xs">
              <span className="text-3xs uppercase tracking-wider text-ink-muted font-medium flex items-center gap-1.5">
                <Quote size={11} className="text-accent" />
                About the Work
              </span>
              <p className="font-serif text-xs text-ink-secondary dark:text-ink-dark-secondary italic leading-relaxed whitespace-pre-wrap">
                "{synopsis}"
              </p>
            </div>
          ) : null}

          {/* 4. STATUS, SHELF LOCATION & NOTES (EDITABLE IN-PLACE) */}
          <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-ink-muted">
                Shelf Placement & Notes
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
                <div className="flex items-center gap-2 text-ink dark:text-ink-dark">
                  <MapPin size={14} className="text-accent shrink-0" />
                  <span className="font-serif font-medium">{location || 'Home Shelf'}</span>
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
                </div>

                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1">
                    <MapPin size={11} />
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
  );
};
