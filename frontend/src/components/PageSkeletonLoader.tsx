import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { BookLoader } from './BookLoader';

interface PageSkeletonLoaderProps {
  activeTab: 'home' | 'shelf' | 'tracker' | 'wishlist' | 'maintenance' | 'insights' | 'lending' | 'profile';
  caption?: string;
  className?: string;
}

const TAB_CAPTIONS: Record<string, string> = {
  home: 'Opening reading sanctuary...',
  shelf: 'Arranging library shelves...',
  tracker: 'Mapping 365-day reading matrix...',
  insights: 'Calculating portfolio & reading velocity...',
  wishlist: 'Retrieving planned acquisitions...',
  lending: 'Consulting lending ledger...',
  profile: 'Retrieving reader passport...',
  maintenance: 'Auditing catalogue health...',
};

export const PageSkeletonLoader: React.FC<PageSkeletonLoaderProps> = ({
  activeTab,
  caption,
  className = '',
}) => {
  const displayCaption = caption || TAB_CAPTIONS[activeTab] || 'Opening library catalogue...';

  // Lock body scroll while the loader is active so there is zero window scroll during loading
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  return (
    <div
      className={`relative w-full h-[calc(100dvh-7rem)] md:h-[calc(100dvh-8rem)] min-h-[360px] max-h-[760px] overflow-hidden rounded-3xl select-none ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      {/* 1. BACKGROUND SKELETON LAYOUT (ACCURATE TO ACTIVE TAB, CLAMPED TO VIEWPORT) */}
      <div className="absolute inset-0 p-1 sm:p-2 pointer-events-none opacity-40 dark:opacity-30 overflow-hidden select-none" aria-hidden="true">
        {/* TAB 1: HOME SKELETON */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Top Reading Card */}
            <div className="p-5 rounded-2xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-rule/50 dark:bg-rule-dark/50 rounded-lg animate-pulse" />
                <div className="h-6 w-20 bg-rule/50 dark:bg-rule-dark/50 rounded-full animate-pulse" />
              </div>
              <div className="flex gap-4">
                <div className="w-20 sm:w-24 aspect-[2/3] rounded-xl bg-rule/50 dark:bg-rule-dark/50 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="h-5 w-3/4 bg-rule/60 dark:bg-rule-dark/60 rounded-lg animate-pulse" />
                  <div className="h-3.5 w-1/2 bg-rule/40 dark:bg-rule-dark/40 rounded-lg animate-pulse" />
                  <div className="h-3 w-1/3 bg-rule/30 dark:bg-rule-dark/30 rounded-lg animate-pulse" />
                  <div className="pt-2 flex gap-2">
                    <div className="h-8 flex-1 bg-rule/40 dark:bg-rule-dark/40 rounded-xl animate-pulse" />
                    <div className="h-8 flex-1 bg-rule/60 dark:bg-rule-dark/60 rounded-xl animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-rule/40 dark:border-rule-dark/40 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-40 bg-rule/40 dark:bg-rule-dark/40 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-rule/40 dark:bg-rule-dark/40 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-rule/40 dark:bg-rule-dark/40 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Vitals Strip */}
            <div className="p-4 rounded-2xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="text-center space-y-1.5">
                    <div className="h-2.5 w-16 mx-auto bg-rule/40 dark:bg-rule-dark/40 rounded animate-pulse" />
                    <div className="h-6 w-12 mx-auto bg-rule/60 dark:bg-rule-dark/60 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Spotlight Shelf */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-36 bg-rule/50 dark:bg-rule-dark/50 rounded animate-pulse" />
                <div className="h-4 w-20 bg-rule/40 dark:bg-rule-dark/40 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2 p-1.5 rounded-xl border border-rule/40 dark:border-rule-dark/40 bg-surface dark:bg-surface-dark">
                    <div className="aspect-[2/3] rounded-lg bg-rule/50 dark:bg-rule-dark/50 animate-pulse" />
                    <div className="h-2.5 w-full bg-rule/40 dark:bg-rule-dark/40 rounded animate-pulse" />
                    <div className="h-2 w-2/3 bg-rule/30 dark:bg-rule-dark/30 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHELF / MAINTENANCE SKELETON */}
        {(activeTab === 'shelf' || activeTab === 'maintenance') && (
          <div className="space-y-5">
            {/* Search and view toggle row */}
            <div className="flex gap-2">
              <div className="h-10 flex-1 bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 rounded-xl animate-pulse" />
              <div className="h-10 w-28 bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 rounded-xl animate-pulse" />
            </div>
            {/* Filter pills */}
            <div className="flex gap-2 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-7 w-20 bg-surface dark:bg-surface-dark border border-rule/50 dark:border-rule-dark/50 rounded-lg animate-pulse shrink-0" />
              ))}
            </div>
            {/* Cover Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2 p-2 rounded-xl border border-rule/40 dark:border-rule-dark/40 bg-surface dark:bg-surface-dark">
                  <div className="aspect-[2/3] rounded-lg bg-rule/50 dark:bg-rule-dark/50 animate-pulse" />
                  <div className="h-3 w-4/5 bg-rule/50 dark:bg-rule-dark/50 rounded animate-pulse" />
                  <div className="h-2.5 w-1/2 bg-rule/30 dark:bg-rule-dark/30 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: READING TRACKER SKELETON */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-5 w-40 bg-rule/60 dark:bg-rule-dark/60 rounded-lg animate-pulse" />
                <div className="h-6 w-24 bg-rule/50 dark:bg-rule-dark/50 rounded-full animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-raised dark:bg-surface-dark-raised border border-rule/40 space-y-2">
                    <div className="h-3 w-20 bg-rule/40 rounded animate-pulse" />
                    <div className="h-7 w-16 bg-rule/60 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Matrix Box */}
            <div className="p-6 rounded-3xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-3">
              <div className="h-4 w-48 bg-rule/60 rounded animate-pulse" />
              <div className="h-32 w-full rounded-2xl bg-rule/20 dark:bg-rule-dark/20 border border-rule/40 animate-pulse" />
            </div>
          </div>
        )}

        {/* TAB 4: INSIGHTS SKELETON */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-2">
                  <div className="h-3 w-24 bg-rule/40 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-rule/60 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="p-6 rounded-3xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark space-y-4">
              <div className="h-4 w-48 bg-rule/60 rounded animate-pulse" />
              <div className="h-48 w-full rounded-2xl bg-rule/20 dark:bg-rule-dark/20 animate-pulse" />
            </div>
          </div>
        )}

        {/* TAB 5: WISHLIST SKELETON */}
        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-6 w-44 bg-rule/60 rounded-lg animate-pulse" />
              <div className="h-9 w-32 bg-rule/60 rounded-xl animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark space-y-3">
                  <div className="h-4 w-3/4 bg-rule/60 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-rule/40 rounded animate-pulse" />
                  <div className="pt-2 flex justify-between border-t border-rule/40">
                    <div className="h-4 w-16 bg-rule/50 rounded animate-pulse" />
                    <div className="h-7 w-20 bg-rule/60 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: LENDING SKELETON */}
        {activeTab === 'lending' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-6 w-36 bg-rule/60 rounded-lg animate-pulse" />
              <div className="h-9 w-32 bg-rule/60 rounded-xl animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-rule/50 dark:border-rule-dark/50 bg-surface dark:bg-surface-dark space-y-3 flex gap-3">
                  <div className="w-16 aspect-[2/3] rounded-lg bg-rule/50 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-rule/60 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-rule/40 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-rule/30 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: PROFILE SKELETON */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Passport card */}
            <div className="p-6 rounded-3xl border border-rule/60 dark:border-rule-dark/60 bg-surface dark:bg-surface-dark flex gap-4 items-center">
              <div className="w-16 h-16 rounded-2xl bg-rule/60 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-40 bg-rule/60 rounded-lg animate-pulse" />
                <div className="h-3.5 w-32 bg-rule/40 rounded animate-pulse" />
              </div>
            </div>
            {/* 4 ledger boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-rule/50 bg-surface dark:bg-surface-dark space-y-2">
                  <div className="h-3 w-20 bg-rule/40 rounded animate-pulse" />
                  <div className="h-7 w-14 bg-rule/60 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. FOREGROUND TACTILE OVERLAY WITH CENTERED BOOK LOADER */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-canvas/75 dark:bg-canvas-dark/75 backdrop-blur-xs rounded-3xl min-h-[460px] p-6 text-center"
      >
        <BookLoader size="lg" caption={displayCaption} />
      </motion.div>
    </div>
  );
};
