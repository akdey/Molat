import React, { useRef, useState } from 'react';
import { Mail, Timer, ChevronRight, RefreshCw } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { CenterActionSheet } from './CenterActionSheet';
import { Footer } from '../components/Footer';

type TabId =
  | 'home'
  | 'shelf'
  | 'insights'
  | 'tracker'
  | 'wishlist'
  | 'maintenance'
  | 'lending'
  | 'alcoves'
  | 'profile'
  | 'more';

interface AppShellProps {
  switchTab: (tab: TabId) => void;
  centerMenuOpen: boolean;
  setCenterMenuOpen: (open: boolean) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  switchTab,
  centerMenuOpen,
  setCenterMenuOpen,
  children,
}) => {
  const {
    activeTab,
    error,
    loadAllData,
    authToken,
    emailVerified,
    setVerifyEmailModalOpen,
    hasActiveFocusTimer,
    focusRoomOpen,
    openFocusRoom,
  } = useLibraryStore();

  // Pull-to-refresh gesture on mobile when at top of page
  const touchStartY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(delta * 0.45, 90));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 64) {
      loadAllData(true);
    }
    touchStartY.current = null;
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen min-h-dvh w-full max-w-full overflow-x-hidden bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors duration-200 flex flex-col"
    >
      <AppHeader switchTab={switchTab} />

      {/* Mobile Pull-to-Refresh Indicator */}
      {pullDistance > 16 && (
        <div
          className="md:hidden flex items-center justify-center gap-1.5 text-2xs text-accent dark:text-accent-dark font-medium overflow-hidden transition-all"
          style={{ height: `${pullDistance * 0.5}px` }}
        >
          <RefreshCw size={12} className={pullDistance >= 64 ? 'animate-spin' : ''} />
          <span>{pullDistance >= 64 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 pb-0 md:pb-6 space-y-5 flex-1 flex flex-col w-full">
        {/* Error Banner with Retry */}
        {error && (
          <div className="p-3.5 rounded-card bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadAllData(true)}
              className="px-3 py-1.5 rounded-button bg-red-600 hover:bg-red-700 text-white font-medium shrink-0 cursor-pointer transition-colors min-h-[36px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Soft-Gate Email Verification Banner */}
        {authToken && !emailVerified && (
          <div className="p-3.5 rounded-card border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/25 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Mail size={15} className="text-amber-600 shrink-0" />
              <span>Please verify your email to unlock Family Alcove invites &amp; sharing.</span>
            </div>
            <button
              type="button"
              onClick={() => setVerifyEmailModalOpen(true)}
              className="px-3.5 py-1.5 rounded-button bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium min-h-[36px] cursor-pointer transition-colors"
            >
              Verify Email
            </button>
          </div>
        )}

        {children}

        <Footer />
      </main>

      <CenterActionSheet
        isOpen={centerMenuOpen}
        onClose={() => setCenterMenuOpen(false)}
      />

      {/* Active Focus Session Floating Indicator */}
      {hasActiveFocusTimer && !focusRoomOpen && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            onClick={() => openFocusRoom()}
            className="px-4 py-2 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-xl flex items-center gap-2 active:scale-95 transition-all border border-white/20 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            <Timer size={14} />
            <span>Return to Focus Room</span>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      <BottomNav
        activeTab={activeTab}
        switchTab={switchTab}
        centerMenuOpen={centerMenuOpen}
        setCenterMenuOpen={setCenterMenuOpen}
      />
    </div>
  );
};
