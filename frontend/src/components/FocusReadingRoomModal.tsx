import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  CloudRain,
  Coffee,
  Clock,
  Minimize2,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { fetchReadingLogs } from '../api/client';
import { BookCover } from './BookCover';
import {
  playAmbientSound,
  setAmbientVolume,
  stopAmbientSound,
  SoundscapeType,
} from '../utils/ambientSound';

const STORAGE_KEY = 'molat_active_focus_session_v1';

interface StoredFocusSession {
  bookId: string;
  startTime: number; // Date.now() when session began
  pausedAt: number | null; // Date.now() when paused
  totalPausedMs: number; // accumulated pause duration in ms
  startPage: number;
  soundscape: SoundscapeType;
  volume: number;
}

export const FocusReadingRoomModal: React.FC = () => {
  const {
    books,
    focusRoomOpen,
    focusRoomBook,
    closeFocusRoom,
    setHasActiveFocusTimer,
    submitReadingLog,
    addToast,
  } = useLibraryStore();

  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Screen Wake Lock state (Defaults to Normal Sleep to prioritize battery saving)
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockSentinelRef = useRef<any>(null);

  // Soundscape state (defaults to mute for pure silence)
  const [soundscape, setSoundscape] = useState<SoundscapeType>('mute');
  const [volume, setVolume] = useState<number>(0.35);

  // Physical page logging state
  const [startPage, setStartPage] = useState<number>(0);
  const [endPage, setEndPage] = useState<number>(0);
  const [sessionNote, setSessionNote] = useState<string>('');
  const [finishFlowActive, setFinishFlowActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Currently active book
  const currentBook = useMemo(() => {
    return books.find((b) => b.book_id === selectedBookId) || focusRoomBook || books[0] || null;
  }, [books, selectedBookId, focusRoomBook]);

  // Request Screen Wake Lock to prevent phone from sleeping
  const requestWakeLock = async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      setWakeLockSupported(false);
      return;
    }
    try {
      if (wakeLockSentinelRef.current) {
        await wakeLockSentinelRef.current.release().catch(() => { });
      }
      const sentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinelRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener('release', () => {
        // Only set inactive if we didn't intentionally recreate it
        if (wakeLockSentinelRef.current === sentinel) {
          setWakeLockActive(false);
        }
      });
    } catch {
      setWakeLockActive(false);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch { }
      wakeLockSentinelRef.current = null;
    }
    setWakeLockActive(false);
  };

  // 1. Initialize or restore session
  useEffect(() => {
    if (!focusRoomOpen) return;

    // Check localStorage for active session
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StoredFocusSession = JSON.parse(saved);

        // Auto-purge sessions older than 24 hours to prevent orphaned stale storage
        const isStale = Date.now() - parsed.startTime > 24 * 60 * 60 * 1000;
        if (isStale) {
          localStorage.removeItem(STORAGE_KEY);
          setHasActiveFocusTimer(false);
        } else {
          // Verify book still exists
          const exists = books.some((b) => b.book_id === parsed.bookId);
          if (exists) {
            // If the user explicitly launched Focus Room for a DIFFERENT book from shelf
            if (focusRoomBook && focusRoomBook.book_id !== parsed.bookId) {
              const oldBook = books.find((b) => b.book_id === parsed.bookId);
              const oldTitle = oldBook ? `"${oldBook.title}"` : 'previous book';
              const discardOld = window.confirm(
                `You have an active reading session for ${oldTitle}. Discard it and start fresh for "${focusRoomBook.title}"?`
              );
              if (discardOld) {
                localStorage.removeItem(STORAGE_KEY);
                // Fall through to start fresh session for the new book
              } else {
                // Resume previous book
                setSelectedBookId(parsed.bookId);
                setSessionStartTime(parsed.startTime);
                setTotalPausedMs(parsed.totalPausedMs);
                setStartPage(parsed.startPage);
                setEndPage(parsed.startPage);
                setSoundscape(parsed.soundscape || 'mute');
                setVolume(parsed.volume ?? 0.35);

                if (parsed.pausedAt) {
                  setPausedAt(parsed.pausedAt);
                  setIsRunning(false);
                  const nowElapsed = Math.floor((parsed.pausedAt - parsed.startTime - parsed.totalPausedMs) / 1000);
                  setElapsedSeconds(Math.max(0, nowElapsed));
                } else {
                  setIsRunning(true);
                  setPausedAt(null);
                  const nowElapsed = Math.floor((Date.now() - parsed.startTime - parsed.totalPausedMs) / 1000);
                  setElapsedSeconds(Math.max(0, nowElapsed));
                }
                return;
              }
            } else {
              setSelectedBookId(parsed.bookId);
              setSessionStartTime(parsed.startTime);
              setTotalPausedMs(parsed.totalPausedMs);
              setStartPage(parsed.startPage);
              setEndPage(parsed.startPage);
              setSoundscape(parsed.soundscape || 'mute');
              setVolume(parsed.volume ?? 0.35);

              if (parsed.pausedAt) {
                setPausedAt(parsed.pausedAt);
                setIsRunning(false);
                const nowElapsed = Math.floor((parsed.pausedAt - parsed.startTime - parsed.totalPausedMs) / 1000);
                setElapsedSeconds(Math.max(0, nowElapsed));
              } else {
                setIsRunning(true);
                setPausedAt(null);
                const nowElapsed = Math.floor((Date.now() - parsed.startTime - parsed.totalPausedMs) / 1000);
                setElapsedSeconds(Math.max(0, nowElapsed));
              }

              if (parsed.soundscape && parsed.soundscape !== 'mute') {
                playAmbientSound(parsed.soundscape, parsed.volume ?? 0.35);
              }
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse focus session:', err);
        localStorage.removeItem(STORAGE_KEY);
        setHasActiveFocusTimer(false);
      }
    }

    // Fresh session
    const targetBook = focusRoomBook || books.find((b) => b.reading_status === 'READING') || books[0];
    const bookId = targetBook ? targetBook.book_id : '';
    const now = Date.now();

    setSelectedBookId(bookId);
    setSessionStartTime(now);
    setTotalPausedMs(0);
    setPausedAt(null);
    setIsRunning(true);
    setElapsedSeconds(0);
    setFinishFlowActive(false);

    // Fetch last known page for this book
    if (bookId) {
      fetchReadingLogs(bookId)
        .then((logs) => {
          if (logs && logs.length > 0) {
            const lastEnd = logs[0].end_page;
            setStartPage(lastEnd);
            setEndPage(lastEnd);
          } else {
            setStartPage(0);
            setEndPage(0);
          }
        })
        .catch(() => {
          setStartPage(0);
          setEndPage(0);
        });
    }

    // Default to Normal Sleep (no automatic wakeLock request to save maximum battery)
  }, [focusRoomOpen]);

  // 2. Persist active session to localStorage whenever state changes
  useEffect(() => {
    if (!focusRoomOpen || !selectedBookId) return;

    const data: StoredFocusSession = {
      bookId: selectedBookId,
      startTime: sessionStartTime,
      pausedAt,
      totalPausedMs,
      startPage,
      soundscape,
      volume,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setHasActiveFocusTimer(true);
  }, [focusRoomOpen, selectedBookId, sessionStartTime, pausedAt, totalPausedMs, startPage, soundscape, volume]);

  // 3. Wall-Clock Delta Timer & Visibility Change Re-synchronization
  // Even if the phone locks for 45 minutes, Date.now() math guarantees 100% precision with 0 drift.
  useEffect(() => {
    if (!focusRoomOpen) return;

    const calculateElapsed = () => {
      if (!isRunning && pausedAt) {
        return Math.floor((pausedAt - sessionStartTime - totalPausedMs) / 1000);
      }
      return Math.floor((Date.now() - sessionStartTime - totalPausedMs) / 1000);
    };

    // Immediate sync
    setElapsedSeconds(Math.max(0, calculateElapsed()));

    // Interval to refresh UI while screen is awake
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, calculateElapsed()));
    }, 1000);

    // Event listener for screen wake / visibility change / app switch
    const handleVisibility = () => {
      setElapsedSeconds(Math.max(0, calculateElapsed()));
      if (document.visibilityState === 'visible') {
        // Re-acquire wake lock if requested
        if (wakeLockActive) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [focusRoomOpen, isRunning, pausedAt, sessionStartTime, totalPausedMs, wakeLockActive]);

  // Clean up audio & wake lock when room closes
  useEffect(() => {
    if (!focusRoomOpen) {
      stopAmbientSound();
      releaseWakeLock();
    }
  }, [focusRoomOpen]);

  // Handle Pause / Resume
  const handleTogglePause = () => {
    const now = Date.now();
    if (isRunning) {
      // Pause
      setIsRunning(false);
      setPausedAt(now);
    } else {
      // Resume
      if (pausedAt) {
        const addedPause = now - pausedAt;
        setTotalPausedMs((prev) => prev + addedPause);
      }
      setPausedAt(null);
      setIsRunning(true);
    }
  };

  // Handle Reset Timer
  const handleResetTimer = () => {
    const now = Date.now();
    setSessionStartTime(now);
    setPausedAt(null);
    setTotalPausedMs(0);
    setIsRunning(true);
    setElapsedSeconds(0);
  };

  // Soundscape switch
  const handleSelectSoundscape = (type: SoundscapeType) => {
    setSoundscape(type);
    playAmbientSound(type, volume);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setAmbientVolume(newVol);
  };

  // Wake lock toggle
  const handleToggleWakeLock = async () => {
    if (wakeLockActive) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  };

  // Open finish flow
  const handleOpenFinish = () => {
    // Automatically pause the timer while logging
    if (isRunning) {
      handleTogglePause();
    }
    setFinishFlowActive(true);
  };

  // Deterministic Page Calculation
  const pagesRead = Math.max(0, endPage - startPage);
  const sessionMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const readingPace = pagesRead > 0 ? (pagesRead / (elapsedSeconds / 60)).toFixed(2) : '0';
  const minsPerPage = pagesRead > 0 ? ((elapsedSeconds / 60) / pagesRead).toFixed(1) : '—';

  // Format Elapsed Time string HH:MM:SS
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit completed session to Google Sheets
  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      setErrorMsg('Please select a book.');
      return;
    }
    if (endPage < startPage) {
      setErrorMsg(`Ending page (${endPage}) cannot be before starting page (${startPage}).`);
      return;
    }
    if (pagesRead === 0 && elapsedSeconds < 60) {
      setErrorMsg('Please record pages read or complete at least 1 minute.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await submitReadingLog({
        book_id: selectedBookId,
        pages_read: pagesRead,
        start_page: startPage,
        end_page: endPage,
        duration_minutes: sessionMinutes,
        session_note: sessionNote.trim() || `Focus Reading Session (${formatTimer(elapsedSeconds)})`,
      });

      // Clear persisted session from localStorage
      localStorage.removeItem(STORAGE_KEY);
      setHasActiveFocusTimer(false);
      setHasActiveFocusTimer(false);
      stopAmbientSound();
      releaseWakeLock();
      closeFocusRoom();
      addToast(`Logged ${pagesRead} pages in ${sessionMinutes}m to your ledger!`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record session in Google Sheets');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close and discard session
  const handleDiscardSession = () => {
    if (elapsedSeconds > 120) {
      if (!window.confirm('Discard this active reading timer?')) return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setHasActiveFocusTimer(false);
    stopAmbientSound();
    releaseWakeLock();
    closeFocusRoom();
  };

  if (!focusRoomOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark sm:rounded-3xl border-0 sm:border border-rule dark:border-rule-dark shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Top Control Bar */}
          <div className="px-5 py-3.5 border-b border-rule/50 dark:border-rule-dark/50 flex items-center justify-between shrink-0 bg-surface/50 dark:bg-surface-dark/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <span className="font-serif text-sm font-medium tracking-tight">Focus Reading Room</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Screen Wake Lock Pill (Normal Sleep by default to save 100% display battery) */}
              {wakeLockSupported && (
                <button
                  type="button"
                  onClick={handleToggleWakeLock}
                  className={`px-2.5 py-1 rounded-full text-3xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${wakeLockActive
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-surface dark:bg-surface-dark text-ink-muted border-rule dark:border-rule-dark hover:border-accent hover:text-ink'
                    }`}
                  title={
                    wakeLockActive
                      ? 'Screen kept awake (Desk companion mode)'
                      : 'Normal Sleep (Battery Saver active: phone can sleep, timer runs with 0% battery impact in background)'
                  }
                >
                  {wakeLockActive ? <Sun size={12} className="text-amber-500" /> : <Moon size={12} />}
                  <span>{wakeLockActive ? 'Screen Awake' : 'Normal Sleep'}</span>
                </button>
              )}

              {/* Close / Minimize */}
              <button
                type="button"
                onClick={handleDiscardSession}
                className="p-1.5 rounded-full text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised transition-colors cursor-pointer"
                title="Exit Focus Room"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-6 flex flex-col justify-between">
            {/* Book Header Card */}
            {currentBook && (
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60">
                <div className="w-10 h-14 rounded-md overflow-hidden shrink-0 shadow-xs">
                  <BookCover
                    title={currentBook.title}
                    authors={currentBook.authors}
                    coverUrl={currentBook.cover_url}
                    readingStatus={currentBook.reading_status}
                    size="sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif text-sm font-medium text-ink dark:text-ink-dark truncate">
                    {currentBook.title}
                  </h4>
                  <p className="text-xs text-ink-muted truncate">
                    {currentBook.authors || 'Unknown author'}
                  </p>
                  <p className="text-3xs text-accent dark:text-accent-dark font-medium mt-0.5">
                    Started at Page {startPage} &bull; Physical Volume
                  </p>
                </div>
              </div>
            )}

            {/* If FINISH FLOW is NOT active: Show Calm Timer & Soundscape */}
            {!finishFlowActive ? (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-6 text-center">
                {/* Visual Timer Display */}
                <div className="relative flex flex-col items-center justify-center">
                  {/* Subtle breathing glow ring when running */}
                  <div
                    className={`absolute inset-0 -m-6 rounded-full transition-opacity duration-1000 pointer-events-none ${isRunning ? 'bg-accent/5 dark:bg-accent/10 blur-xl animate-pulse' : 'opacity-0'
                      }`}
                  />

                  <div className="font-mono text-5xl sm:text-6xl font-light tracking-tight text-ink dark:text-ink-dark tabular-nums drop-shadow-xs">
                    {formatTimer(elapsedSeconds)}
                  </div>

                  <p className="text-xs text-ink-muted mt-2 font-medium tracking-wide">
                    {isRunning ? (
                      <span className="flex items-center gap-1.5 justify-center text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Reading in progress...
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Timer Paused</span>
                    )}
                  </p>
                </div>

                {/* Primary Timer Controls: Pause/Play & Reset */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className={`h-14 px-7 rounded-2xl font-medium text-sm flex items-center gap-2.5 shadow-md active:scale-95 transition-all cursor-pointer ${isRunning
                      ? 'bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark text-ink dark:text-ink-dark hover:bg-surface-raised dark:hover:bg-surface-dark-raised'
                      : 'bg-accent text-white hover:bg-accent-hover'
                      }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause size={18} />
                        <span>Pause Session</span>
                      </>
                    ) : (
                      <>
                        <Play size={18} />
                        <span>Resume Timer</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="h-14 w-14 rounded-2xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark text-ink-muted hover:text-ink dark:hover:text-ink-dark flex items-center justify-center hover:bg-surface-raised dark:hover:bg-surface-dark-raised active:scale-95 transition-all cursor-pointer"
                    title="Reset timer to 00:00"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>

                {/* Ambient Soundscape Controls (Optional - Silent by Default) */}
                <div className="w-full max-w-md p-3.5 rounded-2xl bg-surface/70 dark:bg-surface-dark/70 border border-rule/50 dark:border-rule-dark/50 space-y-3">
                  <div className="flex items-center justify-between text-xs text-ink-secondary dark:text-ink-dark-secondary">
                    <span className="flex items-center gap-1.5 font-medium">
                      {soundscape === 'mute' ? <VolumeX size={14} /> : <Volume2 size={14} className="text-accent" />}
                      <span>Ambient Soundscape</span>
                    </span>
                    <span className="text-3xs text-ink-muted">Web Audio &bull; Offline</span>
                  </div>

                  {/* Soundscape Pills */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectSoundscape('mute')}
                      className={`py-2 px-1 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${soundscape === 'mute'
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-canvas dark:bg-canvas-dark text-ink-muted hover:text-ink border border-rule/50 dark:border-rule-dark/50'
                        }`}
                    >
                      <VolumeX size={15} />
                      <span className="text-3xs">Silence</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSoundscape('rain')}
                      className={`py-2 px-1 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${soundscape === 'rain'
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-canvas dark:bg-canvas-dark text-ink-muted hover:text-ink border border-rule/50 dark:border-rule-dark/50'
                        }`}
                    >
                      <CloudRain size={15} />
                      <span className="text-3xs">Soft Rain</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSoundscape('fireplace')}
                      className={`py-2 px-1 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${soundscape === 'fireplace'
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-canvas dark:bg-canvas-dark text-ink-muted hover:text-ink border border-rule/50 dark:border-rule-dark/50'
                        }`}
                    >
                      <Flame size={15} />
                      <span className="text-3xs">Fireplace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSoundscape('cafe')}
                      className={`py-2 px-1 rounded-xl text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${soundscape === 'cafe'
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-canvas dark:bg-canvas-dark text-ink-muted hover:text-ink border border-rule/50 dark:border-rule-dark/50'
                        }`}
                    >
                      <Coffee size={15} />
                      <span className="text-3xs">Warm Cafe</span>
                    </button>
                  </div>

                  {/* Volume Slider if sound is playing */}
                  {soundscape !== 'mute' && (
                    <div className="flex items-center gap-3 pt-1">
                      <VolumeX size={12} className="text-ink-muted shrink-0" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full accent-accent h-1.5 rounded-lg cursor-pointer"
                      />
                      <Volume2 size={12} className="text-ink-muted shrink-0" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If FINISH FLOW IS ACTIVE: Deterministic Physical Page Entry */
              <form onSubmit={handleSubmitSession} className="space-y-4 py-2 animate-fade-in">
                <div className="p-4 rounded-2xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-rule/50 dark:border-rule-dark/50">
                    <div>
                      <h4 className="font-serif text-sm font-medium text-ink dark:text-ink-dark">
                        Log Physical Reading Progress
                      </h4>
                      <p className="text-3xs text-ink-muted">
                        Session Duration: <strong className="font-mono text-accent">{formatTimer(elapsedSeconds)}</strong> ({sessionMinutes} mins)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFinishFlowActive(false)}
                      className="text-xs text-accent hover:underline cursor-pointer"
                    >
                      Back to timer
                    </button>
                  </div>

                  {/* Page Inputs Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-3xs uppercase tracking-wider text-ink-muted font-medium">
                        Started At Page
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={startPage || ''}
                        onChange={(e) => setStartPage(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark font-mono text-sm focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-3xs uppercase tracking-wider text-ink-muted font-medium">
                        Ended At Page
                      </label>
                      <input
                        type="number"
                        min="0"
                        autoFocus
                        value={endPage || ''}
                        onChange={(e) => setEndPage(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 rounded-xl border border-accent bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="Bookmark page"
                      />
                    </div>
                  </div>

                  {/* Quick Stepper Pills to advance bookmark */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-3xs text-ink-muted mr-1">Quick add:</span>
                    {[5, 10, 15, 20, 30].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setEndPage((prev) => Math.max(startPage, prev) + inc)}
                        className="px-2 py-1 rounded-lg bg-surface-raised dark:bg-surface-dark-raised border border-rule dark:border-rule-dark text-xs font-mono font-medium hover:border-accent hover:text-accent transition-colors cursor-pointer"
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>

                  {/* Calculated Deterministic Velocity Strip */}
                  <div className="p-3 rounded-xl bg-accent/5 dark:bg-accent/10 border border-accent/20 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-3xs uppercase tracking-wider text-ink-muted font-medium">Pages Read</div>
                      <div className="font-mono text-base font-bold text-accent dark:text-accent-dark">
                        +{pagesRead}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xs uppercase tracking-wider text-ink-muted font-medium">Velocity</div>
                      <div className="font-mono text-base font-bold text-ink dark:text-ink-dark">
                        {readingPace} <span className="text-3xs font-normal text-ink-muted">pgs/min</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-3xs uppercase tracking-wider text-ink-muted font-medium">Pace</div>
                      <div className="font-mono text-base font-bold text-ink dark:text-ink-dark">
                        {minsPerPage} <span className="text-3xs font-normal text-ink-muted">min/pg</span>
                      </div>
                    </div>
                  </div>

                  {/* Optional Reflection Note */}
                  <div className="space-y-1">
                    <label className="text-3xs uppercase tracking-wider text-ink-muted font-medium">
                      Session Reflection (Optional)
                    </label>
                    <input
                      type="text"
                      value={sessionNote}
                      onChange={(e) => setSessionNote(e.target.value)}
                      placeholder="e.g. Chapter 4 finished, dramatic plot twist!"
                      className="w-full p-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                      {errorMsg}
                    </div>
                  )}
                </div>

                {/* Submit to Google Sheets Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                >
                  <Check size={16} />
                  <span>{isSubmitting ? 'Saving to Google Sheets...' : 'Save to Reading Ledger'}</span>
                </button>
              </form>
            )}

            {/* Bottom Action: "Finish Reading" trigger */}
            {!finishFlowActive && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenFinish}
                  className="w-full py-3.5 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
                >
                  <BookOpen size={16} />
                  <span>Finish Reading &bull; Log End Page</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
