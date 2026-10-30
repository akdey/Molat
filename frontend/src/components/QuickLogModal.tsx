import React, { useState, useEffect } from 'react';
import { X, Check, Star, BookOpen, Clock, FileText, RefreshCw } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const QuickLogModal: React.FC = () => {
  const {
    books,
    quickLogOpen,
    quickLogBook,
    closeQuickLog,
    submitReadingLog,
    setKeyModalOpen,
    libraryKey,
    authToken,
  } = useLibraryStore();

  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [startPage, setStartPage] = useState<number>(0);
  const [endPage, setEndPage] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [sessionNote, setSessionNote] = useState<string>('');
  const [finishedBook, setFinishedBook] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (quickLogBook) {
      setSelectedBookId(quickLogBook.book_id);
    } else if (books.length > 0) {
      const active = books.find((b) => b.reading_status === 'READING');
      setSelectedBookId(active ? active.book_id : books[0].book_id);
    }
  }, [quickLogBook, books]);

  if (!quickLogOpen) return null;

  const pagesRead = Math.max(0, endPage - startPage);

  const handleIncrement = (inc: number) => {
    setEndPage((prev) => Math.max(startPage, prev + inc));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      setErrorMsg('Please select a book.');
      return;
    }
    if (endPage < startPage) {
      setErrorMsg('End page cannot be less than start page.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await submitReadingLog({
        book_id: selectedBookId,
        start_page: startPage,
        end_page: endPage,
        pages_read: pagesRead,
        duration_minutes: durationMinutes,
        session_note: sessionNote.trim() || undefined,
        finished_book: finishedBook,
        rating: finishedBook ? rating : undefined,
      });
      closeQuickLog();
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setErrorMsg('Authentication key required. Please set your X-Library-Key.');
        setKeyModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Failed to record session.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-canvas dark:bg-canvas-dark border-t sm:border border-rule dark:border-rule-dark rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule dark:border-rule-dark">
          <div className="flex items-center gap-2">
            <BookOpen className="text-accent dark:text-accent-dark h-5 w-5" />
            <h2 id="modal-title" className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
              Log Reading Session
            </h2>
          </div>
          <button
            onClick={closeQuickLog}
            className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40">
              {errorMsg}
            </div>
          )}

          {/* Book Selector */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
              Select Book
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
            >
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  {b.title} ({b.reading_status})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Increment Buttons */}
          <div className="space-y-1.5">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
              Quick Page Increment
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 20, 35].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => handleIncrement(amt)}
                  className="py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark transition-colors"
                >
                  +{amt}p
                </button>
              ))}
            </div>
          </div>

          {/* Page Range Inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Start Page
              </label>
              <input
                type="number"
                min="0"
                value={startPage}
                onChange={(e) => setStartPage(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                End Page ({pagesRead} pgs)
              </label>
              <input
                type="number"
                min={startPage}
                value={endPage}
                onChange={(e) => setEndPage(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Duration in Minutes */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1.5">
              <Clock size={11} />
              Duration (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {/* Session Note */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1.5">
              <FileText size={11} />
              Session Note (optional)
            </label>
            <input
              type="text"
              placeholder="Key thoughts, memorable quotes, or reflections..."
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
            />
          </div>

          {/* Finished Book Toggle */}
          <div className="pt-2 border-t border-rule/60 dark:border-rule-dark/60 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={finishedBook}
                onChange={(e) => setFinishedBook(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-accent focus:ring-accent accent-accent"
              />
              <span className="text-xs font-medium text-ink dark:text-ink-dark">
                I finished this book! (Transition to COMPLETED)
              </span>
            </label>

            {finishedBook && (
              <div className="p-2.5 rounded-xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark space-y-1 animate-in fade-in">
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                  Book Rating
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={17}
                        className={
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300 dark:text-stone-600'
                        }
                      />
                    </button>
                  ))}
                  <span className="text-xs font-mono ml-2 text-ink-muted">{rating}/5</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeQuickLog}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-sm transition-all"
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-white" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

