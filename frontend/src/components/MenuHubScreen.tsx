import React from 'react';
import {
  Users,
  ShoppingBag,
  Handshake,
  PieChart,
  Wrench,
  Camera,
  Dices,
  Sun,
  Moon,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const MenuHubScreen: React.FC = () => {
  const {
    authUser,
    emailVerified,
    alcoveOverview,
    lendingRecords,
    wishlist,
    theme,
    toggleTheme,
    setActiveTab,
    setScannerOpen,
    setPickNextModalOpen,
  } = useLibraryStore();

  const username = authUser || 'reader';
  const monogram = username.slice(0, 2).toUpperCase();
  const primaryAlcove = alcoveOverview?.alcoves[0] || null;
  const activeLentCount = lendingRecords.filter((r) => r.status === 'ACTIVE').length;
  const overdueLentCount = lendingRecords.filter((r) => r.status === 'ACTIVE' && r.is_overdue).length;

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 pb-4">
      {/* 1. Account Section */}
      <section className="space-y-1.5">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-muted px-2">
          Account
        </h2>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="w-full p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark flex items-center justify-between gap-4 text-left hover:border-accent/50 transition-colors cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-button bg-gradient-to-br from-warm to-warm-hover text-white flex items-center justify-center shrink-0 font-serif font-bold text-sm">
              {monogram}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif text-base font-medium text-ink dark:text-ink-dark truncate">
                  {username}
                </span>
                {emailVerified ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-3xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={10} />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-3xs bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                    <AlertCircle size={10} />
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-2xs text-ink-muted font-mono mt-0.5">
                ex/{username} &bull; Profile &amp; Security
              </p>
            </div>
          </div>
          <ChevronRight size={17} className="text-ink-muted shrink-0" />
        </button>
      </section>

      {/* 2. Library Section */}
      <section className="space-y-1.5">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-muted px-2">
          Library
        </h2>
        <div className="rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark divide-y divide-rule/60 dark:divide-rule-dark/60 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('alcoves')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Users size={18} className="text-accent dark:text-accent-dark shrink-0" />
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Family Alcove</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-ink-muted truncate max-w-[130px]">
                {primaryAlcove ? primaryAlcove.name : 'Setup'}
              </span>
              <ChevronRight size={16} className="text-ink-muted" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wishlist')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag size={18} className="text-accent dark:text-accent-dark shrink-0" />
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Acquisitions Wishlist</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {wishlist.length > 0 && (
                <span className="text-xs font-mono text-ink-muted tabular-nums">{wishlist.length}</span>
              )}
              <ChevronRight size={16} className="text-ink-muted" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lending')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Handshake
                size={18}
                className={
                  overdueLentCount > 0
                    ? 'text-amber-600 dark:text-amber-400 shrink-0'
                    : 'text-accent dark:text-accent-dark shrink-0'
                }
              />
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Lending Ledger</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeLentCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-2xs font-mono font-semibold tabular-nums ${
                    overdueLentCount > 0
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : 'bg-canvas dark:bg-canvas-dark text-ink-muted'
                  }`}
                >
                  {activeLentCount}
                </span>
              )}
              <ChevronRight size={16} className="text-ink-muted" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <PieChart size={18} className="text-accent dark:text-accent-dark shrink-0" />
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Library Insights</span>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Wrench size={18} className="text-ink-muted shrink-0" />
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Catalogue Health Audit</span>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>
        </div>
      </section>

      {/* 3. Tools Section */}
      <section className="space-y-1.5">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-muted px-2">
          Tools
        </h2>
        <div className="rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark divide-y divide-rule/60 dark:divide-rule-dark/60 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Camera size={18} className="text-accent dark:text-accent-dark shrink-0" />
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Scan ISBN Barcode</span>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setPickNextModalOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Dices size={18} className="text-accent dark:text-accent-dark shrink-0" />
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Pick My Next Read</span>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>
        </div>
      </section>

      {/* 4. Appearance Section */}
      <section className="space-y-1.5">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-muted px-2">
          Appearance
        </h2>
        <div className="rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between px-4 py-3.5 min-h-[52px]">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon size={18} className="text-accent dark:text-accent-dark shrink-0" />
              ) : (
                <Sun size={18} className="text-amber-500 shrink-0" />
              )}
              <span className="text-sm font-medium text-ink dark:text-ink-dark">Dark Mode</span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle Dark Mode"
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                theme === 'dark' ? 'bg-accent-dark' : 'bg-rule-strong'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
