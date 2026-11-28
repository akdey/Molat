import React from 'react';
import { Home, Library, Flame, LayoutGrid as MenuGridIcon } from 'lucide-react';
import { HoldToSpeakAssistant } from '../components/HoldToSpeakAssistant';

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

interface BottomNavProps {
  activeTab: TabId;
  switchTab: (tab: TabId) => void;
  centerMenuOpen: boolean;
  setCenterMenuOpen: (open: boolean) => void;
}

const triggerMicroHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(10);
    } catch {
      // ignore
    }
  }
};

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  switchTab,
  centerMenuOpen,
  setCenterMenuOpen,
}) => {
  const handleNavTap = (tab: TabId) => {
    triggerMicroHaptic();
    switchTab(tab);
  };

  const isMoreActive = ['more', 'profile', 'alcoves', 'adda', 'wishlist', 'lending', 'insights', 'maintenance'].includes(
    activeTab
  );

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-canvas/95 dark:bg-canvas-dark/95 border-t border-rule/80 dark:border-rule-dark/80 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-2"
    >
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => handleNavTap('home')}
        className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-button transition-colors cursor-pointer ${
          activeTab === 'home'
            ? 'text-accent dark:text-accent-dark font-semibold'
            : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
        }`}
      >
        <Home size={19} />
        <span className="text-2xs mt-0.5 leading-none">Home</span>
        {activeTab === 'home' && (
          <span className="w-1 h-1 rounded-full bg-accent dark:bg-accent-dark mt-0.5" />
        )}
      </button>

      {/* 2. Shelf */}
      <button
        type="button"
        onClick={() => handleNavTap('shelf')}
        className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-button transition-colors cursor-pointer ${
          activeTab === 'shelf'
            ? 'text-accent dark:text-accent-dark font-semibold'
            : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
        }`}
      >
        <Library size={19} />
        <span className="text-2xs mt-0.5 leading-none">Shelf</span>
        {activeTab === 'shelf' && (
          <span className="w-1 h-1 rounded-full bg-accent dark:bg-accent-dark mt-0.5" />
        )}
      </button>

      {/* 3. Center Action Button (Tap for Menu • Hold to Speak AI Assistant) */}
      <HoldToSpeakAssistant
        centerMenuOpen={centerMenuOpen}
        setCenterMenuOpen={setCenterMenuOpen}
      />

      {/* 4. Streak */}
      <button
        type="button"
        onClick={() => handleNavTap('tracker')}
        className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-button transition-colors cursor-pointer ${
          activeTab === 'tracker'
            ? 'text-accent dark:text-accent-dark font-semibold'
            : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
        }`}
      >
        <Flame size={19} />
        <span className="text-2xs mt-0.5 leading-none">Streak</span>
        {activeTab === 'tracker' && (
          <span className="w-1 h-1 rounded-full bg-accent dark:bg-accent-dark mt-0.5" />
        )}
      </button>

      {/* 5. More */}
      <button
        type="button"
        onClick={() => handleNavTap('more')}
        className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-button transition-colors cursor-pointer ${
          isMoreActive
            ? 'text-accent dark:text-accent-dark font-semibold'
            : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
        }`}
        title="Library Menu, Alcove & Profile"
        aria-label="More"
      >
        <MenuGridIcon size={19} />
        <span className="text-2xs mt-0.5 leading-none">More</span>
        {isMoreActive && (
          <span className="w-1 h-1 rounded-full bg-accent dark:bg-accent-dark mt-0.5" />
        )}
      </button>
    </nav>
  );
};
