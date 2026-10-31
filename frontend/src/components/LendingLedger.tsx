import React, { useState } from 'react';
import {
  Handshake,
  Calendar,
  User,
  Phone,
  MessageCircle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { LendingRecord } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { BookCover } from './BookCover';

export const LendingLedger: React.FC = () => {
  const {
    lendingRecords,
    loadLendingRecords,
    returnBookRecord,
    openLendModal,
    setKeyModalOpen,
  } = useLibraryStore();

  const [activeSubTab, setActiveSubTab] = useState<'active' | 'returned'>('active');
  const [returningId, setReturningId] = useState<string | null>(null);

  const activeRecords = lendingRecords.filter((r) => r.status === 'ACTIVE');
  const returnedRecords = lendingRecords.filter((r) => r.status === 'RETURNED');
  const overdueCount = activeRecords.filter((r) => r.is_overdue).length;

  const handleReturn = async (lendingId: string) => {
    setReturningId(lendingId);
    try {
      await returnBookRecord(lendingId, 'Home Shelf');
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setKeyModalOpen(true);
      }
    } finally {
      setReturningId(null);
    }
  };

  const openWhatsAppReminder = (record: LendingRecord) => {
    if (!record.borrower_contact) return;
    const cleanPhone = record.borrower_contact.replace(/[^0-9]/g, '');
    const bookTitle = record.book_title || 'the book';
    const borrowerName = record.borrower_name;

    let text = `Hi ${borrowerName}! Hope you're enjoying reading "${bookTitle}". Just checking in from my personal library collection — let me know whenever you're ready to pass it back! 📚`;
    if (record.is_overdue && record.due_date) {
      text = `Hi ${borrowerName}! Gentle ping regarding "${bookTitle}" from my personal library (it was expected back around ${record.due_date}). Let me know when it might be convenient to return it! 📚`;
    }

    const encoded = encodeURIComponent(text);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Handshake className="text-accent dark:text-accent-dark h-5 w-5" />
            <h2 className="font-serif text-lg sm:text-xl font-medium text-ink dark:text-ink-dark">
              Lending Ledger & Borrower Follow-ups
            </h2>
          </div>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
            Keep track of physical books shared with friends, family, and colleagues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadLendingRecords(true)}
            className="p-2 rounded-xl border border-rule dark:border-rule-dark text-ink-secondary hover:text-ink hover:bg-surface dark:hover:bg-surface-dark transition-colors"
            title="Refresh lending records"
            aria-label="Refresh lending records"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => openLendModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Lend a Volume</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Active vs Returned */}
      <div className="flex items-center justify-between gap-2 border-b border-rule/60 dark:border-rule-dark/60 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('active')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeSubTab === 'active'
                ? 'bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent-dark font-semibold'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <span>Currently Lent</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface dark:bg-surface-dark border border-rule/50 text-3xs font-mono">
              {activeRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('returned')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeSubTab === 'returned'
                ? 'bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent-dark font-semibold'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <span>Past Returns</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface dark:bg-surface-dark border border-rule/50 text-3xs font-mono">
              {returnedRecords.length}
            </span>
          </button>
        </div>

        {overdueCount > 0 && activeSubTab === 'active' && (
          <div className="flex items-center gap-1 text-3xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-2.5 py-1 rounded-full">
            <AlertTriangle size={12} />
            <span>{overdueCount} overdue volume{overdueCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ACTIVE LENT BOOKS */}
      {activeSubTab === 'active' && (
        <>
          {activeRecords.length === 0 ? (
            <div className="py-16 text-center text-ink-muted border border-dashed border-rule dark:border-rule-dark rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-raised dark:bg-surface-dark-raised text-ink-muted mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
                  All books are resting safely in your library!
                </p>
                <p className="text-2xs text-ink-muted">
                  No volumes are currently lent out to friends or colleagues.
                </p>
              </div>
              <button
                onClick={() => openLendModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rule dark:border-rule-dark hover:bg-surface text-xs font-medium text-accent"
              >
                <Plus size={14} />
                <span>Lend a Book Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRecords.map((record) => (
                <div
                  key={record.lending_id}
                  className={`p-4 rounded-2xl border transition-all space-y-3.5 flex flex-col justify-between ${
                    record.is_overdue
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 shadow-xs'
                      : 'border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-xs'
                  }`}
                >
                  {/* Top Details Row */}
                  <div className="flex gap-3.5 items-start">
                    {/* Mini Cover */}
                    <div className="w-16 sm:w-18 shrink-0 rounded-lg overflow-hidden shadow-xs">
                      <BookCover
                        title={record.book_title || 'Book'}
                        authors={record.book_authors}
                        coverUrl={record.book_cover_url}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-3xs text-ink-muted uppercase">
                          {record.lending_id} • {record.book_id}
                        </span>
                        {record.is_overdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 text-3xs font-semibold uppercase tracking-wider animate-pulse">
                            <AlertTriangle size={10} />
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-3xs font-medium uppercase tracking-wider">
                            <Clock size={10} />
                            Active Loan
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark line-clamp-1">
                        {record.book_title || 'Untitled Book'}
                      </h3>
                      {record.book_authors && (
                        <p className="text-3xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                          {record.book_authors}
                        </p>
                      )}

                      {/* Borrower info badge */}
                      <div className="pt-1.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-ink dark:text-ink-dark font-medium">
                          <User size={13} className="text-accent shrink-0" />
                          <span className="truncate">{record.borrower_name}</span>
                        </div>

                        {record.borrower_contact && (
                          <div className="flex items-center gap-1.5 text-3xs text-ink-muted">
                            <Phone size={11} className="shrink-0" />
                            <span className="truncate">{record.borrower_contact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dates & Duration Banner */}
                  <div className="p-2.5 rounded-xl bg-surface/70 dark:bg-surface-dark/70 border border-rule/40 dark:border-rule-dark/40 text-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Lent Date:</span>
                      <span className="font-mono font-medium text-ink dark:text-ink-dark">
                        {record.lent_date} ({record.days_lent || 0}d ago)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Expected Due:</span>
                      {record.due_date ? (
                        <span
                          className={`font-mono font-medium ${
                            record.is_overdue
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-ink dark:text-ink-dark'
                          }`}
                        >
                          {record.due_date} {record.is_overdue ? '(Passed)' : ''}
                        </span>
                      ) : (
                        <span className="italic text-ink-muted">No date set</span>
                      )}
                    </div>

                    {record.notes && (
                      <div className="pt-1 border-t border-rule/30 dark:border-rule-dark/30 text-3xs text-ink-secondary dark:text-ink-dark-secondary italic line-clamp-2">
                        "{record.notes}"
                      </div>
                    )}
                  </div>

                  {/* Follow-up & Return Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {/* WhatsApp Gentle Follow-Up */}
                    {record.borrower_contact && (
                      <button
                        type="button"
                        onClick={() => openWhatsAppReminder(record)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        title="Send gentle WhatsApp reminder message"
                      >
                        <MessageCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp Ping</span>
                      </button>
                    )}

                    {/* Mark as Returned */}
                    <button
                      type="button"
                      disabled={returningId === record.lending_id}
                      onClick={() => handleReturn(record.lending_id)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      {returningId === record.lending_id ? (
                        <>
                          <RefreshCw size={12} className="animate-spin text-white" />
                          <span>Returning...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw size={13} />
                          <span>Mark Returned</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* PAST RETURNED HISTORY */}
      {activeSubTab === 'returned' && (
        <>
          {returnedRecords.length === 0 ? (
            <div className="py-16 text-center text-ink-muted border border-dashed border-rule dark:border-rule-dark rounded-2xl p-6">
              No lending history recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {returnedRecords.map((record) => (
                <div
                  key={record.lending_id}
                  className="p-3.5 rounded-xl border border-rule/70 dark:border-rule-dark/70 bg-surface dark:bg-surface-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-medium text-ink dark:text-ink-dark">
                        {record.book_title || record.book_id}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-3xs font-medium uppercase">
                        Returned
                      </span>
                    </div>
                    <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                      Borrowed by <strong className="font-semibold text-ink dark:text-ink-dark">{record.borrower_name}</strong> • Kept for {record.days_lent || 0} days
                    </p>
                    {record.notes && (
                      <p className="text-3xs text-ink-muted italic">"{record.notes}"</p>
                    )}
                  </div>

                  <div className="text-right sm:text-right font-mono text-3xs text-ink-muted shrink-0">
                    <div>Lent: {record.lent_date}</div>
                    <div>Returned: {record.returned_date || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
