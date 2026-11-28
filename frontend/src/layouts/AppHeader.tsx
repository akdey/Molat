import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Search,
  Mic,
  RefreshCw,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { TopProgressBar } from '../components/TopProgressBar';

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

interface AppHeaderProps {
  switchTab: (tab: TabId) => void;
}

const DESKTOP_TABS: { id: TabId; label: string; matchTabs?: TabId[] }[] = [
  { id: 'home', label: 'Home' },
  { id: 'shelf', label: 'Shelf' },
  { id: 'tracker', label: 'Streak' },
  { id: 'insights', label: 'Insights' },
  {
    id: 'more',
    label: 'More',
    matchTabs: ['more', 'wishlist', 'lending', 'maintenance', 'alcoves'],
  },
];

export const AppHeader: React.FC<AppHeaderProps> = ({ switchTab }) => {
  const {
    activeTab,
    books,
    loading,
    refreshing,
    search,
    setSearch,
    setVoiceAssistantOpen,
    loadAllData,
    authUser,
    theme,
    toggleTheme,
  } = useLibraryStore();

  const [searchOpen, setSearchOpen] = useState(false);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'shelf') {
      switchTab('shelf');
    }
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-rule/80 dark:border-rule-dark/80 bg-canvas/90 dark:bg-canvas-dark/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4">
        {/* Tier 1: Brand + Actions */}
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => switchTab('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 text-left group"
          >
            <BookOpen className="text-accent dark:text-accent-dark h-5 w-5 shrink-0 transition-transform group-hover:scale-105" />
            <div className="flex items-baseline gap-2">
              <h1 className="font-serif text-lg sm:text-xl font-medium tracking-tight leading-none text-ink dark:text-ink-dark">
                Molat
              </h1>
              <span className="text-2xs text-ink-muted hidden sm:inline font-normal">
                Personal Library
              </span>
            </div>
          </button>

          {/* Right Utility Cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              className={`p-2 rounded-button transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
                searchOpen || search
                  ? 'text-accent dark:text-accent-dark bg-accent/10'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark'
              }`}
              title="Search Library"
              aria-label="Search Library"
            >
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </button>

            {/* Voice Assistant Trigger */}
            <button
              type="button"
              onClick={() => setVoiceAssistantOpen(true)}
              className="p-2 rounded-button text-accent dark:text-accent-dark hover:bg-accent/10 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Molat Voice Assistant"
              aria-label="Open Voice Assistant"
            >
              <Mic size={16} />
            </button>

            {/* Desktop Sync */}
            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={loading || refreshing}
              className="hidden md:flex p-2 rounded-button text-ink-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors cursor-pointer min-h-[40px] min-w-[40px] items-center justify-center disabled:opacity-50"
              title="Sync Library"
              aria-label="Sync Library"
            >
              <RefreshCw
                size={15}
                className={loading || refreshing ? 'animate-spin text-accent dark:text-accent-dark' : ''}
              />
            </button>

            {/* Desktop Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden md:flex p-2 rounded-button text-ink-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors cursor-pointer min-h-[40px] min-w-[40px] items-center justify-center"
              title={theme === 'dark' ? 'Switch to Warm Ivory Paper' : 'Switch to Deep Charcoal Ink'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} />}
            </button>

            {/* Profile Avatar Chip */}
            <button
              type="button"
              onClick={() => switchTab(activeTab === 'profile' ? 'home' : 'profile')}
              className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer min-h-[36px] ${
                activeTab === 'profile'
                  ? 'bg-accent/10 text-accent dark:text-accent-dark font-semibold'
                  : 'hover:bg-surface dark:hover:bg-surface-dark text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
              title={`Ex Libris Profile • ex/${authUser || 'reader'}`}
              aria-label="Reader Profile"
            >
              <div className="w-7 h-7 rounded-full bg-warm text-white flex items-center justify-center text-3xs font-serif font-bold">
                {(authUser || 'R').slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden lg:inline text-2xs">ex/{authUser || 'reader'}</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Desktop Minimal Underline Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 -mb-px"
        >
          {DESKTOP_TABS.map((tab) => {
            const isActive =
              activeTab === tab.id || (tab.matchTabs?.includes(activeTab) ?? false);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`relative py-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-accent dark:text-accent-dark font-semibold'
                    : 'text-ink-secondary dark:text-ink-dark-secondary hover:text-ink dark:hover:text-ink-dark'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.span
                    layoutId="desktopNavUnderline"
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-accent dark:bg-accent-dark rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Expandable Quick Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.form
              onSubmit={handleQuickSearchSubmit}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="py-2.5 flex items-center gap-2 border-t border-rule/50 dark:border-rule-dark/50">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                  />
                  <input
                    type="search"
                    autoFocus
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (e.target.value.trim() && activeTab !== 'shelf') {
                        switchTab('shelf');
                      }
                    }}
                    placeholder={`Search ${books.length || ''} volumes by title, author, genre, or shelf...`}
                    className="w-full pl-9 pr-3 py-2 rounded-input border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent h-10"
                  />
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="px-3 h-10 rounded-input text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Indeterminate Progress Bar during background refresh */}
      <TopProgressBar visible={refreshing && books.length > 0} />
    </header>
  );
};
