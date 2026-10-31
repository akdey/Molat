import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Image as ImageIcon, RefreshCw, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import type { Book } from '../types/book';

interface CoverPickerModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onSaveCover: (newUrl: string) => Promise<void>;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  book,
  isOpen,
  onClose,
  onSaveCover,
}) => {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUrl, setSelectedUrl] = useState<string>(book.cover_url || '');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(book.cover_url || '');
      setCustomUrl('');
      setErrorMsg(null);
      fetchAlternativeCovers();
    }
  }, [isOpen, book]);

  const fetchAlternativeCovers = async () => {
    setLoading(true);
    const urls: Set<string> = new Set();
    if (book.cover_url) urls.add(book.cover_url);

    const cleanIsbn = (book.isbn_13 || book.isbn_10 || '').replace(/[^0-9X]/gi, '').trim();
    const cleanTitle = (book.title || '').trim();
    const primaryAuthor = (book.authors || '').split(',')[0].trim();

    // 1. Direct Open Library ISBN jacket
    if (cleanIsbn) {
      urls.add(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`);
    }

    // 2. Open Library Works Editions (fetches covers from multiple published global editions)
    if (cleanIsbn) {
      try {
        const olIsbnRes = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
        if (olIsbnRes.ok) {
          const isbnData = await olIsbnRes.json();
          const works = isbnData.works;
          if (works && works.length > 0) {
            const workKey = works[0].key; // e.g. /works/OL471667W
            const editionsRes = await fetch(`https://openlibrary.org${workKey}/editions.json?limit=12`);
            if (editionsRes.ok) {
              const editionsData = await editionsRes.json();
              for (const entry of editionsData.entries || []) {
                for (const coverId of entry.covers || []) {
                  if (typeof coverId === 'number' && coverId > 0) {
                    urls.add(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Open Library editions fetch notice:', err);
      }
    }

    // 3. Apple Books Global (country=US) for crisp 600x600 English editions
    if (cleanTitle) {
      try {
        const query = encodeURIComponent(`${cleanTitle} ${primaryAuthor}`.trim());
        const appleRes = await fetch(
          `https://itunes.apple.com/search?term=${query}&country=US&media=ebook&limit=4`
        );
        if (appleRes.ok) {
          const appleData = await appleRes.json();
          for (const item of appleData.results || []) {
            if (item.artworkUrl100) {
              urls.add(item.artworkUrl100.replace('100x100bb', '600x600bb'));
            }
          }
        }
      } catch (appleErr) {
        console.warn('Apple Books global search notice:', appleErr);
      }
    }

    // 4. Google Books English/original editions
    if (cleanTitle) {
      try {
        const q = encodeURIComponent(`intitle:"${cleanTitle}"${primaryAuthor ? `+inauthor:"${primaryAuthor}"` : ''}`);
        const gbRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&langRestrict=en`
        );
        if (gbRes.ok) {
          const gbData = await gbRes.json();
          for (const item of gbData.items || []) {
            const links = item.volumeInfo?.imageLinks;
            const img =
              links?.extraLarge ||
              links?.large ||
              links?.medium ||
              links?.thumbnail ||
              links?.smallThumbnail;
            if (img) {
              urls.add(img.replace(/^http:\/\//i, 'https://'));
            }
          }
        }
      } catch (gbErr) {
        console.warn('Google Books alternative covers notice:', gbErr);
      }
    }

    setCandidates(Array.from(urls).filter(Boolean));
    setLoading(false);
  };

  const handleApply = async () => {
    const finalUrl = customUrl.trim() || selectedUrl;
    if (!finalUrl) {
      setErrorMsg('Please select a cover thumbnail or enter a valid image URL.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSaveCover(finalUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update cover image.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-2xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-accent dark:text-accent-dark" />
              <div>
                <h3 className="font-serif text-sm sm:text-base font-medium text-ink dark:text-ink-dark">
                  Select Book Cover Edition
                </h3>
                <p className="text-3xs text-ink-muted">
                  Choose an alternate original/English edition or paste a custom image URL
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-2.5 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Candidate Cover Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1.5">
                  <Sparkles size={11} className="text-accent" />
                  Available Editions ({candidates.length})
                </span>
                <button
                  type="button"
                  onClick={fetchAlternativeCovers}
                  disabled={loading}
                  className="flex items-center gap-1 text-3xs text-accent hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh search</span>
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 py-6">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] rounded-xl bg-rule/30 dark:bg-rule-dark/30 animate-pulse border border-rule/50"
                    />
                  ))}
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-muted space-y-2">
                  <p>No alternative online covers found for this edition.</p>
                  <p className="text-3xs">You can paste any custom image link below.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1">
                  {candidates.map((url, idx) => {
                    const isSelected = selectedUrl === url && !customUrl.trim();
                    return (
                      <motion.button
                        key={idx}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedUrl(url);
                          setCustomUrl('');
                        }}
                        className={`relative aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? 'border-accent dark:border-accent-dark ring-2 ring-accent/30'
                            : 'border-rule/60 hover:border-accent/40'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Edition option ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Hide broken image cards
                            (e.target as HTMLElement).parentElement?.classList.add('hidden');
                          }}
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-md">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom URL Input */}
            <div className="space-y-1.5 pt-2 border-t border-rule/60 dark:border-rule-dark/60">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                Or paste direct image URL
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  if (e.target.value.trim()) setSelectedUrl('');
                }}
                placeholder="https://... (direct .jpg or .png link)"
                className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={saving || (!selectedUrl && !customUrl.trim())}
              className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-white" />
                  <span>Updating Sheet...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Cover</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
