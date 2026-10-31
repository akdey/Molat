import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Check, AlertTriangle, BookOpen, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { createBook } from '../api/client';
import type { BookCondition, ReadingStatus } from '../types/book';

// Helper functions to convert between ISBN-13 and ISBN-10
function deriveIsbn10(isbn13: string): string | null {
  const clean = isbn13.replace(/[^0-9X]/gi, '').trim();
  if (clean.length !== 13 || !clean.startsWith('978')) return null;
  const core = clean.substring(3, 12);
  let s = 0;
  for (let i = 0; i < 9; i++) {
    s += parseInt(core[i]) * (10 - i);
  }
  const rem = (11 - (s % 11)) % 11;
  const cd = rem === 10 ? 'X' : rem.toString();
  return core + cd;
}

function deriveIsbn13(isbn10: string): string | null {
  const clean = isbn10.replace(/[^0-9X]/gi, '').trim();
  if (clean.length !== 10) return null;
  const core = '978' + clean.substring(0, 9);
  let s = 0;
  for (let i = 0; i < 12; i++) {
    s += parseInt(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const cd = (10 - (s % 10)) % 10;
  return core + cd.toString();
}

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
  const [isbn10, setIsbn10] = useState<string>('');
  const [isbn13, setIsbn13] = useState<string>('');
  const [duplicateBook, setDuplicateBook] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState<boolean>(false);
  
  // Review before save form fields
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [genre, setGenre] = useState('');
  const [publisher, setPublisher] = useState('');
  const [pubYear, setPubYear] = useState<number | undefined>(undefined);
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
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });

        qrCodeScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.floor(Math.min(viewfinderWidth * 0.9, 320));
              const height = Math.floor(Math.min(viewfinderHeight * 0.55, 170));
              return { width, height };
            },
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { min: 640, ideal: 1920 },
              height: { min: 480, ideal: 1080 },
              advanced: [{ focusMode: 'continuous' } as any],
            },
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

  // Lookup metadata from Google Books, Apple Books, and Open Library
  const lookupMetadata = async (isbn: string) => {
    const clean = isbn.replace(/[^0-9X]/gi, '').trim();
    if (clean.length < 9) return;

    // Derive counterpart ISBN immediately so both are present
    let i10 = isbn10;
    let i13 = isbn13;
    if (clean.length === 13) {
      i13 = clean;
      if (!i10) i10 = deriveIsbn10(clean) || '';
    } else if (clean.length === 10) {
      i10 = clean;
      if (!i13) i13 = deriveIsbn13(clean) || '';
    }
    if (i10) setIsbn10(i10);
    if (i13) setIsbn13(i13);

    setLookingUp(true);
    let foundTitle = '';
    let foundRp = 0;

    try {
      // 1. Google Books API (best for Retail MRP, categories, publisher, both ISBNs)
      try {
        const gbRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`
        );
        if (gbRes.ok) {
          const data = await gbRes.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const info = item.volumeInfo || {};
            const saleInfo = item.saleInfo || {};

            if (info.title) {
              setTitle(info.title);
              foundTitle = info.title;
            }
            if (info.authors && info.authors.length > 0) {
              setAuthors(info.authors.join(', '));
            }
            if (info.categories && info.categories.length > 0) {
              setGenre(info.categories[0]);
            }
            if (info.publisher) {
              setPublisher(info.publisher);
            }
            if (info.publishedDate) {
              const yr = parseInt(info.publishedDate.substring(0, 4));
              if (!isNaN(yr)) setPubYear(yr);
            }

            // Extract industry identifiers (ISBN-10 & ISBN-13)
            if (info.industryIdentifiers && Array.isArray(info.industryIdentifiers)) {
              for (const id of info.industryIdentifiers) {
                if (id.type === 'ISBN_10' && id.identifier) {
                  setIsbn10(id.identifier);
                  i10 = id.identifier;
                } else if (id.type === 'ISBN_13' && id.identifier) {
                  setIsbn13(id.identifier);
                  i13 = id.identifier;
                }
              }
            }

            // Extract Verified Retail Price (MRP) from Google Books saleInfo
            const listPrice = saleInfo.listPrice?.amount || saleInfo.retailPrice?.amount;
            if (listPrice && typeof listPrice === 'number' && listPrice > 0) {
              foundRp = Math.round(listPrice);
              setRp(foundRp);
            }

            // Image cover
            const rawImg =
              info.imageLinks?.extraLarge ||
              info.imageLinks?.large ||
              info.imageLinks?.medium ||
              info.imageLinks?.thumbnail ||
              info.imageLinks?.smallThumbnail;
            if (rawImg) {
              setCoverUrl(rawImg.replace(/^http:\/\//i, 'https://'));
            }
          }
        }
      } catch (gbErr) {
        console.warn('Google Books lookup notice:', gbErr);
      }

      // 2. Apple Books Search fallback (country=IN) for price & artwork if needed
      if (foundRp === 0 || !foundTitle) {
        try {
          const appleRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&country=IN&media=ebook&limit=1`
          );
          if (appleRes.ok) {
            const appleData = await appleRes.json();
            if (appleData.results && appleData.results.length > 0) {
              const item = appleData.results[0];
              if (!foundTitle && item.trackName) {
                setTitle(item.trackName);
                foundTitle = item.trackName;
              }
              if (item.artistName) setAuthors((prev) => prev || item.artistName);
              if (item.primaryGenreName) setGenre((prev) => prev || item.primaryGenreName);
              if (foundRp === 0 && item.price && typeof item.price === 'number' && item.price > 0) {
                foundRp = Math.round(item.price);
                setRp(foundRp);
              }
              if (item.artworkUrl100) {
                setCoverUrl((prev) => prev || item.artworkUrl100.replace('100x100bb', '600x600bb'));
              }
            }
          }
        } catch (appleErr) {
          console.warn('Apple Books lookup notice:', appleErr);
        }
      }

      // 3. Open Library fallback for extra details, ISBN-10, ISBN-13
      try {
        const olRes = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`
        );
        if (olRes.ok) {
          const data = await olRes.json();
          const item = data[`ISBN:${clean}`];
          if (item) {
            if (!foundTitle && item.title) {
              setTitle(item.title);
              foundTitle = item.title;
            }
            if (item.authors && item.authors.length > 0) {
              setAuthors((prev) => prev || item.authors.map((a: any) => a.name).join(', '));
            }
            if (item.subjects && item.subjects.length > 0) {
              setGenre((prev) => prev || item.subjects[0].name);
            }
            if (item.publishers && item.publishers.length > 0) {
              setPublisher((prev) => prev || item.publishers[0].name);
            }
            if (item.identifiers) {
              if (item.identifiers.isbn_10 && item.identifiers.isbn_10.length > 0) {
                setIsbn10((prev) => prev || item.identifiers.isbn_10[0]);
              }
              if (item.identifiers.isbn_13 && item.identifiers.isbn_13.length > 0) {
                setIsbn13((prev) => prev || item.identifiers.isbn_13[0]);
              }
            }
            if (item.cover?.large || item.cover?.medium) {
              setCoverUrl((prev) => prev || item.cover.large || item.cover.medium);
            }
          }
        }
      } catch (olErr) {
        console.warn('Open Library lookup notice:', olErr);
      }

      // 4. Default cover fallback if still empty
      setCoverUrl((prev) => prev || `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`);

      if (foundTitle) {
        addToast(
          `Found "${foundTitle}"${foundRp > 0 ? ` (MRP ₹${foundRp})` : ''}!`,
          'success'
        );
      } else {
        addToast(`ISBN identified: ${clean}. Confirm book details to save.`, 'info');
      }
    } catch (err) {
      console.warn('Metadata lookup error:', err);
    } finally {
      setLookingUp(false);
    }
  };

  const handleIsbnIdentified = (isbn: string) => {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '').trim();
    setScannedIsbn(cleanIsbn);

    let i10 = '';
    let i13 = '';
    if (cleanIsbn.length === 13) {
      i13 = cleanIsbn;
      i10 = deriveIsbn10(cleanIsbn) || '';
    } else if (cleanIsbn.length === 10) {
      i10 = cleanIsbn;
      i13 = deriveIsbn13(cleanIsbn) || '';
    }
    setIsbn10(i10);
    setIsbn13(i13);

    // Duplicate check in existing catalogue
    const match = books.find(
      (b) =>
        (b.isbn_13 && b.isbn_13.replace(/[^0-9X]/gi, '') === cleanIsbn) ||
        (b.isbn_10 && b.isbn_10.replace(/[^0-9X]/gi, '') === cleanIsbn) ||
        (i10 && b.isbn_10 && b.isbn_10.replace(/[^0-9X]/gi, '') === i10) ||
        (i13 && b.isbn_13 && b.isbn_13.replace(/[^0-9X]/gi, '') === i13)
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

    const finalIsbn13 = isbn13.trim() || (scannedIsbn.length === 13 ? scannedIsbn : deriveIsbn13(scannedIsbn) || undefined);
    const finalIsbn10 = isbn10.trim() || (scannedIsbn.length === 10 ? scannedIsbn : deriveIsbn10(scannedIsbn) || undefined);

    try {
      const created = await createBook(
        {
          title: title.trim(),
          authors: authors.trim() || undefined,
          genre: genre.trim() || undefined,
          publisher: publisher.trim() || undefined,
          publication_year: pubYear || undefined,
          cover_url: coverUrl.trim() || undefined,
          isbn_13: finalIsbn13,
          isbn_10: finalIsbn10,
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
              <div className="relative w-full rounded-2xl overflow-hidden border border-rule dark:border-rule-dark bg-black shadow-inner min-h-[260px] flex items-center justify-center">
                <div id="barcode-scanner-video" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl" />
                {/* Aiming Reticle (aligned directly with scanner detection box) */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-[88%] max-w-[320px] h-[150px] border-2 border-accent/80 rounded-xl relative shadow-lg bg-accent/5">
                    {/* Animated scanning laser line */}
                    <div className="w-full h-0.5 bg-accent/90 shadow-[0_0_10px_rgba(180,83,9,0.9)] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-3xs font-medium text-white/95 bg-black/75 backdrop-blur-xs px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      Align barcode inside frame
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
            {/* ISBN-13 and ISBN-10 Dual Identification */}
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted font-sans flex items-center justify-between">
                  <span>ISBN-13</span>
                  {isbn13 && <span className="text-emerald-600 dark:text-emerald-400 font-normal lowercase">saved</span>}
                </label>
                <input
                  type="text"
                  value={isbn13}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setIsbn13(val);
                    if (val.length === 13 && !isbn10) {
                      const d10 = deriveIsbn10(val);
                      if (d10) setIsbn10(d10);
                    }
                  }}
                  placeholder="978..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted font-sans flex items-center justify-between">
                  <span>ISBN-10</span>
                  {isbn10 && <span className="text-emerald-600 dark:text-emerald-400 font-normal lowercase">saved</span>}
                </label>
                <input
                  type="text"
                  value={isbn10}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setIsbn10(val);
                    if (val.length === 10 && !isbn13) {
                      const d13 = deriveIsbn13(val);
                      if (d13) setIsbn13(d13);
                    }
                  }}
                  placeholder="0..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>

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
                  Categories / Genres
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Fiction, Mystery, Thriller"
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
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted font-sans flex items-center justify-between">
                  <span>Retail MRP (₹)</span>
                  {rp > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-normal lowercase">auto-fetched</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  value={rp}
                  onChange={(e) => setRp(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 499"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent font-mono font-medium"
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
