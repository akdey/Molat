import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLibraryStore } from '../store/useLibraryStore';
import type { AlcoveBookItem } from '../types/book';
import { PageSkeletonLoader } from '../components/PageSkeletonLoader';
import { HomeDashboard } from '../components/HomeDashboard';
import { LibraryInsights } from '../components/LibraryInsights';
import { HeatmapScreen } from '../components/HeatmapScreen';
import { WishlistScreen } from '../components/WishlistScreen';
import { LendingLedger } from '../components/LendingLedger';
import { ProfileScreen } from '../components/ProfileScreen';
import { AlcoveScreen } from '../components/AlcoveScreen';
import { AddaScreen } from '../components/AddaScreen';
import { MenuHubScreen } from '../components/MenuHubScreen';
import { ShelfScreen } from '../screens/ShelfScreen';

type TabId =
  | 'home'
  | 'shelf'
  | 'insights'
  | 'tracker'
  | 'wishlist'
  | 'maintenance'
  | 'lending'
  | 'alcoves'
  | 'adda'
  | 'profile'
  | 'more';

interface TabRouterProps {
  switchTab: (tab: TabId) => void;
  onSelectAlcoveBook: (book: AlcoveBookItem) => void;
}

export const TabRouter: React.FC<TabRouterProps> = ({ switchTab, onSelectAlcoveBook }) => {
  const {
    activeTab,
    books,
    portfolio,
    streakSummary,
    loading,
    refreshing,
    openQuickLog,
    setSelectedBook,
  } = useLibraryStore();

  if ((loading || refreshing) && books.length === 0) {
    return <PageSkeletonLoader activeTab={activeTab} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="space-y-6 flex-1 flex flex-col"
      >
        {activeTab === 'home' && (
          <HomeDashboard
            books={books}
            streakSummary={streakSummary}
            openQuickLog={openQuickLog}
            setSelectedBook={setSelectedBook}
            setActiveTab={switchTab}
          />
        )}

        {activeTab === 'insights' && (
          <LibraryInsights
            books={books}
            portfolio={portfolio}
            streakSummary={streakSummary}
          />
        )}

        {activeTab === 'tracker' && <HeatmapScreen />}
        {activeTab === 'wishlist' && <WishlistScreen />}
        {activeTab === 'lending' && <LendingLedger />}
        {activeTab === 'profile' && <ProfileScreen />}
        {activeTab === 'alcoves' && <AlcoveScreen />}
        {activeTab === 'adda' && <AddaScreen />}
        {activeTab === 'more' && <MenuHubScreen />}

        {(activeTab === 'shelf' || activeTab === 'maintenance') && (
          <ShelfScreen onSelectAlcoveBook={onSelectAlcoveBook} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
