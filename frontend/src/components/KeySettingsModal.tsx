import React, { useState } from 'react';
import { KeyRound, X, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const KeySettingsModal: React.FC = () => {
  const {
    keyModalOpen,
    setKeyModalOpen,
    libraryKey,
    setLibraryKey,
    triggerCoverEnrichment,
  } = useLibraryStore();

  const [inputKey, setInputKey] = useState(libraryKey);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!keyModalOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setLibraryKey(inputKey.trim());
    setKeyModalOpen(false);
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setErrorMsg(null);
    setEnrichResult(null);
    try {
      const res = await triggerCoverEnrichment();
      setEnrichResult(`Scanned ${res.scanned} books: Enriched ${res.enriched} new covers!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to run cover enrichment.');
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="text-accent dark:text-accent-dark h-5 w-5" />
            <h3 className="font-serif text-base font-medium">Library Settings & Key</h3>
          </div>
          <button
            onClick={() => setKeyModalOpen(false)}
            className="p-1 text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200">
            {errorMsg}
          </div>
        )}

        {enrichResult && (
          <div className="p-3 text-xs rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200">
            {enrichResult}
          </div>
        )}

        {/* API Key Form */}
        <form onSubmit={handleSaveKey} className="space-y-3">
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
              X-Library-Key (State Mutation Secret)
            </label>
            <input
              type="password"
              placeholder="development-secret-key-change-in-production"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
            />
            <p className="text-3xs text-ink-muted pt-0.5">
              Required for write actions (logging reading sessions, adding/editing books, acquiring wishlist items).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setKeyModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-rule text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-accent text-white text-xs font-medium"
            >
              Save Key
            </button>
          </div>
        </form>

        {/* Cover Enrichment Tool */}
        <div className="pt-3 border-t border-rule/60 dark:border-rule-dark/60 space-y-2">
          <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
            Automated Cover Enrichment
          </span>
          <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
            Scans all books with missing covers and searches Google Books $\rightarrow$ Apple Books India $\rightarrow$ Open Library to update high-resolution covers in Google Sheets.
          </p>
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="w-full py-2 px-3 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles size={14} className="text-accent" />
            <span>{enriching ? 'Enriching missing covers...' : 'Run Cover Enrichment Waterfall'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

