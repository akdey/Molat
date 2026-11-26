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
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { changePassword } from '../api/client';
import { PageSkeletonLoader } from './PageSkeletonLoader';
import { AlcoveSection } from './AlcoveSection';
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

  // Sign out confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Background silent sync if email or profile hasn't been cached yet
  useEffect(() => {
    if (!authEmail) {
      syncUserProfile();
    }
  }, [authEmail, syncUserProfile]);

  // Derived metrics
  const completedBooks = books.filter((b) => b.reading_status === 'COMPLETED').length;
  const readingBooks = books.filter((b) => b.reading_status === 'READING').length;
  const unreadBooks = books.filter((b) => b.reading_status === 'UNREAD').length;
  const activeLoans = lendingRecords.filter((l) => l.status === 'ACTIVE').length;

  // User Monogram Initials
  const username = authUser || 'Reader';
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
      setEnrichResult(`Scanned ${res.scanned} volumes: Enriched ${res.enriched} new jackets!`);
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

  // Export 1: JSON Backup
  const handleExportJSON = () => {
    const backupData = {
      export_version: '2.0.0',
      exported_at: new Date().toISOString(),
      curator: username,
      library_stats: {
        total_books: books.length,
        completed_books: completedBooks,
        active_loans: activeLoans,
        wishlist_count: wishlist.length,
      },
      portfolio: portfolio || {},
      streak: streakSummary || {},
      books: books,
      wishlist: wishlist,
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

  // Export 2: CSV Shelf Catalogue
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
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. EX LIBRIS PROVENANCE READER CARD */}
      <section
        aria-label="Reader Profile & Ex Libris Bookplate"
        className="relative overflow-hidden rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-6 sm:p-8 shadow-xs"
      >
        {/* Subtle Watermark Archival Bookplate Stamp */}
        <div className="absolute top-4 right-5 sm:top-6 sm:right-8 opacity-5 dark:opacity-10 pointer-events-none select-none font-serif text-8xl sm:text-9xl text-accent dark:text-accent-dark tracking-tighter">
          EX/
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Monogram Bookplate Seal */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#C2410C] to-[#9A3412] text-white flex flex-col items-center justify-center shadow-sm shrink-0 border-2 border-[#E2D9C8]/40 dark:border-white/10 select-none">
              <span className="text-2xs uppercase tracking-widest font-mono opacity-80">EX</span>
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight">{monogram}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink dark:text-ink-dark">
                  {username}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-medium bg-accent-subtle dark:bg-accent-dark-subtle text-accent dark:text-accent-dark border border-accent/20">
                  <ShieldCheck size={11} />
                  {isOwner ? 'Head Curator & Owner' : 'Private Reader'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap text-xs text-ink-secondary dark:text-ink-dark-secondary">
                <button
                  type="button"
                  onClick={handleCopyHandle}
                  className="font-mono text-2xs px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-ink dark:text-ink-dark inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Click to copy Ex Libris provenance handle"
                >
                  <span>ex/{username}</span>
                  {copiedHandle ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="opacity-60" />}
                </button>

                {displayEmail && (
                  <>
                    <span className="text-ink-muted">•</span>
                    <span className="inline-flex items-center gap-1.5 text-2xs text-ink-muted">
                      <Mail size={11} className="opacity-70" />
                      {displayEmail}
                      {emailVerified ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-3xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 size={10} />
                          Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowVerifyModal(true)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-200 cursor-pointer"
                        >
                          <AlertCircle size={10} />
                          Verify Email
                        </button>
                      )}
                    </span>
                  </>
                )}

                <span className="text-ink-muted">•</span>
                <span className="text-2xs text-ink-muted">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </div>

          {/* Quick Security & Account Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="px-3.5 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark hover:border-accent/40 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock size={13} className="text-accent" />
              <span>Change Password</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100/60 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* 1.5 FAMILY ALCOVE (SHARED HOUSEHOLD LIBRARY) */}
      <AlcoveSection onOpenVerifyModal={() => setShowVerifyModal(true)} />
      <EmailVerificationModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} />

      {/* 2. LIFETIME READING JOURNEY & STREAK PROTECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark flex items-center gap-2">
            <BookOpen size={18} className="text-accent" />
            <span>Reading Journey & Milestone Ledger</span>
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className="text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>View 365-Day Reading Matrix →</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Finished Volumes */}
          <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Finished Volumes</span>
              <Award size={15} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-ink dark:text-ink-dark tabular-nums">
              {completedBooks}
            </p>
            <span className="text-3xs text-ink-muted block">Books fully read</span>
          </div>

          {/* 2. Current Streak */}
          <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Reading Streak</span>
              <Flame size={15} className="text-accent animate-pulse" />
            </div>
            <p className="font-serif text-2xl font-bold text-ink dark:text-ink-dark tabular-nums">
              {streakSummary?.current_streak_days || 0} <span className="text-xs font-normal text-ink-muted">Days</span>
            </p>
            <span className="text-3xs text-ink-muted block">
              Personal Record: {streakSummary?.longest_streak_days || 0}d
            </span>
          </div>

          {/* 3. Shield Bank (Streak Freeze) */}
          <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Streak Shield Bank</span>
              <Shield size={15} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="font-serif text-2xl font-bold text-cyan-700 dark:text-cyan-400 tabular-nums">
                {streakSummary?.freeze_bank_count ?? 0}
              </p>
              <span className="text-xs font-medium text-ink-muted">/ 3 banked</span>
            </div>
            <span className="text-3xs text-ink-muted block">
              {streakSummary?.freeze_recovery_active ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-0.5">
                  <Zap size={10} /> Fast Recovery (3d/5d/7d)
                </span>
              ) : (streakSummary?.freeze_bank_count ?? 0) >= 3 ? (
                'Full Protection Armed'
              ) : (
                'Earn shield every 7 days'
              )}
            </span>
          </div>

          {/* 4. Reading Velocity */}
          <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-1">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-3xs uppercase tracking-wider font-medium">Reading Velocity</span>
              <TrendingUp size={15} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-ink dark:text-ink-dark tabular-nums">
              {streakSummary?.reading_velocity_pages_per_day || 0.0}
            </p>
            <span className="text-3xs text-ink-muted block">Rolling 14-day pages/day</span>
          </div>
        </div>
      </section>

      {/* 3. PHYSICAL COLLECTION & PORTFOLIO VALUATION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark flex items-center gap-2">
            <Award size={18} className="text-[#C2410C]" />
            <span>Library Valuation & Shelves</span>
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className="text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Portfolio Breakdown →</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-rule/50 dark:border-rule-dark/50">
            <div>
              <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">Catalogued Volumes</span>
              <p className="font-serif text-xl sm:text-2xl font-bold text-ink dark:text-ink-dark tabular-nums mt-0.5">
                {books.length} <span className="text-xs font-normal text-ink-muted">Books</span>
              </p>
            </div>

            <div>
              <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">Acquisition Spend</span>
              <p className="font-serif text-xl sm:text-2xl font-bold text-ink dark:text-ink-dark tabular-nums mt-0.5">
                ₹{(portfolio?.total_cp || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">Replacement Value</span>
              <p className="font-serif text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                ₹{(portfolio?.total_rp || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div>
              <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">Active Lending</span>
              <p className="font-serif text-xl sm:text-2xl font-bold text-accent dark:text-accent-dark tabular-nums mt-0.5">
                {activeLoans} <span className="text-xs font-normal text-ink-muted">Volumes</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-2xs text-ink-secondary dark:text-ink-dark-secondary">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <span>Currently Reading: <strong className="font-medium text-ink dark:text-ink-dark">{readingBooks}</strong></span>
              <span className="text-ink-muted">•</span>
              <span>To Be Read (TBR): <strong className="font-medium text-ink dark:text-ink-dark">{unreadBooks}</strong></span>
              <span className="text-ink-muted">•</span>
              <span>Wishlist Queue: <strong className="font-medium text-ink dark:text-ink-dark">{wishlist.length}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('lending')}
              className="text-accent hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <Handshake size={13} />
              <span>Open Lending Ledger</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. READING HABITS & AESTHETIC CONTROLS */}
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark flex items-center gap-2">
          <Target size={18} className="text-accent" />
          <span>Reading Pace & Interface Craft</span>
        </h2>

        <div className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4">
          {/* Daily Goal Stepper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink dark:text-ink-dark">Daily Target Reading Pace</p>
                <p className="text-3xs text-ink-muted">Page goal required daily to maintain active reading streak without fatigue.</p>
              </div>
              <span className="font-mono text-xs font-bold text-accent dark:text-accent-dark px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20">
                {dailyGoal || 15} pages/day
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-3xs text-ink-muted mr-1 font-medium">Presets:</span>
              {[10, 15, 20, 25, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDailyGoal(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    (dailyGoal || 15) === preset
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark text-ink dark:text-ink-dark hover:border-accent/40'
                  }`}
                >
                  {preset} pages
                </button>
              ))}
            </div>
          </div>

          {/* Theme & Display Mode */}
          <div className="pt-3 border-t border-rule/50 dark:border-rule-dark/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink dark:text-ink-dark">Reading Interface Palette</p>
              <p className="text-3xs text-ink-muted">
                {theme === 'dark' ? 'Deep Charcoal Ink for relaxed nighttime reading' : 'Warm Ivory Paper for tactile archival bookish warmth'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3.5 py-1.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark hover:border-accent/40 text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-600" />}
              <span>{theme === 'dark' ? 'Switch to Ivory Paper' : 'Switch to Charcoal Ink'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. DATA OWNERSHIP & ARCHIVAL EXPORTS */}
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark flex items-center gap-2">
          <Download size={18} className="text-accent" />
          <span>Data Ownership & Shelf Maintenance</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* JSON Export */}
          <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-ink dark:text-ink-dark">
                <FileJson size={16} className="text-amber-600" />
                <span>Full Library Backup (JSON)</span>
              </div>
              <p className="text-3xs text-ink-muted mt-1 leading-relaxed">
                Complete relational snapshot containing books, logs, wishlist items, and lending records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full py-2 px-3 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Download JSON Backup</span>
            </button>
          </div>

          {/* CSV Export */}
          <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-ink dark:text-ink-dark">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span>Catalogue Sheet (CSV)</span>
              </div>
              <p className="text-3xs text-ink-muted mt-1 leading-relaxed">
                Spreadsheet-ready table of volumes with purchase prices, replacement values, location, and ISBN.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full py-2 px-3 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV Catalogue</span>
            </button>
          </div>

          {/* Auto-Fetch Book Jackets */}
          <div className="p-4 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-ink dark:text-ink-dark">
                <Sparkles size={16} className="text-accent" />
                <span>Auto-Fetch Book Jackets</span>
              </div>
              <p className="text-3xs text-ink-muted mt-1 leading-relaxed">
                Scans volumes missing covers and auto-populates jackets via Google Books, Apple Books India & Open Library.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnrich}
              disabled={enriching}
              className="w-full py-2 px-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={13} className={enriching ? 'animate-spin' : ''} />
              <span>{enriching ? 'Enriching Jackets...' : 'Enrich Missing Jackets'}</span>
            </button>
          </div>
        </div>

        {enrichResult && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{enrichResult}</span>
          </div>
        )}
      </section>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-accent/10 text-accent">
                    <Lock size={18} />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                    Change Password
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 text-xs border border-red-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-xs border border-emerald-200 flex items-center gap-2">
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
                    className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent"
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
                    className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent"
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
                    className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-rule/50 dark:border-rule-dark/50">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-rule/40 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {passwordLoading ? 'Updating Password...' : 'Save Password'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 mx-auto flex items-center justify-center">
                <LogOut size={22} />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                  Sign Out of Molat?
                </h3>
                <p className="text-xs text-ink-muted">
                  Your reading streak and catalogue remain safe in the cloud database. You can sign back in anytime.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 rounded-xl border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-rule/40 transition-colors cursor-pointer"
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logoutOwner();
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-medium transition-colors cursor-pointer"
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
