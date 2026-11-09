import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Plus,
  Sparkles,
  BookOpen,
  MapPin,
  Flame,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { processVoiceAssistantCommand, AssistantResult } from '../utils/voiceAssistantEngine';
import { BookCover } from './BookCover';

interface HoldToSpeakAssistantProps {
  centerMenuOpen: boolean;
  setCenterMenuOpen: (open: boolean) => void;
}

export const HoldToSpeakAssistant: React.FC<HoldToSpeakAssistantProps> = ({
  centerMenuOpen,
  setCenterMenuOpen,
}) => {
  const {
    books,
    lendingRecords,
    streakSummary,
    submitReadingLog,
    setSelectedBook,
    addToast,
  } = useLibraryStore();

  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [showResultCard, setShowResultCard] = useState<boolean>(false);

  const holdTimerRef = useRef<any>(null);
  const didTriggerHoldRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const resultCardTimerRef = useRef<any>(null);
  const isTouchActiveRef = useRef<boolean>(false);

  // Trigger tactile haptics on mobile (Samsung S21 FE)
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  // Optional voice response via native on-device Web SpeechSynthesis
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Start continuous Web Speech recognition
  const startSpeechRecognition = () => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      addToast('Voice not supported in this browser. Please use Chrome or Samsung Internet.', 'error');
      return;
    }

    setLiveTranscript('');
    latestTranscriptRef.current = '';

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsHolding(true);
        triggerHaptic(50);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
        latestTranscriptRef.current = transcript;
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          addToast('Microphone access denied. Please enable microphone permissions.', 'error');
        }
      };

      recognition.onend = () => {
        // Recognition completed
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  // Execute the voice command after finger is lifted
  const handleExecution = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    triggerHaptic(40);
    const res = processVoiceAssistantCommand(spokenText, {
      books,
      lendingRecords,
      streakSummary,
    });

    setResult(res);
    setShowResultCard(true);

    // Auto-dismiss result card after 6 seconds
    if (resultCardTimerRef.current) clearTimeout(resultCardTimerRef.current);
    resultCardTimerRef.current = setTimeout(() => {
      setShowResultCard(false);
    }, 6000);

    // Auto-submit reading log if intent is LOG_READING
    if (res.intent === 'LOG_READING' && res.actionPayload?.bookId) {
      try {
        await submitReadingLog({
          book_id: res.actionPayload.bookId,
          start_page: res.actionPayload.startPage ?? 0,
          end_page: res.actionPayload.endPage ?? 0,
          pages_read: res.actionPayload.pagesRead ?? 0,
          duration_minutes: res.actionPayload.durationMinutes ?? 0,
          session_note: res.actionPayload.sessionNote,
          finished_book: res.actionPayload.finishedBook,
          rating: res.actionPayload.rating,
        });
        triggerHaptic([40, 50, 40]);
        addToast(`Logged ${res.actionPayload.pagesRead} pages for "${res.matchedBook?.title}"`, 'success');
      } catch (err: any) {
        console.error('Failed to auto-submit log:', err);
        addToast('Action recognized, but login required to write to Sheets.', 'error');
      }
    }

    speakText(res.spokenReply);
  };

  // --- PRESS / HOLD GESTURE HANDLERS ---
  const handlePressStart = () => {
    didTriggerHoldRef.current = false;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    // 280ms threshold distinguishes a quick tap from a deliberate hold
    holdTimerRef.current = setTimeout(() => {
      didTriggerHoldRef.current = true;
      setCenterMenuOpen(false);
      setShowResultCard(false);
      startSpeechRecognition();
    }, 280);
  };

  const handlePressEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (didTriggerHoldRef.current) {
      // User held and is now releasing their finger!
      setIsHolding(false);
      stopSpeechRecognition();
      triggerHaptic(30);

      // Give a tiny 120ms tick for the speech engine to flush the last syllable
      setTimeout(() => {
        const text = latestTranscriptRef.current;
        if (text && text.trim()) {
          handleExecution(text);
        }
      }, 120);
    } else {
      // Short tap: standard toggle of center actions menu
      setCenterMenuOpen(!centerMenuOpen);
    }
  };

  // Touch Events (Mobile - Samsung S21 FE)
  const onTouchStart = () => {
    isTouchActiveRef.current = true;
    handlePressStart();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevents simulated mouse click on mobile
    handlePressEnd();
    setTimeout(() => {
      isTouchActiveRef.current = false;
    }, 400);
  };

  const onTouchCancel = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setIsHolding(false);
    stopSpeechRecognition();
    isTouchActiveRef.current = false;
  };

  // Mouse Events (Desktop)
  const onMouseDown = () => {
    if (isTouchActiveRef.current) return;
    handlePressStart();
  };

  const onMouseUp = () => {
    if (isTouchActiveRef.current) return;
    handlePressEnd();
  };

  const onMouseLeave = () => {
    if (isTouchActiveRef.current) return;
    if (didTriggerHoldRef.current) {
      handlePressEnd();
    } else if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (resultCardTimerRef.current) clearTimeout(resultCardTimerRef.current);
      stopSpeechRecognition();
    };
  }, []);

  return (
    <>
      {/* 1. SCREEN-WIDE AI AMBIENT OVERLAY & GLOWING CHROMATIC BORDER */}
      <AnimatePresence>
        {isHolding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden"
          >
            {/* Dark Cinematic Backdrop Blur */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

            {/* Apple Intelligence-style Chromatic Neon Edge Glow (Top, Sides, Bottom) */}
            <div className="absolute inset-0 border-[3px] border-transparent rounded-none pointer-events-none shadow-[inset_0_0_50px_rgba(139,92,246,0.35),inset_0_0_90px_rgba(244,63,94,0.25)]" />

            {/* Pulsing Bottom Radial Aura originating right behind the plus button */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.65, 0.95, 0.65],
              }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-t from-violet-600/40 via-fuchsia-500/30 to-amber-400/20 blur-3xl"
            />

            {/* Floating Suggestions Overlay (Above the HUD) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-40 left-0 right-0 px-4 flex flex-col items-center pointer-events-none space-y-2"
            >
              <span className="text-[11px] uppercase tracking-wider font-semibold text-white/80 drop-shadow flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300 animate-spin" />
                <span>Speak naturally while holding</span>
              </span>

              <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
                <span className="px-3 py-1 rounded-full bg-white/15 dark:bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-medium shadow-lg">
                  &ldquo;Log Fourth Protocol from 45 to 80&rdquo;
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 dark:bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-medium shadow-lg">
                  &ldquo;Where is Dune?&rdquo;
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 dark:bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-medium shadow-lg">
                  &ldquo;What is my streak?&rdquo;
                </span>
              </div>
            </motion.div>

            {/* Live Holographic Transcription HUD Pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-24 left-4 right-4 sm:left-auto sm:right-auto sm:w-[420px] sm:-translate-x-1/2 sm:left-1/2 p-3.5 rounded-2xl bg-black/80 dark:bg-[#0d1117]/90 border border-white/25 dark:border-white/15 backdrop-blur-2xl shadow-2xl flex items-center gap-3"
            >
              {/* Dancing Equalizer Waveform Bars */}
              <div className="flex items-center gap-0.5 h-6 px-1 shrink-0">
                {[0.4, 0.9, 0.6, 1.0, 0.5, 0.8].map((mult, idx) => (
                  <motion.span
                    key={idx}
                    animate={{
                      scaleY: liveTranscript ? [0.3, mult * 1.5, 0.4] : [0.3, mult, 0.3],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5 + idx * 0.1,
                      ease: 'easeInOut',
                    }}
                    className="w-1 bg-gradient-to-t from-accent via-fuchsia-400 to-sky-300 rounded-full h-5 origin-bottom"
                  />
                ))}
              </div>

              {/* Live Words */}
              <div className="flex-1 min-w-0 text-left">
                {liveTranscript ? (
                  <p className="font-serif text-sm font-medium text-white italic truncate">
                    &ldquo;{liveTranscript}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-white/70 animate-pulse font-sans">
                    Listening to your voice... Release to execute.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. THE ELEVATED CENTER BUTTON (MORPHS FROM + TO PULSING MIC ON HOLD) */}
      <div className="relative -top-3 z-50">
        <button
          type="button"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all select-none cursor-pointer outline-none ${
            isHolding
              ? 'scale-125 bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 shadow-[0_0_35px_rgba(217,70,239,0.7)] ring-4 ring-white/30'
              : 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/30 active:scale-95'
          }`}
          aria-label="Tap for menu, hold to speak voice assistant"
          title="Tap for menu • Hold to speak voice assistant"
        >
          {/* Subtle Rotating Conic Halo when holding */}
          {isHolding && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 opacity-80 blur-xs -z-10"
            />
          )}

          {/* Morphing Icon: Plus <-> Mic */}
          <AnimatePresence mode="wait">
            {isHolding ? (
              <motion.div
                key="mic"
                initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                animate={{ scale: 1.1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-white drop-shadow"
              >
                <Mic size={22} className="animate-pulse" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-white"
              >
                <Plus
                  size={22}
                  className={`transition-transform duration-200 ${
                    centerMenuOpen ? 'rotate-45' : ''
                  }`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* 3. DYNAMIC FLOATING RESULT ISLAND (APPEARS ON PAGE AFTER RELEASE) */}
      <AnimatePresence>
        {showResultCard && result && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 p-3.5 rounded-2xl bg-canvas dark:bg-[#161b22] border border-rule dark:border-[#30363d] shadow-2xl flex flex-col space-y-2 backdrop-blur-xl"
          >
            <div className="flex items-start gap-3">
              {result.matchedBook ? (
                <div
                  className="w-11 shrink-0 cursor-pointer"
                  onClick={() => {
                    setSelectedBook(result.matchedBook!);
                    setShowResultCard(false);
                  }}
                >
                  <BookCover
                    title={result.matchedBook.title}
                    authors={result.matchedBook.authors}
                    coverUrl={result.matchedBook.cover_url}
                    readingStatus={result.matchedBook.reading_status}
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  {result.intent === 'CHECK_STREAK' ? (
                    <Flame size={18} className="text-amber-500" />
                  ) : result.intent === 'LOCATE_BOOK' ? (
                    <MapPin size={18} className="text-sky-500" />
                  ) : (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent dark:text-accent-dark">
                    {result.intent.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => setShowResultCard(false)}
                    className="p-1 rounded-md text-ink-muted hover:text-ink transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <h4 className="font-serif text-xs font-semibold text-ink dark:text-ink-dark truncate mt-0.5">
                  {result.cardTitle}
                </h4>
                <p className="text-[11px] text-ink-secondary dark:text-ink-dark-secondary mt-0.5 line-clamp-2">
                  {result.cardDetail}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {result.matchedBook && (
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-rule/50 dark:border-rule-dark/50">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBook(result.matchedBook!);
                    setShowResultCard(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                >
                  View Book Details →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
