import React, { useState, useEffect } from 'react';
import { X, Check, Bookmark, Calendar, MapPin, DollarSign, Tag, BookOpen, Clock, AlertCircle, RefreshCw, Edit3 } from 'lucide-react';
import type { Book, ReadingStatus, BookCondition, ReadingLog } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { BookCover } from './BookCover';
import { fetchReadingLogs } from '../api/client';

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

      // Load past sessions for this book
      setLoadingLogs(true);
      fetchReadingLogs(selectedBook.book_id)
        .then((data) => setLogs(data))
        .catch((err) => console.warn('Could not load session history:', err))
        .finally(() => setLoadingLogs(false));
    }
  }, [selectedBook]);

  if (!selectedBook) return null;

  const cp = selectedBook.purchase_price || 0;
  const rp = selectedBook.rp || 0;
  const saved = Math.max(0, rp - cp);
  const discount = rp > 0 ? Math.round((saved / rp) * 100) : 0;

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-wider text-accent dark:text-accent-dark font-medium">
              {selectedBook.book_id}
            </span>
          </div>
          <button
            onClick={() => setSelectedBook(null)}
            className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
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

          {/* Book Primary Card */}
          <div className="flex gap-4">
            <div className="w-24 shrink-0">
              <BookCover
                title={selectedBook.title}
                authors={selectedBook.authors}
                coverUrl={selectedBook.cover_url}
                readingStatus={status}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h2 id="drawer-title" className="font-serif text-lg font-medium text-ink dark:text-ink-dark leading-snug">
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
              <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-muted pt-1">
                <span>{selectedBook.publisher || 'Publisher unspecified'}</span>
                <span>•</span>
                <span>{selectedBook.publication_year || 'Year n/a'}</span>
                <span>•</span>
                <span>{selectedBook.language || 'English'}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => {
              openQuickLog(selectedBook);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <BookOpen size={16} />
            <span>Log Reading Session on This Book</span>
          </button>

          {/* Status & Location Section */}
          <div className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
                Status & Location
              </h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium text-ink-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised border border-rule/60 dark:border-rule-dark/60 transition-colors"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {!isEditing ? (
              /* Read-only presentation */
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                      Reading Status
                    </span>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-2xs font-mono font-medium uppercase bg-surface-raised dark:bg-surface-dark-raised border border-rule/60 dark:border-rule-dark/60 text-ink dark:text-ink-dark">
                      {status}
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                      Physical Condition
                    </span>
                    <span className="inline-block mt-1 text-xs text-ink dark:text-ink-dark font-medium">
                      {condition}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-rule/40 dark:border-rule-dark/40 flex items-center gap-1.5 text-xs text-ink-secondary dark:text-ink-dark-secondary">
                  <MapPin size={13} className="text-ink-muted shrink-0" />
                  <span>{location || 'Home Shelf'}</span>
                </div>

                {notes && (
                  <div className="pt-2 border-t border-rule/40 dark:border-rule-dark/40 text-xs">
                    <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block mb-0.5">
                      Notes / Inscription
                    </span>
                    <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary italic whitespace-pre-wrap">
                      "{notes}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Active Edit Form */
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  {/* Reading Status */}
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

                  {/* Condition */}
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

                {/* Shelf Location */}
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

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                    Notes / Inscription
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ownership notes, book marks, or quotes..."
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
                    className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Volume & Publication Details */}
          <div className="space-y-2">
            <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
              Volume & Publication Details
            </h3>
            <div className="p-3 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Publisher</span>
                <span className="font-medium text-ink dark:text-ink-dark">{selectedBook.publisher || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Publication Year</span>
                <span className="font-mono text-ink dark:text-ink-dark">{selectedBook.publication_year || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Language</span>
                <span className="text-ink dark:text-ink-dark">{selectedBook.language || 'English'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Acquired Date</span>
                <span className="font-mono text-ink dark:text-ink-dark">{selectedBook.purchase_date || '—'}</span>
              </div>
              {selectedBook.purchase_price !== undefined && selectedBook.purchase_price > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-rule/50 dark:border-rule-dark/50">
                  <span className="text-ink-muted">Acquisition Price</span>
                  <span className="font-mono text-ink-secondary dark:text-ink-dark-secondary">₹{selectedBook.purchase_price.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted">ISBN-13</span>
                <span className="font-mono text-ink dark:text-ink-dark">{selectedBook.isbn_13 || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">ISBN-10</span>
                <span className="font-mono text-ink dark:text-ink-dark">{selectedBook.isbn_10 || '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-ink-muted shrink-0">Genre / Categories</span>
                <div className="flex flex-wrap justify-end gap-1.5 max-w-[70%]">
                  {selectedBook.genre ? (
                    selectedBook.genre
                      .split(',')
                      .map((g) => g.trim())
                      .filter(Boolean)
                      .map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 text-2xs font-medium text-ink dark:text-ink-dark"
                        >
                          {g}
                        </span>
                      ))
                  ) : (
                    <span className="text-ink-muted">General</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Rating</span>
                <span>{selectedBook.rating ? `★ ${selectedBook.rating}/5` : 'Unrated'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Catalogue ID</span>
                <span className="font-mono text-ink dark:text-ink-dark">{selectedBook.book_id}</span>
              </div>
            </div>
          </div>

          {/* Past Reading Sessions */}
          <div className="space-y-2.5">
            <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark flex items-center gap-1.5">
              <Clock size={14} className="text-accent" />
              Session History ({logs.length})
            </h3>
            {loadingLogs ? (
              <p className="text-2xs text-ink-muted italic">Loading sessions...</p>
            ) : logs.length === 0 ? (
              <p className="text-2xs text-ink-muted italic">No reading logs recorded for this book yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.log_id}
                    className="p-3 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs space-y-1"
                  >
                    <div className="flex justify-between font-mono text-2xs text-ink-muted">
                      <span>{log.session_date}</span>
                      <span>{log.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-ink dark:text-ink-dark">
                        Pages {log.start_page} – {log.end_page} ({log.pages_read} pages)
                      </span>
                    </div>
                    {log.session_note && (
                      <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary italic pt-0.5">
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

