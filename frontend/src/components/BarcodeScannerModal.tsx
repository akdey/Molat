import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, Check, AlertTriangle, BookOpen } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { createBook } from '../api/client';
import type { BookCondition, ReadingStatus } from '../types/book';

export const BarcodeScannerModal: React.FC = () => {
  const { scannerOpen, setScannerOpen, books, loadBooks, libraryKey, setKeyModalOpen } = useLibraryStore();

  const [scannedIsbn, setScannedIsbn] = useState<string>('');
  const [duplicateBook, setDuplicateBook] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  
  // Review before save form fields
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [genre, setGenre] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(150);
  const [rp, setRp] = useState<number>(399);
  const [condition, setCondition] = useState<BookCondition>('Good');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('UNREAD');
  const [location, setLocation] = useState('Home Shelf');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scannerOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      setCameraActive(false);
      return;
    }

    if (cameraActive) {
      const scanner = new Html5QrcodeScanner(
        'barcode-reader-container',
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          handleIsbnIdentified(decodedText);
          scanner.clear().catch(console.error);
          setCameraActive(false);
        },
        (error) => {
          // Scanning noise, ignore
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [scannerOpen, cameraActive]);

  const handleIsbnIdentified = (isbn: string) => {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '').trim();
    setScannedIsbn(cleanIsbn);

    // Duplicate check
    const match = books.find(
      (b) =>
        (b.isbn_13 && b.isbn_13.replace(/[^0-9X]/gi, '') === cleanIsbn) ||
        (b.isbn_10 && b.isbn_10.replace(/[^0-9X]/gi, '') === cleanIsbn)
    );
    if (match) {
      setDuplicateBook(match);
    } else {
      setDuplicateBook(null);
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Book title is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await createBook(
        {
          title: title.trim(),
          authors: authors.trim() || undefined,
          genre: genre.trim() || undefined,
          isbn_13: scannedIsbn.length === 13 ? scannedIsbn : undefined,
          isbn_10: scannedIsbn.length === 10 ? scannedIsbn : undefined,
          purchase_price: purchasePrice,
          rp: rp,
          condition,
          reading_status: readingStatus,
          location,
        },
        libraryKey
      );
      await loadBooks();
      setScannerOpen(false);
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setErrorMsg('Authentication key required to add books.');
        setKeyModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Failed to save book.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!scannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule dark:border-rule-dark">
          <div className="flex items-center gap-2">
            <Camera className="text-accent dark:text-accent-dark h-5 w-5" />
            <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
              Scan Barcode / Add Volume
            </h2>
          </div>
          <button
            onClick={() => setScannerOpen(false)}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Camera Scanner Container */}
          {cameraActive ? (
            <div className="space-y-2">
              <div
                id="barcode-reader-container"
                className="w-full rounded-xl overflow-hidden border border-rule dark:border-rule-dark bg-black min-h-[220px]"
              />
              <button
                type="button"
                onClick={() => setCameraActive(false)}
                className="w-full py-2 rounded-lg border border-rule text-xs font-medium text-ink-secondary"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCameraActive(true)}
              className="w-full py-3 rounded-xl border border-dashed border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent flex items-center justify-center gap-2 text-xs font-medium text-ink dark:text-ink-dark transition-colors"
            >
              <Camera size={16} className="text-accent" />
              <span>Open Mobile Camera to Scan ISBN Barcode</span>
            </button>
          )}

          {/* Manual ISBN Input */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
              ISBN-10 or ISBN-13
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 9780099434856"
                value={scannedIsbn}
                onChange={(e) => handleIsbnIdentified(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Duplicate ISBN Warning */}
          {duplicateBook && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Potential Duplicate Detected!</p>
                <p className="text-2xs mt-0.5">
                  ISBN matches <strong className="font-mono">{duplicateBook.book_id}</strong>: "{duplicateBook.title}" ({duplicateBook.reading_status}).
                </p>
              </div>
            </div>
          )}

          {/* Review-Before-Save Form */}
          <form onSubmit={handleSaveBook} className="space-y-3 pt-2 border-t border-rule/60">
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book title"
                className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Author
                </label>
                <input
                  type="text"
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="Author"
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Genre
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Espionage Thriller"
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted font-sans">
                  Purchase Cost (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted font-sans">
                  Retail MRP (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rp}
                  onChange={(e) => setRp(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as BookCondition)}
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Status
                </label>
                <select
                  value={readingStatus}
                  onChange={(e) => setReadingStatus(e.target.value as ReadingStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                >
                  <option value="UNREAD">UNREAD</option>
                  <option value="READING">READING</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Shelf Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Home Shelf, Desk Rack"
                className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="px-4 py-2 rounded-xl border border-rule text-xs font-medium text-ink-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-all"
              >
                {saving ? 'Adding to Sheets...' : 'Save to Library'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
