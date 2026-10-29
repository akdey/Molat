import React, { useState } from 'react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import type { Book } from '../types/book';
import { BookCover } from '../components/books/BookCover';
import { StatusPill } from '../components/books/StatusPill';
import { ProgressBar, StarRating } from '../components/books/ProgressBar';
import { ConfirmDialog } from '../components/common/Dialog';
import { Button } from '../components/common/FormControls';
import { useToast } from '../components/common/Toast';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Edit3, Trash2, MapPin, AlertCircle } from 'lucide-react';

interface BookDetailViewProps {
  book: Book;
  onBack: () => void;
  onEdit: (book: Book) => void;
  currency?: string;
}

function DetailField({ label, value, className }: { label: string; value?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-2xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted font-medium">{label}</span>
      <span className="text-sm text-ink dark:text-ink-dark">
        {value ?? <span className="italic text-ink-muted dark:text-ink-dark-muted">Not recorded</span>}
      </span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-muted dark:text-ink-dark-muted border-b border-rule dark:border-rule-dark pb-2 mt-6 first:mt-0">
      {title}
    </h2>
  );
}

export function BookDetailView({ book, onBack, onEdit, currency = 'INR' }: BookDetailViewProps) {
  const { removeBook } = useApp();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOverdue = book.expected_return_date
    ? new Date(book.expected_return_date) < new Date()
    : false;

  async function handleDelete() {
    setDeleting(true);
    try {
      // TODO: call booksApi.delete(book.book_id)
      removeBook(book.book_id);
      toast('Book removed from your library.', 'success');
      onBack();
    } catch {
      toast('Could not delete the book. Please try again.', 'error');
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-detail mx-auto">
      {/* Back + actions row */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={onBack}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm text-ink-secondary dark:text-ink-dark-secondary',
            'hover:text-ink dark:hover:text-ink-dark transition-colors',
            'focus:outline-none focus-visible:underline',
          )}
          aria-label="Back to collection"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Edit3 size={14} />}
            onClick={() => onEdit(book)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Trash2 size={14} />}
            onClick={() => setConfirmDelete(true)}
            className="text-error dark:text-error-dark hover:bg-error-subtle dark:hover:bg-error-dark-subtle"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main grid — cover + info */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-8">
        {/* Cover */}
        <div className="flex flex-col items-center sm:items-start gap-3">
          <BookCover
            title={book.title}
            author={book.author}
            coverUrl={book.cover_url}
            className="w-36 sm:w-44 shadow-md"
            priority
          />
          {!book.metadata_verified && (
            <div className="flex items-center gap-1.5 text-xs text-warn dark:text-warn-dark">
              <AlertCircle size={12} aria-hidden="true" />
              Metadata unverified
            </div>
          )}
          {book.cover_source && (
            <p className="text-2xs text-ink-muted dark:text-ink-dark-muted">Cover: {book.cover_source}</p>
          )}
        </div>

        {/* Core bibliographic info */}
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink dark:text-ink-dark leading-snug">
            {book.title}
          </h1>
          {book.subtitle && (
            <p className="text-lg text-ink-secondary dark:text-ink-dark-secondary font-serif mt-0.5 leading-snug">
              {book.subtitle}
            </p>
          )}
          {book.author && (
            <p className="text-base text-ink-secondary dark:text-ink-dark-secondary mt-1.5">
              {book.author}
            </p>
          )}

          {/* Status pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <StatusPill variant="ownership" value={book.ownership_status} size="md" />
            <StatusPill variant="reading" value={book.reading_status} size="md" />
            <StatusPill variant="condition" value={book.condition} size="md" />
          </div>

          {/* Reading progress */}
          {book.reading_status === 'Reading' && (
            <ProgressBar
              current={book.current_page}
              total={book.total_pages}
              showLabel
              className="mt-4 max-w-[240px]"
            />
          )}

          {/* Rating */}
          {book.personal_rating && (
            <div className="flex items-center gap-2 mt-3">
              <StarRating value={book.personal_rating} />
              <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{book.personal_rating}/5</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail sections */}
      <div className="mt-8 space-y-4">

        {/* Bibliographic */}
        <SectionHeader title="Bibliographic" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <DetailField label="Publisher" value={book.publisher} />
          <DetailField label="Publication year" value={book.publication_year} />
          <DetailField label="Language" value={book.language} />
          <DetailField label="Genre" value={book.genre} />
          {book.isbn_13 && (
            <DetailField label="ISBN-13" value={<span className="font-mono text-xs">{book.isbn_13}</span>} />
          )}
          {book.isbn_10 && (
            <DetailField label="ISBN-10" value={<span className="font-mono text-xs">{book.isbn_10}</span>} />
          )}
          {book.total_pages && (
            <DetailField label="Pages" value={book.total_pages.toLocaleString()} />
          )}
        </div>

        {/* Ownership & purchase */}
        <SectionHeader title="Ownership" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <DetailField label="Purchase price"
            value={book.purchase_price !== undefined ? formatCurrency(book.purchase_price, currency) : undefined}
          />
          <DetailField label="Retail price"
            value={book.retail_price !== undefined ? (
              <span className="flex flex-col gap-0.5">
                {formatCurrency(book.retail_price, currency)}
                <span className="text-2xs text-ink-muted dark:text-ink-dark-muted">Reference only</span>
              </span>
            ) : undefined}
          />
          <DetailField label="Purchase date" value={formatDate(book.purchase_date) || undefined} />
          <DetailField label="Purchase source" value={book.purchase_source} />
        </div>

        {/* Physical */}
        <SectionHeader title="Physical" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <DetailField
            label="Shelf location"
            value={book.shelf_location ? (
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-ink-muted" aria-hidden="true" />
                {book.shelf_location}
              </span>
            ) : undefined}
          />
          <DetailField label="Condition" value={<StatusPill variant="condition" value={book.condition} size="md" />} />
        </div>

        {/* Lending */}
        {(book.loaned_to || book.loan_date) && (
          <>
            <SectionHeader title="Lending" />
            <div className={cn(
              'flex flex-col gap-3 p-4 rounded-lg border',
              isOverdue
                ? 'border-error/30 bg-error-subtle dark:border-error-dark/30 dark:bg-error-dark-subtle'
                : 'border-warn/30 bg-warn-subtle dark:border-warn-dark/30 dark:bg-warn-dark-subtle',
            )}>
              {isOverdue && (
                <p className="text-xs font-medium text-error dark:text-error-dark flex items-center gap-1">
                  <AlertCircle size={12} aria-hidden="true" />
                  Overdue — was due {formatDate(book.expected_return_date)}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DetailField label="Loaned to" value={book.loaned_to} />
                <DetailField label="Loan date" value={formatDate(book.loan_date) || undefined} />
                <DetailField label="Expected return" value={formatDate(book.expected_return_date) || undefined} />
              </div>
            </div>
          </>
        )}

        {/* Reading progress details */}
        {(book.reading_status === 'Completed' || book.reading_status === 'Reading' || book.reading_status === 'Abandoned') && (
          <>
            <SectionHeader title="Reading" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <DetailField label="Status" value={<StatusPill variant="reading" value={book.reading_status} size="md" />} />
              {book.current_page && <DetailField label="Current page" value={book.current_page.toLocaleString()} />}
              {book.total_pages && <DetailField label="Total pages" value={book.total_pages.toLocaleString()} />}
            </div>
          </>
        )}

        {/* Notes */}
        {book.notes && (
          <>
            <SectionHeader title="Personal notes" />
            <p className="text-sm text-ink dark:text-ink-dark whitespace-pre-wrap leading-relaxed bg-surface dark:bg-surface-dark rounded-md px-4 py-3 border border-rule dark:border-rule-dark">
              {book.notes}
            </p>
          </>
        )}

        {/* Record metadata */}
        <SectionHeader title="Record" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <DetailField label="Added" value={formatDate(book.created_at)} />
          <DetailField label="Updated" value={formatDate(book.updated_at)} />
          <DetailField label="Book ID" value={<span className="font-mono text-2xs break-all">{book.book_id}</span>} />
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Remove this book?"
        message={`"${book.title}" will be removed from your library. This cannot be undone from the app — restore from a backup if needed.`}
        confirmLabel="Remove book"
        loading={deleting}
      />
    </div>
  );
}

