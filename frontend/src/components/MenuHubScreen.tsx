import React from 'react';
import {
  User,
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

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5 pb-4">
      {/* 1. Reader Profile Entry Card */}
      <button
        onClick={() => setActiveTab('profile')}
        className="w-full p-4 rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark flex items-center justify-between gap-4 text-left hover:border-accent/50 transition-colors cursor-pointer shadow-xs"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C2410C] to-[#9A3412] text-white flex flex-col items-center justify-center shrink-0 font-serif font-bold text-base">
            {monogram}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-base font-semibold text-ink dark:text-ink-dark truncate">
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
            <p className="text-xs text-ink-muted font-mono">ex/{username} &bull; Profile, Exports &amp; Security</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-ink-muted shrink-0" />
      </button>

      {/* 2. Library Spaces */}
      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-muted px-1">
          Library Spaces
        </h2>
        <div className="rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark divide-y divide-rule/50 dark:divide-rule-dark/50 overflow-hidden shadow-xs">
          <button
            onClick={() => setActiveTab('alcoves')}
            className="w-full flex items-center justify-between p-4 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[56px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Users size={18} className="text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink dark:text-ink-dark">Family Alcove</p>
                <p className="text-3xs text-ink-muted">
                  {primaryAlcove ? `${primaryAlcove.name} (${alcoveOverview?.shared_books.length || 0} shared)` : 'Create or join a shared household shelf'}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className="w-full flex items-center justify-between p-4 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[56px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag size={18} className="text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink dark:text-ink-dark">Acquisitions Wishlist</p>
                <p className="text-3xs text-ink-muted">{wishlist.length} planned books</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>

          <button
            onClick={() => setActiveTab('lending')}
            className="w-full flex items-center justify-between p-4 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[56px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Handshake size={18} className="text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink dark:text-ink-dark">Lending Ledger</p>
                <p className="text-3xs text-ink-muted">{activeLentCount} active loans</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className="w-full flex items-center justify-between p-4 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[56px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <PieChart size={18} className="text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink dark:text-ink-dark">Library Insights</p>
                <p className="text-3xs text-ink-muted">Valuation, genres &amp; publication eras</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className="w-full flex items-center justify-between p-4 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[56px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Wrench size={18} className="text-ink-muted shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink dark:text-ink-dark">Catalogue Health Audit</p>
                <p className="text-3xs text-ink-muted">Missing covers &amp; ISBN cleanup</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          </button>
        </div>
      </section>

      {/* 3. Quick Tools & Appearance */}
      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-muted px-1">
          Tools &amp; Preferences
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/50 flex flex-col items-start gap-2 text-left min-h-[84px] cursor-pointer shadow-xs"
          >
            <Camera size={18} className="text-accent" />
            <span className="text-xs font-medium text-ink dark:text-ink-dark">Scan ISBN</span>
          </button>

          <button
            onClick={() => setPickNextModalOpen(true)}
            className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/50 flex flex-col items-start gap-2 text-left min-h-[84px] cursor-pointer shadow-xs"
          >
            <Dices size={18} className="text-accent" />
            <span className="text-xs font-medium text-ink dark:text-ink-dark">Pick Next Read</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/50 flex flex-col items-start gap-2 text-left min-h-[84px] cursor-pointer shadow-xs"
          >
            {theme === 'light' ? <Moon size={18} className="text-accent" /> : <Sun size={18} className="text-amber-400" />}
            <span className="text-xs font-medium text-ink dark:text-ink-dark">
              {theme === 'light' ? 'Dark Mode' : 'Daylight Mode'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent/50 flex flex-col items-start gap-2 text-left min-h-[84px] cursor-pointer shadow-xs"
          >
            <User size={18} className="text-accent" />
            <span className="text-xs font-medium text-ink dark:text-ink-dark">Account &amp; Backup</span>
          </button>
        </div>
      </section>
    </div>
  );
};
