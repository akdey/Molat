import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Timer,
  BookOpen,
  Camera,
  Handshake,
  Dices,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

interface CenterActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CenterActionSheet: React.FC<CenterActionSheetProps> = ({ isOpen, onClose }) => {
  const {
    setVoiceAssistantOpen,
    openFocusRoom,
    openQuickLog,
    setScannerOpen,
    openLendModal,
    setPickNextModalOpen,
  } = useLibraryStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-lg bg-canvas dark:bg-canvas-dark border-t border-rule dark:border-rule-dark rounded-t-3xl shadow-2xl p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] space-y-3 max-h-[85vh] overflow-y-auto overscroll-contain"
          >
            <div className="w-10 h-1 bg-ink-muted/30 rounded-full mx-auto" />
            <div className="flex items-center justify-between px-1">
              <div className="w-6" />
              <h2 className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
                Library Actions
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close actions"
              >
                <X size={16} />
              </button>
            </div>

            {/* Primary Hero Tier: Voice Assistant & Focus Room */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setVoiceAssistantOpen(true);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-card bg-accent text-white text-left transition-transform active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <div className="w-10 h-10 rounded-button bg-white/15 flex items-center justify-center shrink-0">
                  <Sparkles size={19} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span>Voice Assistant</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-medium uppercase tracking-wide">
                      Hold +
                    </span>
                  </div>
                  <div className="text-2xs text-white/80 truncate">
                    Log pages, locate books on shelves, check streak
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  openFocusRoom();
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-card bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark text-left transition-transform active:scale-[0.98] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-button bg-accent/10 text-accent dark:text-accent-dark flex items-center justify-center shrink-0">
                  <Timer size={19} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink dark:text-ink-dark">
                    Focus Reading Room
                  </div>
                  <div className="text-2xs text-ink-muted truncate">
                    Distraction-free timer &amp; ambient soundscapes
                  </div>
                </div>
              </button>
            </div>

            {/* Secondary Compact 2x2 Action Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openQuickLog();
                }}
                className="flex flex-col items-start gap-2 p-3.5 rounded-card bg-surface dark:bg-surface-dark border border-rule/70 dark:border-rule-dark/70 text-left transition-transform active:scale-[0.97] min-h-[76px] cursor-pointer"
              >
                <BookOpen size={18} className="text-accent dark:text-accent-dark" />
                <span className="text-xs font-medium text-ink dark:text-ink-dark">Log Reading</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setScannerOpen(true);
                }}
                className="flex flex-col items-start gap-2 p-3.5 rounded-card bg-surface dark:bg-surface-dark border border-rule/70 dark:border-rule-dark/70 text-left transition-transform active:scale-[0.97] min-h-[76px] cursor-pointer"
              >
                <Camera size={18} className="text-accent dark:text-accent-dark" />
                <span className="text-xs font-medium text-ink dark:text-ink-dark">Scan ISBN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  openLendModal();
                }}
                className="flex flex-col items-start gap-2 p-3.5 rounded-card bg-surface dark:bg-surface-dark border border-rule/70 dark:border-rule-dark/70 text-left transition-transform active:scale-[0.97] min-h-[76px] cursor-pointer"
              >
                <Handshake size={18} className="text-accent dark:text-accent-dark" />
                <span className="text-xs font-medium text-ink dark:text-ink-dark">Lend a Book</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setPickNextModalOpen(true);
                }}
                className="flex flex-col items-start gap-2 p-3.5 rounded-card bg-surface dark:bg-surface-dark border border-rule/70 dark:border-rule-dark/70 text-left transition-transform active:scale-[0.97] min-h-[76px] cursor-pointer"
              >
                <Dices size={18} className="text-accent dark:text-accent-dark" />
                <span className="text-xs font-medium text-ink dark:text-ink-dark">Pick Next Read</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
