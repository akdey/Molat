import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  BookOpen,
  Flame,
  Award,
  Download,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  Lock,
  LogOut,
  Target,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  Handshake,
  Mail,
  Zap,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { changePassword } from '../api/client';
import { PageSkeletonLoader } from './PageSkeletonLoader';
import { EmailVerificationModal } from './EmailVerificationModal';

export const ProfileScreen: React.FC = () => {
  const {
    books,
    portfolio,
    streakSummary,
    wishlist,
    lendingRecords,
    authUser,
    authEmail,
    authRole,
    emailVerified,
    dailyGoal,
    setDailyGoal,
    theme,
    toggleTheme,
    logoutOwner,
    triggerCoverEnrichment,
    setActiveTab,
    addToast,
    syncUserProfile,
    loading,
    refreshing,
  } = useLibraryStore();

  const [copiedHandle, setCopiedHandle] = useState(false);

  // Change Password Form State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Cover Enrichment State
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  // Sign out & verification modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  useEffect(() => {
    if (!authEmail) {
      syncUserProfile();
    }
  }, [authEmail, syncUserProfile]);

  const completedBooks = books.filter((b) => b.reading_status === 'COMPLETED').length;
  const readingBooks = books.filter((b) => b.reading_status === 'READING').length;
  const unreadBooks = books.filter((b) => b.reading_status === 'UNREAD').length;
  const activeLoans = lendingRecords.filter((l) => l.status === 'ACTIVE').length;

  const username = authUser || 'reader';
  const monogram = username.slice(0, 2).toUpperCase();
  const displayEmail = authEmail || null;
  const isOwner = authRole === 'admin' || authRole === 'owner';

  const handleCopyHandle = () => {
    navigator.clipboard.writeText(`ex/${username}`);
    setCopiedHandle(true);
    addToast(`Copied ex/${username} to clipboard`, 'success');
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await triggerCoverEnrichment();
      setEnrichResult(`Scanned ${res.scanned} volumes: Enriched ${res.enriched} new jackets.`);
      addToast(`Enrichment complete: +${res.enriched} covers`, 'success');
    } catch (err: any) {
      setEnrichResult(err.message || 'Failed to enrich covers');
      addToast(err.message || 'Enrichment failed', 'error');
    } finally {
      setEnriching(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill out all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password updated successfully', 'success');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportJSON = () => {
    const backupData = {
      export_version: '2.0.0',
      exported_at: new Date().toISOString(),
      curator: `ex/${username}`,
      library_stats: {
        total_books: books.length,
        completed_books: completedBooks,
        active_loans: activeLoans,
        wishlist_count: wishlist.length,
      },
      portfolio: portfolio || {},
      streak: streakSummary || {},
      books,
      wishlist,
      lending_records: lendingRecords,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `molat-library-backup-${username}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Library JSON backup downloaded', 'success');
  };

  const handleExportCSV = () => {
    const headers = [
      'Book ID',
      'Title',
      'Authors',
      'Genre',
      'Publication Year',
      'Reading Status',
      'Condition',
      'Location',
      'Purchase Price',
      'Replacement Value',
      'Rating',
      'ISBN-13',
    ];

    const rows = books.map((b) => [
      `"${b.book_id}"`,
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.authors || '').replace(/"/g, '""')}"`,
      `"${b.genre || ''}"`,
      `"${b.publication_year || ''}"`,
      `"${b.reading_status}"`,
      `"${b.condition}"`,
      `"${(b.location || '').replace(/"/g, '""')}"`,
      `"${b.purchase_price ?? ''}"`,
      `"${b.rp ?? ''}"`,
      `"${b.rating ?? ''}"`,
      `"${b.isbn_13 || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `molat-catalogue-${username}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Catalogue CSV exported', 'success');
  };

  if ((loading || refreshing) && !authUser) {
    return <PageSkeletonLoader activeTab="profile" />;
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-6">
      {/* Editorial Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rule/80 dark:border-rule-dark/80 pb-4">
        <div className="min-w-0">
          <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-warm dark:text-amber-400">
            ❧ Ex Libris
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Reader Passport
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="px-3.5 py-2 rounded-button border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised hover:border-accent/50 text-ink dark:text-ink-dark text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
          >
            <Lock size={14} className="text-accent dark:text-accent-dark" />
            <span>Change Password</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="px-3.5 py-2 rounded-button border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/25 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 1. Provenance Identity Card */}
      <section
        aria-label="Reader Identity"
        className="rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-4 sm:p-6 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              aria-hidden="true"
              className="w-16 h-16 rounded-card bg-warm text-white flex flex-col items-center justify-center shrink-0 select-none shadow-2xs"
            >
              <span className="text-3xs uppercase tracking-widest font-mono opacity-80">EX</span>
              <span className="font-serif text-xl font-bold tracking-tight">{monogram}</span>
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-xl sm:text-2xl font-medium text-ink dark:text-ink-dark truncate">
                  ex/{username}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyHandle}
                  className="font-mono text-2xs px-2 py-0.5 rounded-md bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark hover:border-accent/50 text-ink dark:text-ink-dark inline-flex items-center gap-1 transition-colors cursor-pointer min-h-[28px]"
                  title="Copy Ex Libris provenance handle"
                  aria-label="Copy Ex Libris handle"
                >
                  {copiedHandle ? (
                    <Check size={11} className="text-emerald-600" />
                  ) : (
                    <Copy size={11} className="text-ink-muted" />
                  )}
                  <span>{copiedHandle ? 'Copied' : 'Copy'}</span>
                </button>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-accent-subtle dark:bg-accent-dark-subtle text-accent dark:text-accent-dark border border-accent/20">
                  <ShieldCheck size={11} />
                  {isOwner ? 'Head Curator & Owner' : 'Private Reader'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-ink-secondary dark:text-ink-dark-secondary">
                {displayEmail && (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-2xs min-w-0">
                      <Mail size={12} className="text-ink-muted shrink-0" />
                      <span className="truncate">{displayEmail}</span>
                      {emailVerified ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-3xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 size={10} />
                          Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowVerifyModal(true)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition-colors cursor-pointer"
                        >
                          <AlertCircle size={10} />
                          Verify Email
                        </button>
                      )}
                    </span>
                    <span className="text-ink-muted">&bull;</span>
                  </>
                )}
                <span className="text-2xs text-ink-muted">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EmailVerificationModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} />

      {/* 2. Reading Journey & Milestone Ledger */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5">
            <BookOpen size={13} className="text-accent dark:text-accent-dark" />
            <span>Reading Journey</span>
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className="text-xs text-accent dark:text-accent-dark hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>365-Day Matrix</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Finished</span>
              <Award size={15} className="text-shelf-green dark:text-emerald-400" />
            </div>
            <p className="font-serif text-2xl font-semibold text-ink dark:text-ink-dark tabular-nums">
              {completedBooks}
            </p>
            <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary block">
              Volumes completed
            </span>
          </div>

          <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Streak</span>
              <Flame size={15} className="text-warm" />
            </div>
            <p className="font-serif text-2xl font-semibold text-ink dark:text-ink-dark tabular-nums">
              {streakSummary?.current_streak_days || 0}{' '}
              <span className="text-xs font-sans font-normal text-ink-muted">days</span>
            </p>
            <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary block tabular-nums">
              Best: {streakSummary?.longest_streak_days || 0}d
            </span>
          </div>

          <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Shield Bank</span>
              <Shield size={15} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="font-serif text-2xl font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums">
                {streakSummary?.freeze_bank_count ?? 0}
              </p>
              <span className="text-xs font-medium text-ink-muted">/ 3 banked</span>
            </div>
            <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary block">
              {streakSummary?.freeze_recovery_active ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-0.5">
                  <Zap size={10} /> Fast Recovery
                </span>
              ) : (streakSummary?.freeze_bank_count ?? 0) >= 3 ? (
                'Full protection armed'
              ) : (
                'Earn every 7 days'
              )}
            </span>
          </div>

          <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Velocity</span>
              <TrendingUp size={15} className="text-accent dark:text-accent-dark" />
            </div>
            <p className="font-serif text-2xl font-semibold text-ink dark:text-ink-dark tabular-nums">
              {streakSummary?.reading_velocity_pages_per_day || 0.0}
            </p>
            <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary block">
              14-day pages/day
            </span>
          </div>
        </div>
      </section>

      {/* 3. Library Valuation & Reading Pace (2-column balanced grid on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Library Valuation & Shelves */}
        <section className="space-y-3 flex flex-col">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary">
              Library Valuation
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('insights')}
              className="text-xs text-accent dark:text-accent-dark hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Insights</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark flex-1 flex flex-col justify-between gap-4 shadow-2xs">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-rule/50 dark:border-rule-dark/50">
              <div>
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                  Catalogued
                </span>
                <p className="font-serif text-xl font-semibold text-ink dark:text-ink-dark tabular-nums mt-0.5">
                  {books.length} <span className="text-xs font-sans font-normal text-ink-muted">vols</span>
                </p>
              </div>

              <div>
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                  Active Lending
                </span>
                <p className="font-serif text-xl font-semibold text-accent dark:text-accent-dark tabular-nums mt-0.5">
                  {activeLoans} <span className="text-xs font-sans font-normal text-ink-muted">lent out</span>
                </p>
              </div>

              <div>
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                  Acquisition Spend
                </span>
                <p className="font-serif text-xl font-semibold text-ink dark:text-ink-dark tabular-nums mt-0.5">
                  ₹{Math.round(portfolio?.total_cp || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                  Replacement Value
                </span>
                <p className="font-serif text-xl font-semibold text-shelf-green dark:text-emerald-400 tabular-nums mt-0.5">
                  ₹{Math.round(portfolio?.total_rp || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-secondary dark:text-ink-dark-secondary">
              <div className="flex items-center gap-2.5 flex-wrap tabular-nums">
                <span>
                  Reading: <strong className="text-ink dark:text-ink-dark">{readingBooks}</strong>
                </span>
                <span className="text-ink-muted">&bull;</span>
                <span>
                  TBR: <strong className="text-ink dark:text-ink-dark">{unreadBooks}</strong>
                </span>
                <span className="text-ink-muted">&bull;</span>
                <span>
                  Wishlist: <strong className="text-ink dark:text-ink-dark">{wishlist.length}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('lending')}
                className="text-accent dark:text-accent-dark hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <Handshake size={13} />
                <span>Lending Ledger</span>
              </button>
            </div>
          </div>
        </section>

        {/* Reading Pace & Theme */}
        <section className="space-y-3 flex flex-col">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary flex items-center gap-1.5">
              <Target size={13} className="text-accent dark:text-accent-dark" />
              <span>Reading Pace &amp; Theme</span>
            </h2>
          </div>

          <div className="p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark flex-1 flex flex-col justify-between gap-4 shadow-2xs">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink dark:text-ink-dark">Daily Page Goal</p>
                  <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                    Target required each day to keep your streak alive.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-accent dark:text-accent-dark px-2.5 py-1 rounded-input bg-accent/10 shrink-0">
                  {dailyGoal || 15} pgs/day
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                {[10, 15, 20, 25, 30, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDailyGoal(preset)}
                    className={`px-3 py-1.5 rounded-button text-xs font-medium transition-colors cursor-pointer min-h-[38px] tabular-nums ${
                      (dailyGoal || 15) === preset
                        ? 'bg-accent text-white'
                        : 'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark text-ink dark:text-ink-dark hover:border-accent/50'
                    }`}
                  >
                    {preset}p
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-rule/50 dark:border-rule-dark/50 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink dark:text-ink-dark">
                  {theme === 'dark' ? 'Deep Charcoal Ink' : 'Warm Ivory Paper'}
                </p>
                <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                  {theme === 'dark' ? 'Nighttime reading palette' : 'Archival daylight palette'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-3.5 py-2 rounded-button border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark hover:border-accent/50 text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer min-h-[44px] shrink-0"
              >
                {theme === 'dark' ? (
                  <Sun size={14} className="text-amber-500" />
                ) : (
                  <Moon size={14} className="text-accent" />
                )}
                <span>{theme === 'dark' ? 'Ivory Paper' : 'Charcoal Ink'}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Data Ownership & Shelf Maintenance */}
      <section className="space-y-3">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary px-0.5">
          Data Ownership &amp; Maintenance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-ink dark:text-ink-dark">
                <FileJson size={16} className="text-warm shrink-0" />
                <span>Full Backup (JSON)</span>
              </div>
              <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary mt-1 leading-relaxed">
                Complete snapshot of books, reading logs, wishlist, and lending records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full py-2 px-3 rounded-button border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:border-accent/50 text-xs font-medium text-ink dark:text-ink-dark inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Download size={14} />
              <span>Download JSON</span>
            </button>
          </div>

          <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-ink dark:text-ink-dark">
                <FileSpreadsheet size={16} className="text-shelf-green dark:text-emerald-400 shrink-0" />
                <span>Catalogue Sheet (CSV)</span>
              </div>
              <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary mt-1 leading-relaxed">
                Spreadsheet export with prices, locations, conditions, and ISBN-13.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full py-2 px-3 rounded-button border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:border-accent/50 text-xs font-medium text-ink dark:text-ink-dark inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-4 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-ink dark:text-ink-dark">
                <Sparkles size={16} className="text-accent dark:text-accent-dark shrink-0" />
                <span>Enrich Book Jackets</span>
              </div>
              <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary mt-1 leading-relaxed">
                Auto-fetch missing covers via Google Books, Apple Books &amp; Open Library.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnrich}
              disabled={enriching}
              className="w-full py-2 px-3 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <Sparkles size={14} className={enriching ? 'animate-spin' : ''} />
              <span>{enriching ? 'Enriching...' : 'Enrich Missing Covers'}</span>
            </button>
          </div>
        </div>

        {enrichResult && (
          <div className="p-3.5 rounded-card bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{enrichResult}</span>
          </div>
        )}
      </section>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md p-6 rounded-card bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-button bg-accent/10 text-accent dark:text-accent-dark">
                    <Lock size={18} />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                    Change Password
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  aria-label="Close modal"
                  className="p-2 rounded-button text-ink-muted hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {passwordError && (
                <div className="p-3 rounded-input bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs border border-red-200 dark:border-red-900/40 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-input bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5 pt-1">
                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-rule/50 dark:border-rule-dark/50">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 rounded-button border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-canvas dark:hover:bg-canvas-dark transition-colors cursor-pointer min-h-[40px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 min-h-[40px]"
                  >
                    {passwordLoading ? 'Updating...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SIGN OUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm p-6 rounded-card bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-card bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 mx-auto flex items-center justify-center">
                <LogOut size={22} />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                  Sign Out of Molat?
                </h3>
                <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
                  Your reading streak and catalogue remain safe in the cloud database. You can sign back in anytime.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 rounded-button border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-canvas dark:hover:bg-canvas-dark transition-colors cursor-pointer min-h-[44px]"
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logoutOwner();
                  }}
                  className="flex-1 py-2 rounded-button bg-red-700 hover:bg-red-800 text-white text-xs font-medium transition-colors cursor-pointer min-h-[44px]"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
