import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, Lock, X, Check, Sparkles, AlertCircle, LogOut } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const KeySettingsModal: React.FC = () => {
  const {
    keyModalOpen,
    setKeyModalOpen,
    authToken,
    authUser,
    loginOwner,
    logoutOwner,
    triggerCoverEnrichment,
  } = useLibraryStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await loginOwner(username.trim(), password.trim());
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
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
    <AnimatePresence>
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setKeyModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-md bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-2xl shadow-xl overflow-hidden p-5 space-y-4"
          >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="text-accent dark:text-accent-dark h-5 w-5" />
            <h3 className="font-serif text-base font-medium">Library Owner Authentication</h3>
          </div>
          <button
            onClick={() => setKeyModalOpen(false)}
            className="p-1 text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {enrichResult && (
          <div className="p-3 text-xs rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200">
            {enrichResult}
          </div>
        )}

        {/* Signed In State */}
        {authToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserCheck className="text-emerald-700 dark:text-emerald-400 h-5 w-5" />
                <div>
                  <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                    Signed in as <strong className="font-mono">{authUser || 'Owner'}</strong>
                  </p>
                  <p className="text-3xs text-emerald-700 dark:text-emerald-400">
                    Full write access enabled for Google Sheets
                  </p>
                </div>
              </div>

              <button
                onClick={() => logoutOwner()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-white dark:bg-emerald-900/40 hover:bg-emerald-100 text-xs font-medium text-emerald-900 dark:text-emerald-100 transition-colors"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Cover Enrichment Tool */}
            <div className="pt-2 border-t border-rule/60 dark:border-rule-dark/60 space-y-2">
              <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                Automated Cover Enrichment
              </span>
              <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                Scans all books missing covers and searches Google Books → Apple Books India → Open Library to populate high-resolution jackets in Google Sheets.
              </p>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full py-2.5 px-3 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles size={14} className="text-accent" />
                <span>{enriching ? 'Enriching missing covers...' : 'Run Cover Enrichment Waterfall'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleLogin} className="space-y-3">
            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
              Sign in with your library owner credentials (configured in your backend environment variables) to manage your collection.
            </p>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKeyModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-xs transition-colors"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
