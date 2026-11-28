import React, { useMemo } from 'react';
import {
  Users,
  ShoppingBag,
  Handshake,
  PieChart,
  Wrench,
  Camera,
  Dices,
  Timer,
  Mic,
  Sun,
  Moon,
  RefreshCw,
  LogOut,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const MenuHubScreen: React.FC = () => {
  const {
    authUser,
    emailVerified,
    books,
    portfolio,
    streakSummary,
    alcoveOverview,
    lendingRecords,
    wishlist,
    theme,
    loading,
    refreshing,
    toggleTheme,
    setActiveTab,
    setScannerOpen,
    setPickNextModalOpen,
    setVerifyEmailModalOpen,
    setVoiceAssistantOpen,
    openFocusRoom,
    loadAllData,
    logout,
  } = useLibraryStore();

  const username = authUser || 'reader';
  const monogram = username.slice(0, 2).toUpperCase();
  const primaryAlcove = alcoveOverview?.alcoves[0] || null;
  const alcoveCount = alcoveOverview?.alcoves.length ?? 0;

  const {
    readingCount,
    completedCount,
    auditNeededCount,
    activeLentCount,
    overdueLentCount,
    wishlistEstimate,
  } = useMemo(() => {
    const reading = books.filter((b) => b.reading_status === 'READING').length;
    const completed = books.filter((b) => b.reading_status === 'COMPLETED').length;
    const audit = books.filter(
      (b) => !b.cover_url || (!b.isbn_13 && !b.isbn_10) || !b.genre
    ).length;
    const activeLent = lendingRecords.filter((r) => r.status === 'ACTIVE');
    const overdue = activeLent.filter((r) => r.is_overdue).length;
    const est = wishlist.reduce((sum, item) => sum + (item.target_price ?? item.expected_rp ?? 0), 0);

    return {
      readingCount: reading,
      completedCount: completed,
      auditNeededCount: audit,
      activeLentCount: activeLent.length,
      overdueLentCount: overdue,
      wishlistEstimate: est,
    };
  }, [books, lendingRecords, wishlist]);

  const currentStreak = streakSummary?.current_streak_days ?? 0;
  const totalSpend = portfolio?.total_cp ?? 0;
  const formattedSpend = totalSpend > 0 ? `₹${Math.round(totalSpend).toLocaleString('en-IN')}` : '₹0';
  const formattedWishlistEst =
    wishlistEstimate > 0 ? `₹${Math.round(wishlistEstimate).toLocaleString('en-IN')} est.` : null;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-6">
      {/* Editorial Directory Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rule/80 dark:border-rule-dark/80 pb-4">
        <div className="min-w-0">
          <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-warm dark:text-amber-400">
            ❧ Library Annex
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Directory &amp; Desk Tools
          </h1>
        </div>
        <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
          Alcoves, ledger, acquisitions, and reading room utilities.
        </p>
      </header>

      {/* 1. Ex Libris Reader Passport */}
      <section aria-labelledby="more-account-heading">
        <h2 id="more-account-heading" className="sr-only">
          Reader Passport
        </h2>
        <div className="rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Identity */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                aria-hidden="true"
                className="w-12 h-12 rounded-button bg-warm text-white flex items-center justify-center shrink-0 font-serif font-bold text-base tracking-wide shadow-2xs"
              >
                {monogram}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-lg font-medium text-ink dark:text-ink-dark truncate">
                    ex/{username}
                  </span>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
                      <CheckCircle2 size={10} />
                      Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVerifyEmailModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-800/60 hover:bg-amber-200/80 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                    >
                      <AlertCircle size={10} />
                      Verify Email
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 truncate">
                  Reader Passport
                </p>
              </div>
            </div>

            {/* Live Compact Metrics + Profile CTA */}
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-rule/60 dark:border-rule-dark/60">
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-2.5 py-1.5 rounded-input bg-canvas dark:bg-canvas-dark border border-rule/80 dark:border-rule-dark/80 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-accent dark:text-accent-dark shrink-0" />
                  <span className="text-xs font-semibold font-mono tabular-nums text-ink dark:text-ink-dark">
                    {books.length}
                  </span>
                  <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                    vols
                  </span>
                </div>

                <div className="px-2.5 py-1.5 rounded-input bg-canvas dark:bg-canvas-dark border border-rule/80 dark:border-rule-dark/80 flex items-center gap-1.5">
                  <Flame size={13} className="text-warm shrink-0" />
                  <span className="text-xs font-semibold font-mono tabular-nums text-ink dark:text-ink-dark">
                    {currentStreak}d
                  </span>
                  <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                    streak
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-button bg-surface-raised dark:bg-surface-dark-raised border border-rule dark:border-rule-dark hover:border-accent/60 dark:hover:border-accent-dark/60 text-xs font-medium text-ink dark:text-ink-dark transition-colors min-h-[44px] cursor-pointer"
              >
                <span>Profile &amp; Security</span>
                <ChevronRight size={15} className="text-ink-muted" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Collection & Annexes (Responsive Grid with Subgrid alignment) */}
      <section aria-labelledby="more-annexes-heading" className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h2
            id="more-annexes-heading"
            className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary"
          >
            Collection &amp; Annexes
          </h2>
          <span className="text-2xs text-ink-muted font-mono tabular-nums">
            {readingCount} reading &bull; {completedCount} finished
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {/* Adda Literary Salon */}
          <button
            type="button"
            onClick={() => setActiveTab('adda')}
            className="group min-w-0 text-left p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 dark:hover:border-accent-dark/50 transition-colors cursor-pointer grid grid-rows-[auto_1fr_auto] gap-2.5 min-h-[132px] shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-button bg-accent/10 dark:bg-accent-dark/15 text-accent dark:text-accent-dark flex items-center justify-center shrink-0">
                <MessageSquare size={18} />
              </div>
              <span className="text-2xs font-medium text-warm dark:text-amber-400">
                Literary Salon
              </span>
            </div>
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                Adda
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-relaxed">
                Quotes, marginalia, book reviews, and quiet reader conversations.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs font-medium text-accent dark:text-accent-dark">
              <span>Enter Adda</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>

          {/* Family Alcove */}
          <button
            type="button"
            onClick={() => setActiveTab('alcoves')}
            className="group min-w-0 text-left p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 dark:hover:border-accent-dark/50 transition-colors cursor-pointer grid grid-rows-[auto_1fr_auto] gap-2.5 min-h-[132px] shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-button bg-warm/10 dark:bg-warm/20 text-warm flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <span className="text-2xs font-medium text-ink-secondary dark:text-ink-dark-secondary truncate max-w-[150px]">
                {primaryAlcove
                  ? alcoveCount > 1
                    ? `${primaryAlcove.name} +${alcoveCount - 1}`
                    : primaryAlcove.name
                  : 'Not joined'}
              </span>
            </div>
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                Family Alcove
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-relaxed">
                Shared household shelves, member invites, and physical copy tracking.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs font-medium text-accent dark:text-accent-dark">
              <span>{primaryAlcove ? 'Open Alcove' : 'Set up Alcove'}</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>

          {/* Lending Ledger */}
          <button
            type="button"
            onClick={() => setActiveTab('lending')}
            className="group min-w-0 text-left p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 dark:hover:border-accent-dark/50 transition-colors cursor-pointer grid grid-rows-[auto_1fr_auto] gap-2.5 min-h-[132px] shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className={`w-9 h-9 rounded-button flex items-center justify-center shrink-0 ${
                  overdueLentCount > 0
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : 'bg-accent/10 dark:bg-accent-dark/15 text-accent dark:text-accent-dark'
                }`}
              >
                <Handshake size={18} />
              </div>
              {overdueLentCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-3xs font-mono font-semibold tabular-nums bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  {overdueLentCount} overdue
                </span>
              ) : (
                <span className="text-2xs font-mono tabular-nums text-ink-secondary dark:text-ink-dark-secondary">
                  {activeLentCount > 0 ? `${activeLentCount} lent out` : 'All copies home'}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                Lending Ledger
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-relaxed">
                Track borrowed books, due dates, and WhatsApp return reminders.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs font-medium text-accent dark:text-accent-dark">
              <span>Inspect Ledger</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>

          {/* Acquisitions Wishlist */}
          <button
            type="button"
            onClick={() => setActiveTab('wishlist')}
            className="group min-w-0 text-left p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 dark:hover:border-accent-dark/50 transition-colors cursor-pointer grid grid-rows-[auto_1fr_auto] gap-2.5 min-h-[132px] shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-button bg-accent/10 dark:bg-accent-dark/15 text-accent dark:text-accent-dark flex items-center justify-center shrink-0">
                <ShoppingBag size={18} />
              </div>
              <span className="text-2xs font-mono tabular-nums text-ink-secondary dark:text-ink-dark-secondary">
                {wishlist.length} {wishlist.length === 1 ? 'title' : 'titles'}
                {formattedWishlistEst ? ` • ${formattedWishlistEst}` : ''}
              </span>
            </div>
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                Acquisitions Wishlist
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-relaxed">
                Planned book purchases, target prices, and one-tap shelf acquisition.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs font-medium text-accent dark:text-accent-dark">
              <span>Open Wishlist</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>

          {/* Library Insights */}
          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className="group min-w-0 text-left p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 dark:hover:border-accent-dark/50 transition-colors cursor-pointer grid grid-rows-[auto_1fr_auto] gap-2.5 min-h-[132px] shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-button bg-shelf-green/10 dark:bg-emerald-950/60 text-shelf-green dark:text-emerald-400 flex items-center justify-center shrink-0">
                <PieChart size={18} />
              </div>
              <span className="text-2xs font-mono tabular-nums text-ink-secondary dark:text-ink-dark-secondary">
                {formattedSpend} invested
              </span>
            </div>
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                Library Insights
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-relaxed">
                Spending breakdown, genre distribution, and reading velocity analytics.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs font-medium text-accent dark:text-accent-dark">
              <span>View Analytics</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>

          {/* Catalogue Health Audit */}
          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className="group min-w-0 text-left p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 dark:hover:border-accent-dark/50 transition-colors cursor-pointer grid grid-rows-[auto_1fr_auto] gap-2.5 min-h-[132px] shadow-2xs sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-button bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark text-ink-secondary dark:text-ink-dark-secondary flex items-center justify-center shrink-0">
                <Wrench size={18} />
              </div>
              <span
                className={`text-2xs font-mono tabular-nums ${
                  auditNeededCount > 0
                    ? 'text-warm dark:text-amber-400 font-medium'
                    : 'text-shelf-green dark:text-emerald-400'
                }`}
              >
                {auditNeededCount > 0 ? `${auditNeededCount} gaps found` : 'Catalogue tidy'}
              </span>
            </div>
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark group-hover:text-accent dark:group-hover:text-accent-dark transition-colors">
                Catalogue Health Audit
              </h3>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-relaxed">
                Enrich missing book covers, repair ISBN metadata, and tidy shelf records.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rule/50 dark:border-rule-dark/50 text-2xs font-medium text-accent dark:text-accent-dark">
              <span>Run Audit</span>
              <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </button>
        </div>
      </section>

      {/* 3. Desk Tools */}
      <section aria-labelledby="more-tools-heading" className="space-y-3">
        <h2
          id="more-tools-heading"
          className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary px-0.5"
        >
          Desk &amp; Reading Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-3 p-3.5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 transition-colors text-left min-h-[60px] cursor-pointer min-w-0"
          >
            <div className="w-9 h-9 rounded-button bg-accent/10 dark:bg-accent-dark/15 text-accent dark:text-accent-dark flex items-center justify-center shrink-0">
              <Camera size={17} />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-medium text-ink dark:text-ink-dark truncate">
                Scan ISBN
              </span>
              <span className="block text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                Camera barcode lookup
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPickNextModalOpen(true)}
            className="flex items-center gap-3 p-3.5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 transition-colors text-left min-h-[60px] cursor-pointer min-w-0"
          >
            <div className="w-9 h-9 rounded-button bg-warm/10 dark:bg-warm/20 text-warm flex items-center justify-center shrink-0">
              <Dices size={17} />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-medium text-ink dark:text-ink-dark truncate">
                Pick Next Read
              </span>
              <span className="block text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                Serendipity shelf draw
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openFocusRoom()}
            className="flex items-center gap-3 p-3.5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 transition-colors text-left min-h-[60px] cursor-pointer min-w-0"
          >
            <div className="w-9 h-9 rounded-button bg-shelf-green/10 dark:bg-emerald-950/60 text-shelf-green dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Timer size={17} />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-medium text-ink dark:text-ink-dark truncate">
                Focus Room
              </span>
              <span className="block text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                Timed reading session
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setVoiceAssistantOpen(true)}
            className="flex items-center gap-3 p-3.5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 transition-colors text-left min-h-[60px] cursor-pointer min-w-0"
          >
            <div className="w-9 h-9 rounded-button bg-accent/10 dark:bg-accent-dark/15 text-accent dark:text-accent-dark flex items-center justify-center shrink-0">
              <Mic size={17} />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-medium text-ink dark:text-ink-dark truncate">
                Voice Assistant
              </span>
              <span className="block text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                Hands-free shelf query
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 4. Preferences & Session */}
      <section aria-labelledby="more-prefs-heading" className="space-y-3">
        <h2
          id="more-prefs-heading"
          className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary px-0.5"
        >
          Preferences &amp; Session
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Appearance & Sync */}
          <div className="rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark divide-y divide-rule/60 dark:divide-rule-dark/60 overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]">
              <div className="flex items-center gap-3 min-w-0">
                {theme === 'dark' ? (
                  <Moon size={18} className="text-accent-dark shrink-0" />
                ) : (
                  <Sun size={18} className="text-amber-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-ink dark:text-ink-dark">
                    {theme === 'dark' ? 'Deep Charcoal Ink' : 'Warm Ivory Paper'}
                  </span>
                  <span className="block text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                    Switch light and dark reading themes
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label="Toggle Dark Mode"
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out items-center ${
                  theme === 'dark' ? 'bg-accent-dark' : 'bg-rule-strong'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={loading || refreshing}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-canvas/60 dark:hover:bg-canvas-dark/60 transition-colors text-left min-h-[56px] cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <RefreshCw
                  size={18}
                  className={`text-accent dark:text-accent-dark shrink-0 ${
                    loading || refreshing ? 'animate-spin' : ''
                  }`}
                />
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-ink dark:text-ink-dark">
                    Sync Library Catalogue
                  </span>
                  <span className="block text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                    Refresh books, alcoves, and streak data
                  </span>
                </div>
              </div>
              <span className="text-2xs font-medium text-accent dark:text-accent-dark shrink-0">
                {loading || refreshing ? 'Syncing…' : 'Sync now'}
              </span>
            </button>
          </div>

          {/* Session Card */}
          <div className="rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
                Active Session
              </span>
              <p className="text-sm font-medium text-ink dark:text-ink-dark mt-1">
                Signed in as <span className="font-mono text-accent dark:text-accent-dark">ex/{username}</span>
              </p>
              <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5">
                Your shelves and reading logs are synced to your account.
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto self-start inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/25 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-medium transition-colors min-h-[44px] cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
