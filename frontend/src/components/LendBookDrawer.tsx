import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Handshake, Check, AlertCircle, RefreshCw, Calendar, User, Phone, FileText } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const LendBookDrawer: React.FC = () => {
  const {
    books,
    lendingRecords,
    lendingModalOpen,
    lendingModalBook,
    closeLendModal,
    lendBookRecord,
    setKeyModalOpen,
  } = useLibraryStore();

  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [borrowerName, setBorrowerName] = useState<string>('');
  const [borrowerContact, setBorrowerContact] = useState<string>('');
  const [lentDate, setLentDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Books that are not currently actively lent out
  const activeLentBookIds = new Set(
    lendingRecords.filter((r) => r.status === 'ACTIVE').map((r) => r.book_id)
  );
  const lendableBooks = books.filter((b) => !activeLentBookIds.has(b.book_id));

  useEffect(() => {
    if (lendingModalOpen) {
      const today = new Date().toISOString().split('T')[0];
      setLentDate(today);
      setDueDate('');
      setBorrowerName('');
      setBorrowerContact('');
      setNotes('');
      setErrorMsg(null);

      if (lendingModalBook) {
        setSelectedBookId(lendingModalBook.book_id);
      } else if (lendableBooks.length > 0) {
        setSelectedBookId(lendableBooks[0].book_id);
      } else {
        setSelectedBookId('');
      }
    }
  }, [lendingModalOpen, lendingModalBook, books]);

  const applyDuePreset = (days: number | null) => {
    if (days === null) {
      setDueDate('');
      return;
    }
    const d = new Date(lentDate || new Date());
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      setErrorMsg('Please select a book to lend.');
      return;
    }
    if (!borrowerName.trim()) {
      setErrorMsg('Please enter the borrower’s name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await lendBookRecord({
        book_id: selectedBookId,
        borrower_name: borrowerName.trim(),
        borrower_contact: borrowerContact.trim() || undefined,
        lent_date: lentDate || undefined,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      closeLendModal();
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setErrorMsg('Authentication key required. Please set your X-Library-Key.');
        setKeyModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Failed to record lending.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {lendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeLendModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Card */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-lg bg-canvas dark:bg-canvas-dark border-t border-rule dark:border-rule-dark rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lend-modal-title"
          >
            {/* Drawer Pull Handle */}
            <div className="w-10 h-1 bg-ink-muted/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50 shrink-0">
              <div className="flex items-center gap-2">
                <Handshake className="text-accent dark:text-accent-dark h-5 w-5" />
                <div>
                  <h2
                    id="lend-modal-title"
                    className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark leading-tight"
                  >
                    Lend Volume to Someone
                  </h2>
                  <p className="text-3xs text-ink-muted">Track borrower, expected due date & WhatsApp follow-ups</p>
                </div>
              </div>
              <button
                onClick={closeLendModal}
                className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Book Selector */}
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Select Book to Lend *
                </label>
                <select
                  required
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                >
                  {lendableBooks.length === 0 ? (
                    <option value="">No books currently available to lend</option>
                  ) : (
                    lendableBooks.map((b) => (
                      <option key={b.book_id} value={b.book_id}>
                        {b.title} {b.authors ? `— ${b.authors}` : ''} ({b.book_id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Borrower Name */}
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1">
                  <User size={11} className="text-accent" />
                  Borrower's Name *
                </label>
                <input
                  type="text"
                  required
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                />
              </div>

              {/* Borrower Contact (Phone / Handle) */}
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1">
                  <Phone size={11} className="text-accent" />
                  Borrower Contact / WhatsApp Number (Optional)
                </label>
                <input
                  type="text"
                  value={borrowerContact}
                  onChange={(e) => setBorrowerContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210 or email"
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                />
                <p className="text-3xs text-ink-muted">
                  Adding a phone number enables 1-click WhatsApp follow-up reminders.
                </p>
              </div>

              {/* Dates Row: Lent Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1">
                    <Calendar size={11} className="text-accent" />
                    Date Lent
                  </label>
                  <input
                    type="date"
                    required
                    value={lentDate}
                    onChange={(e) => setLentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1">
                    <Calendar size={11} className="text-accent" />
                    Expected Return Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Due Date Quick Presets */}
              <div className="space-y-1">
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                  Quick Due Date Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDuePreset(14)}
                    className="px-2.5 py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised text-2xs font-medium text-ink-secondary"
                  >
                    +14 Days (2w)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDuePreset(30)}
                    className="px-2.5 py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised text-2xs font-medium text-ink-secondary"
                  >
                    +30 Days (1mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDuePreset(60)}
                    className="px-2.5 py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised text-2xs font-medium text-ink-secondary"
                  >
                    +60 Days (2mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDuePreset(null)}
                    className="px-2.5 py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised text-2xs font-medium text-ink-muted"
                  >
                    No Due Date
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1">
                  <FileText size={11} className="text-accent" />
                  Lending Notes / Context
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Lent at coffee meetup; promised to read chapter 3 first"
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 pb-5 sm:pb-2">
                <button
                  type="button"
                  onClick={closeLendModal}
                  className="px-4 py-2 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedBookId}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-white" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirm & Lend</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
