import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Check, AlertTriangle, BookOpen, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { createBook } from '../api/client';
import type { BookCondition, ReadingStatus } from '../types/book';

export const BarcodeScannerModal: React.FC = () => {
  const {
    scannerOpen,
    setScannerOpen,
    books,
    loadBooks,
    libraryKey,
    authToken,
    addToast,
    setKeyModalOpen,
  } = useLibraryStore();

  const [scannedIsbn, setScannedIsbn] = useState<string>('');
  const [duplicateBook, setDuplicateBook] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState<boolean>(false);
  
  // Review before save form fields
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [genre, setGenre] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [rp, setRp] = useState<number>(0);
  const [condition, setCondition] = useState<BookCondition>('Good');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('UNREAD');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null);

  // Stop camera when modal is closed
  useEffect(() => {
    if (!scannerOpen) {
      stopCamera();
      setCameraActive(false);
      setCameraError(null);
    }
  }, [scannerOpen]);

  const stopCamera = async () => {
    if (qrCodeScannerRef.current) {
      try {
        if (qrCodeScannerRef.current.isScanning) {
          await qrCodeScannerRef.current.stop();
        }
        await qrCodeScannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      } finally {
        qrCodeScannerRef.current = null;
      }
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);

    // Wait for DOM element to mount
    setTimeout(async () => {
      try {
        await stopCamera();

        const html5QrCode = new Html5Qrcode('barcode-scanner-video', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false,
        });

        qrCodeScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.min(viewfinderWidth * 0.85, 300);
              const height = Math.min(width * 0.55, 160);
              return { width: Math.floor(width), height: Math.floor(height) };
            },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            // Haptic feedback on phone
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([80, 40, 80]);
            }
            stopCamera();
            setCameraActive(false);
            handleIsbnIdentified(decodedText);
          },
          () => {
            // Background scanning noise
          }
        );
      } catch (err: any) {
        console.error('Failed to start camera:', err);
        setCameraError(
          err.message ||
            'Camera permission denied or camera unavailable. You can enter the ISBN manually below.'
        );
        setCameraActive(false);
      }
    }, 150);
  };

  // Lookup metadata from Open Library & Google Books
  const lookupMetadata = async (isbn: string) => {
    const clean = isbn.replace(/[^0-9X]/gi, '').trim();
    if (clean.length < 9) return;

    setLookingUp(true);
    try {
      // 1. Open Library API
      const olRes = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`
      );
      if (olRes.ok) {
        const data = await olRes.json();
        const item = data[`ISBN:${clean}`];
        if (item) {
          if (item.title) setTitle(item.title);
          if (item.authors && item.authors.length > 0) {
            setAuthors(item.authors.map((a: any) => a.name).join(', '));
          }
          if (item.subjects && item.subjects.length > 0) {
            setGenre(item.subjects[0].name);
          }
          if (item.cover?.large || item.cover?.medium) {
            setCoverUrl(item.cover.large || item.cover.medium);
          } else {
            setCoverUrl(`https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`);
          }
          addToast(`Found details for "${item.title}"!`, 'success');
          setLookingUp(false);
          return;
        }
      }

      // 2. Google Books fallback
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`
      );
      if (gbRes.ok) {
        const data = await gbRes.json();
        if (data.items && data.items.length > 0) {
          const info = data.items[0].volumeInfo || {};
          if (info.title) setTitle(info.title);
          if (info.authors && info.authors.length > 0) {
            setAuthors(info.authors.join(', '));
          }
          if (info.categories && info.categories.length > 0) {
            setGenre(info.categories[0]);
          }
          if (info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail) {
            const rawImg = info.imageLinks.extraLarge || info.imageLinks.large || info.imageLinks.medium || info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
            setCoverUrl(rawImg.replace(/^http:\/\//i, 'https://'));
          } else {
            setCoverUrl(`https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`);
          }
          addToast(`Found details for "${info.title}"!`, 'success');
          setLookingUp(false);
          return;
        }
      }

      // 3. Apple Books fallback (iTunes Search API)
      try {
        const appleRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&country=IN&media=ebook&limit=1`
        );
        if (appleRes.ok) {
          const appleData = await appleRes.json();
          if (appleData.results && appleData.results.length > 0) {
            const item = appleData.results[0];
            if (item.trackName) setTitle(item.trackName);
            if (item.artistName) setAuthors(item.artistName);
            if (item.primaryGenreName) setGenre(item.primaryGenreName);
            if (item.artworkUrl100) {
              setCoverUrl(item.artworkUrl100.replace('100x100bb', '600x600bb'));
            }
            addToast(`Found details for "${item.trackName}"!`, 'success');
            setLookingUp(false);
            return;
          }
        }
      } catch (appleErr) {
        // Continue to unindexed notification
      }

      // 4. Default to direct Open Library jacket endpoint if ISBN was detected
      setCoverUrl(`https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`);

      addToast(`ISBN identified: ${clean}. Fill in title & author to save.`, 'info');
    } catch (err) {
      console.warn('Metadata lookup error:', err);
    } finally {
      setLookingUp(false);
    }
  };

  const handleIsbnIdentified = (isbn: string) => {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '').trim();
    setScannedIsbn(cleanIsbn);

    // Duplicate check in existing catalogue
    const match = books.find(
      (b) =>
        (b.isbn_13 && b.isbn_13.replace(/[^0-9X]/gi, '') === cleanIsbn) ||
        (b.isbn_10 && b.isbn_10.replace(/[^0-9X]/gi, '') === cleanIsbn)
    );
    if (match) {
      setDuplicateBook(match);
      addToast(`Notice: Volume already in collection (${match.book_id})`, 'info');
    } else {
      setDuplicateBook(null);
    }

    // Auto-fetch metadata
    lookupMetadata(cleanIsbn);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Book title is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    const token = authToken || libraryKey;
    try {
      const created = await createBook(
        {
          title: title.trim(),
          authors: authors.trim() || undefined,
          genre: genre.trim() || undefined,
          cover_url: coverUrl.trim() || undefined,
          isbn_13: scannedIsbn.length === 13 ? scannedIsbn : undefined,
          isbn_10: scannedIsbn.length === 10 ? scannedIsbn : undefined,
          purchase_price: purchasePrice,
          rp: rp,
          condition,
          reading_status: readingStatus,
          location,
        },
        token
      );
      addToast(`Added "${created.title}" to catalogue!`, 'success');
      await loadBooks(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50">
          <div className="flex items-center gap-2">
            <Camera className="text-accent dark:text-accent-dark h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark leading-tight">
                Scan ISBN Barcode / Add Volume
              </h2>
              <p className="text-3xs text-ink-muted">PWA Rear Camera Scanner & Auto-Lookup</p>
            </div>
          </div>
          <button
            onClick={() => setScannerOpen(false)}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200">
              {errorMsg}
            </div>
          )}

          {cameraError && (
            <div className="p-2.5 text-xs rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
              {cameraError}
            </div>
          )}

          {/* Active Camera Viewfinder */}
          {cameraActive ? (
            <div className="space-y-2">
              <div className="relative w-full rounded-2xl overflow-hidden border-2 border-accent/40 bg-black aspect-video flex items-center justify-center shadow-inner">
                <div id="barcode-scanner-video" className="w-full h-full" />
                {/* Aiming Reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-28 border-2 border-dashed border-white/80 rounded-xl relative shadow-lg">
                    {/* Animated scanning laser line */}
                    <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-3xs font-medium text-white/90 bg-black/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Align ISBN Barcode inside box
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setCameraActive(false);
                }}
                className="w-full py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-rule/40 text-xs font-medium text-ink-secondary"
              >
                Close Camera
              </button>
            </div>
          ) : (
            /* Open Camera Button */
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-3 px-4 rounded-xl border border-dashed border-accent/50 dark:border-accent-dark/40 bg-accent-subtle dark:bg-accent-dark-subtle hover:bg-accent/10 flex items-center justify-center gap-2 text-xs font-medium text-accent dark:text-accent-dark transition-all"
            >
              <Camera size={16} />
              <span>Tap to Open Phone Camera for Barcode Scanning</span>
            </button>
          )}

          {/* Manual ISBN Input & Auto-Lookup */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center justify-between">
              <span>ISBN-10 or ISBN-13</span>
              {lookingUp && (
                <span className="inline-flex items-center gap-1 text-accent animate-pulse font-normal lowercase">
                  <RefreshCw size={10} className="animate-spin" />
                  fetching book details...
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 9780007119356"
                value={scannedIsbn}
                onChange={(e) => setScannedIsbn(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => lookupMetadata(scannedIsbn)}
                disabled={lookingUp || !scannedIsbn.trim()}
                className="px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:border-accent text-xs font-medium flex items-center gap-1 transition-colors"
                title="Lookup details via Open Library & Google Books"
              >
                <Search size={13} />
                <span>Lookup</span>
              </button>
            </div>
          </div>

          {/* Duplicate ISBN Warning */}
          {duplicateBook && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
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
          <form onSubmit={handleSaveBook} className="space-y-2.5 pt-2 border-t border-rule/60">
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
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
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
                  placeholder="e.g. Mystery / Thriller"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
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
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-all shadow-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-white" />
                    <span>Adding to Sheets...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save to Library</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
