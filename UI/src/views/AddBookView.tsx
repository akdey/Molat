import { useState } from 'react';
import { cn } from '../lib/utils';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../components/common/Toast';
import { Button, Input, Select, Textarea } from '../components/common/FormControls';
import { BookCover } from '../components/books/BookCover';
import { ScanLine, Search, Edit3, Check, AlertCircle, X, ChevronRight } from 'lucide-react';
import type { Book, OwnershipStatus, ReadingStatus, Condition } from '../types/book';
import { isValidIsbn13, normalizeIsbn } from '../lib/utils';

type AddMode = 'choose' | 'scan' | 'search' | 'manual';
type StepState = 'input' | 'candidate' | 'details' | 'saving';

interface CandidateBook extends Partial<Book> {
  source?: string;
  confidence?: 'exact' | 'partial' | 'uncertain';
}

interface AddBookViewProps {
  onSuccess: (book: Book) => void;
  onCancel: () => void;
}

export function AddBookView({ onSuccess, onCancel }: AddBookViewProps) {
  const { addBook } = useApp();
  const { toast } = useToast();

  const [mode, setMode] = useState<AddMode>('choose');
  const [step, setStep] = useState<StepState>('input');
  const [isbnInput, setIsbnInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<CandidateBook[]>([]);
  const [selected, setSelected] = useState<CandidateBook | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Manual/details form state
  const [form, setForm] = useState<Partial<Book>>({
    ownership_status: 'Owned',
    reading_status: 'Unread',
    condition: 'Unknown',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Book, string>>>({});

  function setField<K extends keyof Book>(key: K, val: Book[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
    setFormErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validateDetails(): boolean {
    const errs: typeof formErrors = {};
    if (!form.title?.trim()) errs.title = 'Title is required';
    if (form.purchase_price !== undefined && form.purchase_price < 0) errs.purchase_price = 'Price must be 0 or positive';
    if (form.personal_rating !== undefined && (form.personal_rating < 1 || form.personal_rating > 5)) errs.personal_rating = 'Rating must be 1–5';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleIsbnLookup() {
    const isbn = normalizeIsbn(isbnInput);
    if (!isValidIsbn13(isbn)) {
      setLookupError('Please enter a valid 13-digit ISBN.');
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    try {
      // TODO: const result = await booksApi.lookupIsbn(isbn);
      // Simulated mock response — replace with real API call
      await new Promise(r => setTimeout(r, 800));
      const mock: CandidateBook = {
        title: 'The Name of the Rose',
        author: 'Umberto Eco',
        isbn_13: isbn,
        publisher: 'Harcourt',
        publication_year: 1980,
        cover_url: 'https://covers.openlibrary.org/b/isbn/9780156001311-L.jpg',
        source: 'Open Library',
        confidence: 'exact',
      };
      setCandidates([mock]);
      setSelected(mock);
      setForm(prev => ({ ...prev, ...mock }));
      setStep('candidate');
    } catch {
      setLookupError('No metadata found for this ISBN. You can add the book manually.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      // TODO: const result = await booksApi.searchMetadata(searchQuery);
      await new Promise(r => setTimeout(r, 600));
      const mocks: CandidateBook[] = [
        {
          title: 'Thinking, Fast and Slow',
          author: 'Daniel Kahneman',
          isbn_13: '9780374533557',
          publisher: 'Farrar, Straus and Giroux',
          publication_year: 2011,
          cover_url: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
          source: 'Google Books',
          confidence: 'exact',
        },
        {
          title: 'Thinking in Systems',
          author: 'Donella H. Meadows',
          isbn_13: '9781603580557',
          publisher: 'Chelsea Green',
          publication_year: 2008,
          source: 'Open Library',
          confidence: 'partial',
        },
      ];
      setCandidates(mocks);
      setStep('candidate');
    } catch {
      setLookupError('Search failed. Please check your connection or try manually adding the book.');
    } finally {
      setLookupLoading(false);
    }
  }

  function selectCandidate(c: CandidateBook) {
    setSelected(c);
    setForm(prev => ({ ...prev, ...c }));
    setStep('details');
  }

  function proceedToManual() {
    setSelected(null);
    setStep('details');
    setMode('manual');
  }

  async function handleSave() {
    if (!validateDetails()) return;
    setSaving(true);
    try {
      // TODO: const saved = await booksApi.create(form);
      await new Promise(r => setTimeout(r, 600));
      const saved: Book = {
        book_id: `bk_${Date.now()}`,
        title: form.title!,
        ownership_status: form.ownership_status ?? 'Owned',
        reading_status: form.reading_status ?? 'Unread',
        condition: form.condition ?? 'Unknown',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...form,
      };
      addBook(saved);
      toast(`"${saved.title}" added to your library.`, 'success');
      onSuccess(saved);
    } catch {
      toast('Could not save the book. Please try again.', 'error');
      setSaving(false);
    }
  }

  // ─── CHOOSE MODE ────────────────────────────────────────────────────────────

  if (mode === 'choose') {
    return (
      <div className="max-w-form mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl font-medium text-ink dark:text-ink-dark">Add a book</h1>
          <button onClick={onCancel} className="text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors" aria-label="Cancel">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { mode: 'scan' as const, icon: <ScanLine size={24} />, title: 'Scan ISBN', desc: 'Use your camera to scan the barcode on the back cover.' },
            { mode: 'search' as const, icon: <Search size={24} />, title: 'Search title or author', desc: 'Find the book by title or author name and import metadata.' },
            { mode: 'manual' as const, icon: <Edit3 size={24} />, title: 'Add manually', desc: 'Enter all details yourself, no camera or internet needed.' },
          ].map(opt => (
            <button
              key={opt.mode}
              onClick={() => { setMode(opt.mode); if (opt.mode === 'manual') { setStep('details'); } }}
              className={cn(
                'flex flex-col items-start gap-3 p-4 rounded-lg text-left border',
                'border-rule dark:border-rule-dark',
                'bg-surface dark:bg-surface-dark',
                'hover:border-accent/50 dark:hover:border-accent-dark/50',
                'hover:bg-accent-subtle dark:hover:bg-accent-dark-subtle',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              )}
            >
              <span className="text-accent dark:text-accent-dark" aria-hidden="true">{opt.icon}</span>
              <span>
                <span className="block text-sm font-medium text-ink dark:text-ink-dark">{opt.title}</span>
                <span className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-snug block">{opt.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── SCAN MODE ──────────────────────────────────────────────────────────────

  if (mode === 'scan' && step === 'input') {
    return (
      <div className="max-w-form mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('choose')} className="text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors" aria-label="Go back">
            <X size={18} />
          </button>
          <h1 className="font-serif text-2xl font-medium text-ink dark:text-ink-dark">Scan ISBN</h1>
        </div>

        {/* Camera unavailable fallback */}
        <div className={cn(
          'border-2 border-dashed border-rule dark:border-rule-dark rounded-lg',
          'flex flex-col items-center justify-center text-center gap-3 p-8 min-h-[220px]',
        )}>
          <ScanLine size={36} className="text-ink-muted dark:text-ink-dark-muted" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink dark:text-ink-dark">Camera scanner</p>
            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-1">
              The barcode scanner reads ISBNs in your browser — no photo upload.
            </p>
          </div>
          <p className="text-xs text-info dark:text-info-dark">
            Camera integration requires HTTPS and browser permission.
            <br />Using the development build — camera scanner is simulated.
          </p>
        </div>

        {/* ISBN manual entry as fallback */}
        <div className="space-y-3">
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted">Or enter the ISBN manually:</p>
          <div className="flex gap-2">
            <Input
              value={isbnInput}
              onChange={e => setIsbnInput(e.target.value)}
              placeholder="e.g. 9780156001311"
              inputMode="numeric"
              aria-label="ISBN-13"
              error={lookupError ?? undefined}
              className="flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleIsbnLookup(); }}
            />
            <Button
              variant="primary"
              onClick={handleIsbnLookup}
              loading={lookupLoading}
              disabled={!isbnInput}
            >
              Look up
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-rule dark:border-rule-dark" />
          <span className="text-xs text-ink-muted">or</span>
          <hr className="flex-1 border-rule dark:border-rule-dark" />
        </div>
        <Button variant="ghost" size="sm" onClick={proceedToManual} iconLeft={<Edit3 size={14} />}>
          Add manually instead
        </Button>
      </div>
    );
  }

  // ─── SEARCH MODE ────────────────────────────────────────────────────────────

  if (mode === 'search' && step === 'input') {
    return (
      <div className="max-w-form mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('choose')} className="text-ink-muted hover:text-ink transition-colors" aria-label="Go back"><X size={18} /></button>
          <h1 className="font-serif text-2xl font-medium text-ink dark:text-ink-dark">Search</h1>
        </div>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Title, author, or ISBN…"
            aria-label="Search books"
            error={lookupError ?? undefined}
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          />
          <Button variant="primary" onClick={handleSearch} loading={lookupLoading} disabled={!searchQuery.trim()}>
            Search
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={proceedToManual} iconLeft={<Edit3 size={14} />}>
          Add manually instead
        </Button>
      </div>
    );
  }

  // ─── CANDIDATES ──────────────────────────────────────────────────────────────

  if (step === 'candidate') {
    return (
      <div className="max-w-form mx-auto space-y-5">
        <h2 className="font-serif text-2xl font-medium text-ink dark:text-ink-dark">
          {candidates.length === 1 ? 'Is this your book?' : 'Select the right edition'}
        </h2>
        <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary">
          Metadata is retrieved from third-party sources and may be incomplete or incorrect.
          Review details before saving.
        </p>

        <div className="space-y-3">
          {candidates.map((c, i) => (
            <button
              key={i}
              onClick={() => selectCandidate(c)}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-lg text-left',
                'border border-rule dark:border-rule-dark',
                'bg-surface dark:bg-surface-dark',
                'hover:border-accent/50 dark:hover:border-accent-dark/50 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              )}
            >
              <BookCover
                title={c.title ?? 'Unknown'}
                author={c.author}
                coverUrl={c.cover_url}
                className="w-14 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-ink dark:text-ink-dark leading-snug">{c.title}</p>
                <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">{c.author}</p>
                {c.publisher && <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{c.publisher}, {c.publication_year}</p>}
                {c.isbn_13 && <p className="text-2xs text-ink-muted dark:text-ink-dark-muted font-mono">{c.isbn_13}</p>}
                <div className="flex items-center gap-2 pt-1">
                  {c.confidence === 'uncertain' && (
                    <span className="inline-flex items-center gap-1 text-2xs text-warn dark:text-warn-dark">
                      <AlertCircle size={10} />Uncertain match
                    </span>
                  )}
                  {c.source && <span className="text-2xs text-ink-muted dark:text-ink-dark-muted">Source: {c.source}</span>}
                </div>
              </div>
              <ChevronRight size={16} className="text-ink-muted dark:text-ink-dark-muted shrink-0 mt-1" aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="mr-auto">
            Back
          </Button>
          <Button variant="secondary" size="sm" onClick={proceedToManual} iconLeft={<Edit3 size={14} />}>
            None of these — add manually
          </Button>
        </div>
      </div>
    );
  }

  // ─── DETAILS FORM ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-form mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-medium text-ink dark:text-ink-dark">
          {selected ? 'Review and confirm' : 'Add manually'}
        </h1>
        <button onClick={onCancel} className="text-ink-muted hover:text-ink transition-colors" aria-label="Cancel"><X size={18} /></button>
      </div>

      {selected && (
        <div className="flex items-start gap-4 p-4 rounded-lg bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark">
          <BookCover title={selected.title ?? ''} coverUrl={selected.cover_url} className="w-14 shrink-0" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-ink dark:text-ink-dark">{selected.title}</p>
            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">{selected.author}</p>
            {selected.source && (
              <p className="text-2xs text-ink-muted dark:text-ink-dark-muted">
                Metadata from {selected.source} — review before saving
              </p>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={e => { e.preventDefault(); handleSave(); }}
        noValidate
        className="space-y-4"
      >
        {/* Required */}
        <Input
          label="Title *"
          value={form.title ?? ''}
          onChange={e => setField('title', e.target.value)}
          error={formErrors.title}
          autoComplete="off"
        />
        <Input
          label="Author"
          value={form.author ?? ''}
          onChange={e => setField('author', e.target.value)}
        />

        {/* Status — ownership + reading side by side */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Ownership"
            value={form.ownership_status ?? 'Owned'}
            onChange={e => setField('ownership_status', e.target.value as OwnershipStatus)}
            options={['Owned', 'Wishlist', 'Borrowed'].map(v => ({ value: v, label: v }))}
          />
          <Select
            label="Reading status"
            value={form.reading_status ?? 'Unread'}
            onChange={e => setField('reading_status', e.target.value as ReadingStatus)}
            options={['Unread', 'Reading', 'Completed', 'Abandoned'].map(v => ({ value: v, label: v }))}
          />
        </div>

        {/* Bibliographic */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-accent dark:text-accent-dark font-medium select-none list-none flex items-center gap-1">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden="true" />
            Bibliographic details (optional)
          </summary>
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="ISBN-13" value={form.isbn_13 ?? ''} onChange={e => setField('isbn_13', e.target.value)} inputMode="numeric" />
              <Input label="Publisher" value={form.publisher ?? ''} onChange={e => setField('publisher', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Publication year" type="number" value={form.publication_year ?? ''} onChange={e => setField('publication_year', parseInt(e.target.value) || undefined)} />
              <Input label="Language" value={form.language ?? ''} onChange={e => setField('language', e.target.value)} />
            </div>
            <Input label="Genre" value={form.genre ?? ''} onChange={e => setField('genre', e.target.value)} />
          </div>
        </details>

        {/* Ownership details */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-accent dark:text-accent-dark font-medium select-none list-none flex items-center gap-1">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden="true" />
            Purchase details (optional)
          </summary>
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Purchase price" type="number" min="0" step="0.01" value={form.purchase_price ?? ''} onChange={e => setField('purchase_price', parseFloat(e.target.value) || undefined)} error={formErrors.purchase_price} />
              <Input label="Purchase date" type="date" value={form.purchase_date ?? ''} onChange={e => setField('purchase_date', e.target.value || undefined)} />
            </div>
            <Input label="Purchase source (store, gift, etc.)" value={form.purchase_source ?? ''} onChange={e => setField('purchase_source', e.target.value)} />
          </div>
        </details>

        {/* Physical */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-accent dark:text-accent-dark font-medium select-none list-none flex items-center gap-1">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden="true" />
            Physical details (optional)
          </summary>
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Condition"
                value={form.condition ?? 'Unknown'}
                onChange={e => setField('condition', e.target.value as Condition)}
                options={['New', 'Good', 'Fair', 'Damaged', 'Unknown'].map(v => ({ value: v, label: v }))}
              />
              <Input label="Shelf location" value={form.shelf_location ?? ''} onChange={e => setField('shelf_location', e.target.value)} />
            </div>
          </div>
        </details>

        {/* Notes */}
        <Textarea
          label="Personal notes"
          value={form.notes ?? ''}
          onChange={e => setField('notes', e.target.value)}
          hint="Private notes. Not shared or indexed."
          rows={3}
        />

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-rule dark:border-rule-dark">
          <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving} iconLeft={<Check size={16} />}>
            Save to library
          </Button>
        </div>
      </form>
    </div>
  );
}

