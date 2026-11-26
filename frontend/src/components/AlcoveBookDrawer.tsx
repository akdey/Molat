import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, BookOpen, MapPin, Users, Check, Hand } from 'lucide-react';
import type { AlcoveBookItem, Book, ReadingStatus } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { updateAlcoveBookState, updateAlcoveBookHolder } from '../api/client';
import { BookCover } from './BookCover';

interface AlcoveBookDrawerProps {
  book: AlcoveBookItem | null;
  onClose: () => void;
}

export const AlcoveBookDrawer: React.FC<AlcoveBookDrawerProps> = ({ book, onClose }) => {
  const { authUser, loadAlcoves, openQuickLog, addToast } = useLibraryStore();

  const [status, setStatus] = useState<ReadingStatus>('UNREAD');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [holderInput, setHolderInput] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (book) {
      setStatus(book.my_reading_status || 'UNREAD');
      setCurrentPage(book.my_current_page || 0);
      setRating(book.my_rating ?? null);
      setNotes(book.my_notes || '');
      setHolderInput(book.held_by_label || '');
    }
  }, [book]);

  const handleSavePersonalState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;
    setSaving(true);
    try {
      await updateAlcoveBookState(book.book_id, {
        reading_status: status,
        current_page: currentPage,
        rating,
        notes: notes.trim() || null,
      });
      await loadAlcoves();
      addToast('Saved your personal reading progress!', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Could not save reading state', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateHolder = async (nextHolder: string | null) => {
    if (!book) return;
    setSaving(true);
    try {
      await updateAlcoveBookHolder(book.book_id, nextHolder);
      setHolderInput(nextHolder || '');
      await loadAlcoves();
      addToast(nextHolder ? `Updated copy holder to ${nextHolder}` : 'Returned to shared shelf', 'success');
    } catch (err: any) {
      addToast(err.message || 'Could not update holder', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenQuickLog = () => {
    if (!book) return;
    const projection: Book = {
      book_id: book.book_id,
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authors,
      isbn_10: book.isbn_10,
      isbn_13: book.isbn_13,
      publisher: book.publisher,
      publication_year: book.publication_year,
      language: book.language,
      genre: book.genres.join(', '),
      cover_url: book.cover_url,
      reading_status: status,
      condition: book.condition,
      location: book.location,
      rating: rating ?? undefined,
      notes: notes || undefined,
      alcove_id: book.alcove_id,
      held_by_label: book.held_by_label,
      created_at: '',
      updated_at: '',
    };
    onClose();
    openQuickLog(projection);
  };

  return (
    <AnimatePresence>
      {book && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 dark:bg-black/60 backdrop-blur-xs">
          <div className="flex-1" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="w-full max-w-md bg-canvas dark:bg-canvas-dark border-l border-rule dark:border-rule-dark h-full overflow-y-auto p-5 sm:p-6 space-y-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-2xs font-medium text-accent uppercase tracking-wider">
                <Users size={13} />
                <span>Shared Alcove Volume</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-ink-muted min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Book Summary */}
            <div className="flex gap-4">
              <div className="w-24 shrink-0">
                <BookCover
                  title={book.title}
                  authors={book.authors}
                  coverUrl={book.cover_url}
                  readingStatus={status}
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark leading-snug">
                  {book.title}
                </h2>
                <p className="text-xs text-ink-secondary">{book.authors || 'Unknown author'}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-3xs text-ink-muted">
                  <span className="px-2 py-0.5 rounded-md bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 font-mono">
                    Owned by ex/{book.owner_username}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} />
                    {book.location || 'Home Shelf'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Log CTA */}
            <button
              type="button"
              onClick={handleOpenQuickLog}
              className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-2 min-h-[44px] cursor-pointer transition-colors shadow-xs"
            >
              <BookOpen size={15} />
              <span>Log Reading Session (Advances Your Streak)</span>
            </button>

            {/* Nightstand / Physical Copy Holder */}
            <div className="p-4 rounded-2xl border border-rule/70 dark:border-rule-dark/70 bg-surface dark:bg-surface-dark space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                  <Hand size={14} className="text-accent" />
                  Who Has This Copy?
                </span>
                {book.held_by_label && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleUpdateHolder(null)}
                    className="text-3xs text-accent hover:underline cursor-pointer"
                  >
                    Return to Shelf
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={holderInput}
                  onChange={(e) => setHolderInput(e.target.value)}
                  placeholder={`e.g. ex/${authUser || 'amit'} or Nightstand`}
                  className="flex-1 px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleUpdateHolder(holderInput.trim() || `ex/${authUser || 'reader'}`)}
                  className="px-3 py-2 rounded-xl border border-rule dark:border-rule-dark hover:border-accent text-xs font-medium cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Personal Reading Journey Form */}
            <form onSubmit={handleSavePersonalState} className="space-y-4 p-4 rounded-2xl border border-rule/70 dark:border-rule-dark/70 bg-surface dark:bg-surface-dark">
              <div>
                <h3 className="font-serif text-sm font-semibold text-ink dark:text-ink-dark">
                  Your Personal Reading Journey
                </h3>
                <p className="text-3xs text-ink-muted">
                  Saved privately to your account—never overwrites ex/{book.owner_username}&rsquo;s status or notes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-3xs font-medium text-ink-secondary mb-1">My Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ReadingStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[40px]"
                  >
                    <option value="UNREAD">UNREAD</option>
                    <option value="READING">READING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="ABANDONED">ABANDONED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-3xs font-medium text-ink-secondary mb-1">My Current Page</label>
                  <input
                    type="number"
                    min={0}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-3xs font-medium text-ink-secondary mb-1">My Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      className="p-1.5 rounded-lg hover:bg-canvas dark:hover:bg-canvas-dark cursor-pointer"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        size={18}
                        className={
                          rating && star <= rating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-ink-muted opacity-40'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-3xs font-medium text-ink-secondary mb-1">My Private Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Personal thoughts, quotes, or margin notes..."
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-ink dark:bg-accent text-white text-xs font-medium flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer disabled:opacity-50"
              >
                <Check size={15} />
                <span>{saving ? 'Saving...' : 'Save Personal State'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
