import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Plus,
  Sparkles,
  BookOpen,
  MapPin,
  Flame,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { processVoiceAssistantCommand, AssistantResult } from '../utils/voiceAssistantEngine';
import { fetchReadingLogs } from '../api/client';
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
    theme,
  } = useLibraryStore();

  const isDark = theme === 'dark';

  const [overlayOpen, setOverlayOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [understoodResult, setUnderstoodResult] = useState<AssistantResult | null>(null);
  const [ttsMuted, setTtsMuted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeBookLastEndPage, setActiveBookLastEndPage] = useState<number | null>(null);
  const [bookLastPages, setBookLastPages] = useState<Record<string, number>>({});

  const holdTimerRef = useRef<any>(null);
  const didTriggerHoldRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isTouchActiveRef = useRef<boolean>(false);
  const hasExecutedRef = useRef<boolean>(false);

  // Active book currently reading (or first book fallback)
  const activeBook = useMemo(
    () => books.find((b) => b.reading_status === 'READING') || (books.length > 0 ? books[0] : null),
    [books]
  );

  // Fetch highest end_page previously logged across all books & for the active book
  useEffect(() => {
    let isMounted = true;
    fetchReadingLogs()
      .then((pastLogs) => {
        if (!isMounted || !pastLogs || pastLogs.length === 0) return;
        const map: Record<string, number> = {};
        for (const l of pastLogs) {
          if (l.book_id && typeof l.end_page === 'number') {
            map[l.book_id] = Math.max(map[l.book_id] || 0, l.end_page);
          }
        }
        setBookLastPages(map);
        if (activeBook?.book_id && map[activeBook.book_id]) {
          setActiveBookLastEndPage(map[activeBook.book_id]);
        }
      })
      .catch(() => {
        // Fallback to active book specific lookup
        if (activeBook?.book_id) {
          fetchReadingLogs(activeBook.book_id).then((bookLogs) => {
            if (!isMounted || !bookLogs || bookLogs.length === 0) return;
            const maxEnd = Math.max(...bookLogs.map((l) => l.end_page || 0));
            if (maxEnd > 0) {
              setActiveBookLastEndPage(maxEnd);
              setBookLastPages((prev) => ({ ...prev, [activeBook.book_id]: maxEnd }));
            }
          }).catch(() => {});
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeBook?.book_id]);

  // Dynamic suggestion chips based on real library books & last page read + 1
  const dynamicSuggestions = useMemo(() => {
    const list: string[] = [];
    if (activeBook) {
      const lastEnd = activeBookLastEndPage ?? 0;
      const startPage = lastEnd > 0 ? lastEnd + 1 : 1;
      const goalPages = streakSummary?.daily_goal_pages || 20;
      const endPage = startPage + goalPages;
      list.push(`Log reading for ${activeBook.title} from ${startPage} to ${endPage}`);
    }

    const bookWithLocation = books.find((b) => b.location && b.reading_status !== 'COMPLETED') || books[0];
    if (bookWithLocation) {
      list.push(`Where is ${bookWithLocation.title}?`);
    } else {
      list.push('Where is Dune?');
    }

    list.push("What's my streak?");
    list.push('What should I read next?');
    return list;
  }, [books, activeBook, activeBookLastEndPage, streakSummary]);



  // Haptic feedback (Samsung S21 FE)
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  // On-device text-to-speech
  const speakText = (text: string) => {
    if (ttsMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
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

  const stopListening = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const closeOverlay = () => {
    stopListening();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setOverlayOpen(false);
    setLiveTranscript('');
    setUnderstoodResult(null);
  };

  const handleExecuteCommand = async (commandText: string) => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;
    stopListening();
    if (!commandText.trim()) return;

    triggerHaptic(40);
    const res = processVoiceAssistantCommand(commandText, {
      books,
      lendingRecords,
      streakSummary,
      bookLastPages,
    });

    setUnderstoodResult(res);

    // If intent is LOG_READING, submit reading log to Google Sheets!
    if (res.intent === 'LOG_READING' && res.actionPayload?.bookId) {
      setIsSubmitting(true);
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
        if (res.actionPayload.endPage) {
          setActiveBookLastEndPage(res.actionPayload.endPage);
          setBookLastPages((prev) => ({
            ...prev,
            [res.actionPayload!.bookId!]: res.actionPayload!.endPage!,
          }));
        }
        triggerHaptic([40, 60, 40]);
        addToast(`Logged ${res.actionPayload.pagesRead} pages for "${res.matchedBook?.title}"`, 'success');
      } catch (err: any) {
        console.error('Failed to auto-submit log:', err);
        addToast('Session recognized, but authentication key is required.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }

    speakText(res.spokenReply);
  };

  const startListening = () => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      addToast('Voice speech recognition not supported in this browser.', 'error');
      return;
    }

    hasExecutedRef.current = false;
    setOverlayOpen(true);
    setLiveTranscript('');
    latestTranscriptRef.current = '';
    setUnderstoodResult(null);

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        triggerHaptic(45);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        transcript = transcript.trim();
        if (!transcript) return;

        setLiveTranscript(transcript);
        latestTranscriptRef.current = transcript;

        // Live preview of what it understands
        const preview = processVoiceAssistantCommand(transcript, {
          books,
          lendingRecords,
          streakSummary,
          bookLastPages,
        });
        if (preview && preview.intent !== 'UNKNOWN') {
          setUnderstoodResult(preview);
        }

        // Auto execute on natural pause of 1.4s
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (transcript.trim() && !hasExecutedRef.current) {
            handleExecuteCommand(transcript);
          }
        }, 1400);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          addToast('Microphone access denied. Please allow microphone permissions.', 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const spoken = latestTranscriptRef.current;
        if (spoken && spoken.trim() && !hasExecutedRef.current) {
          handleExecuteCommand(spoken);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  // --- LONG PRESS GESTURE HANDLERS ---
  const handlePressStart = () => {
    didTriggerHoldRef.current = false;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    holdTimerRef.current = setTimeout(() => {
      didTriggerHoldRef.current = true;
      setCenterMenuOpen(false);
      startListening();
    }, 280);
  };

  const handlePressEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (didTriggerHoldRef.current) {
      // User held to talk; if they spoke, execute what was heard
      triggerHaptic(30);
      const spoken = latestTranscriptRef.current;
      if (spoken && spoken.trim()) {
        handleExecuteCommand(spoken);
      }
    } else {
      // Short tap:
      if (overlayOpen) {
        closeOverlay();
      } else {
        setCenterMenuOpen(!centerMenuOpen);
      }
    }
  };

  // Touch handlers (Mobile)
  const onTouchStart = () => {
    isTouchActiveRef.current = true;
    handlePressStart();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handlePressEnd();
    setTimeout(() => {
      isTouchActiveRef.current = false;
    }, 400);
  };

  const onTouchCancel = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    isTouchActiveRef.current = false;
  };

  // Mouse handlers (Desktop)
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
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      stopListening();
    };
  }, []);

  // Dynamic content height detection: increases atmosphere coverage when content expands
  const isContentExpanded = Boolean(understoodResult || (liveTranscript && liveTranscript.length > 45));

  return (
    <>
      {/* 1. THE ELEVATED CENTER BUTTON (TURNS TO MIC ON HOLD/OPEN, REST OF BOTTOM BAR STAYS UNTOUCHED) */}
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
            overlayOpen || isListening
              ? 'scale-110 bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 shadow-[0_0_30px_rgba(99,102,241,0.65)] ring-2 ring-white/40'
              : 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/30 active:scale-95'
          }`}
          aria-label={overlayOpen ? 'Close Assistant' : 'Tap for menu • Hold for Voice Assistant'}
          title={overlayOpen ? 'Close Voice Assistant' : 'Tap for menu • Hold to speak voice assistant'}
        >
          {/* Subtle spinning iridescent ring while listening */}
          {(overlayOpen || isListening) && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
              className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 opacity-75 blur-xs -z-10"
            />
          )}

          {/* Morphing Icon: Plus <-> Mic */}
          <AnimatePresence mode="wait">
            {overlayOpen || isListening ? (
              <motion.div
                key="mic"
                initial={{ scale: 0.6, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.6, rotate: 45, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="text-white drop-shadow"
              >
                <Mic size={22} className={isListening ? 'animate-pulse text-white' : 'text-white'} />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.16 }}
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

      {/* 2. ATMOSPHERIC SEAMLESS OVERLAY (DYNAMIC HEIGHT BASED ON CONTENT) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {overlayOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="fixed inset-0 z-40 flex flex-col justify-end pb-24 select-none overflow-hidden"
                onClick={closeOverlay}
              >
                {/* Full-Screen Ambient Dim with dynamic upper fade */}
                <div
                  className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${
                    isDark
                      ? isContentExpanded
                        ? 'bg-slate-950/50 backdrop-blur-[8px]'
                        : 'bg-slate-950/40 backdrop-blur-[6px]'
                      : isContentExpanded
                      ? 'bg-slate-900/15 backdrop-blur-[7px]'
                      : 'bg-slate-900/10 backdrop-blur-[5px]'
                  }`}
                  style={{
                    WebkitMaskImage: isContentExpanded
                      ? 'linear-gradient(to top, black 0%, black 72%, rgba(0,0,0,0.5) 88%, transparent 100%)'
                      : 'linear-gradient(to top, black 0%, black 42%, rgba(0,0,0,0.4) 68%, transparent 88%)',
                    maskImage: isContentExpanded
                      ? 'linear-gradient(to top, black 0%, black 72%, rgba(0,0,0,0.5) 88%, transparent 100%)'
                      : 'linear-gradient(to top, black 0%, black 42%, rgba(0,0,0,0.4) 68%, transparent 88%)',
                  }}
                />

                {/* Atmospheric Dark/Light-to-Fade Gradient: dynamically scales based on content height */}
                <div
                  className="absolute inset-0 pointer-events-none transition-all duration-300 ease-out"
                  style={{
                    background: isContentExpanded
                      ? isDark
                        ? 'linear-gradient(to top, rgba(10, 14, 26, 0.99) 0%, rgba(10, 14, 26, 0.96) 55%, rgba(12, 17, 32, 0.88) 75%, rgba(14, 21, 38, 0.5) 90%, rgba(15, 23, 42, 0.15) 97%, transparent 100%)'
                        : 'linear-gradient(to top, rgba(235, 243, 255, 0.99) 0%, rgba(235, 243, 255, 0.96) 55%, rgba(238, 245, 255, 0.88) 75%, rgba(242, 247, 255, 0.5) 90%, rgba(246, 250, 255, 0.15) 97%, transparent 100%)'
                      : isDark
                      ? 'linear-gradient(to top, rgba(10, 14, 26, 0.98) 0%, rgba(12, 17, 32, 0.92) 28%, rgba(14, 21, 38, 0.62) 50%, rgba(15, 23, 42, 0.26) 68%, rgba(15, 23, 42, 0.06) 82%, transparent 94%)'
                      : 'linear-gradient(to top, rgba(235, 243, 255, 0.98) 0%, rgba(238, 245, 255, 0.92) 28%, rgba(242, 247, 255, 0.62) 50%, rgba(246, 250, 255, 0.26) 68%, rgba(248, 251, 255, 0.06) 82%, transparent 94%)',
                  }}
                />

                {/* Radiant Chromatic Aurora Pulse at Horizon */}
                <div
                  className={`absolute inset-x-0 bottom-0 blur-3xl pointer-events-none transition-all duration-300 ${
                    isContentExpanded ? 'h-80' : 'h-64'
                  } ${
                    isDark
                      ? 'bg-gradient-to-t from-indigo-500/25 via-cyan-500/10 to-transparent'
                      : 'bg-gradient-to-t from-sky-400/25 via-indigo-300/15 to-transparent'
                  }`}
                />
                <div
                  className={`absolute -bottom-10 left-1/2 -translate-x-1/2 w-80 h-36 blur-2xl rounded-full pointer-events-none transition-all duration-300 ${
                    isDark
                      ? 'bg-gradient-to-tr from-cyan-400/20 via-indigo-500/25 to-fuchsia-500/20'
                      : 'bg-gradient-to-tr from-sky-400/30 via-indigo-400/20 to-pink-400/15'
                  }`}
                />

                {/* Seamless Content Stream floating on the gradient */}
                <motion.div
                  initial={{ y: 25, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="relative z-10 w-full max-w-lg mx-auto px-5 py-3 flex flex-col space-y-3.5 max-h-[82vh] overflow-y-auto no-scrollbar"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Equalizer Waveform + Molat Voice & Speaker directly below it */}
                  <div className="flex flex-col items-center text-center space-y-1.5 py-1">
                    {/* Dancing Equalizer Waveform: Actively pulses when listening, freezes flat when stopped */}
                    <div className="flex items-center gap-1 h-5">
                      {[0.35, 0.9, 0.55, 1.0, 0.45, 0.8].map((mult, idx) => (
                        <motion.span
                          key={idx}
                          animate={{
                            scaleY: isListening
                              ? (liveTranscript ? [0.25, mult * 1.8, 0.25] : [0.25, mult, 0.25])
                              : 0.15,
                          }}
                          transition={{
                            repeat: isListening ? Infinity : 0,
                            duration: isListening ? 0.5 + idx * 0.08 : 0.2,
                            ease: 'easeInOut',
                          }}
                          className={`w-1 rounded-full h-5 origin-bottom transition-colors ${
                            isDark
                              ? 'bg-gradient-to-t from-cyan-400 via-indigo-300 to-violet-300 shadow-[0_0_6px_rgba(56,189,248,0.4)]'
                              : 'bg-gradient-to-t from-sky-500 via-indigo-500 to-purple-500 shadow-[0_0_6px_rgba(14,165,233,0.35)]'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Small "Molat Voice" pill & Speaker audio toggle beside it */}
                    <div className="flex items-center justify-center gap-1.5 pt-0.5">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md transition-colors ${
                          isDark
                            ? 'bg-white/[0.08] border border-white/15 text-white/90 shadow-sm'
                            : 'bg-white/80 border border-sky-200/80 text-slate-800 shadow-xs'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isListening
                              ? isDark
                                ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse'
                                : 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)] animate-pulse'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-[10px] font-semibold flex items-center gap-1 font-sans tracking-wide">
                          <Sparkles size={10} className={isDark ? 'text-cyan-300' : 'text-sky-600'} />
                          <span>Molat Voice</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTtsMuted(!ttsMuted)}
                        className={`p-1 rounded-full border text-xs transition-colors cursor-pointer shadow-xs backdrop-blur-md ${
                          !ttsMuted
                            ? isDark
                              ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200'
                              : 'border-sky-400/60 bg-sky-100 text-sky-700'
                            : isDark
                            ? 'border-white/15 bg-white/10 text-white/50 hover:text-white/80'
                            : 'border-slate-200 bg-white/70 text-slate-400 hover:text-slate-700'
                        }`}
                        title={ttsMuted ? 'Muted' : 'Spoken Feedback Active'}
                      >
                        {!ttsMuted ? <Volume2 size={11} /> : <VolumeX size={11} />}
                      </button>
                    </div>

                    {/* Transcript & Retry Button */}
                    <div className="min-h-[48px] flex items-center justify-center px-2 pt-0.5">
                      {liveTranscript ? (
                        <p
                          className={`font-serif text-lg sm:text-xl font-medium italic tracking-tight leading-relaxed ${
                            isDark ? 'text-white drop-shadow-md' : 'text-slate-900 drop-shadow-xs'
                          }`}
                        >
                          &ldquo;{liveTranscript}&rdquo;
                        </p>
                      ) : isListening ? (
                        <p
                          className={`text-xs sm:text-sm font-serif italic animate-pulse ${
                            isDark ? 'text-cyan-100/80' : 'text-sky-900/80'
                          }`}
                        >
                          Listening... Speak book title, page range, or question
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={startListening}
                          className={`text-xs flex items-center gap-1.5 font-medium px-3.5 py-1 rounded-full border backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                            isDark
                              ? 'text-cyan-200 hover:text-white bg-white/10 hover:bg-white/15 border-white/15'
                              : 'text-sky-700 hover:text-sky-900 bg-white/80 hover:bg-white border-sky-200/80'
                          }`}
                        >
                          <RotateCcw size={12} />
                          <span>Tap to speak again</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Understood Result Card */}
                  {understoodResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`w-full p-3.5 rounded-2xl border backdrop-blur-2xl shadow-xl space-y-2.5 ${
                        isDark
                          ? 'bg-white/[0.08] border-white/15 text-white'
                          : 'bg-white/90 border-sky-200/80 text-slate-900 shadow-sky-950/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 ${
                            isDark ? 'text-cyan-300' : 'text-sky-700'
                          }`}
                        >
                          <CheckCircle2 size={13} className={isDark ? 'text-cyan-400' : 'text-sky-600'} />
                          <span>What Molat Understood</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            isDark
                              ? 'bg-indigo-500/25 border border-indigo-400/30 text-indigo-200'
                              : 'bg-sky-100 border border-sky-200 text-sky-800'
                          }`}
                        >
                          {understoodResult.intent.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        {understoodResult.matchedBook ? (
                          <div
                            className="w-12 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                              setSelectedBook(understoodResult.matchedBook!);
                              closeOverlay();
                            }}
                          >
                            <BookCover
                              title={understoodResult.matchedBook.title}
                              authors={understoodResult.matchedBook.authors}
                              coverUrl={understoodResult.matchedBook.cover_url}
                              readingStatus={understoodResult.matchedBook.reading_status}
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                              isDark
                                ? 'bg-white/10 border-white/15 text-cyan-300'
                                : 'bg-sky-50 border-sky-200/80 text-sky-700'
                            }`}
                          >
                            {understoodResult.intent === 'CHECK_STREAK' ? (
                              <Flame size={20} className="text-orange-500" />
                            ) : understoodResult.intent === 'LOCATE_BOOK' ? (
                              <MapPin size={20} className="text-sky-600" />
                            ) : (
                              <CheckCircle2 size={20} className="text-emerald-500" />
                            )}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 text-left">
                          <h4
                            className={`font-serif text-sm font-semibold truncate ${
                              isDark ? 'text-white drop-shadow-sm' : 'text-slate-900'
                            }`}
                          >
                            {understoodResult.cardTitle}
                          </h4>
                          <p
                            className={`text-xs mt-0.5 leading-snug ${
                              isDark ? 'text-white/80' : 'text-slate-600'
                            }`}
                          >
                            {understoodResult.cardDetail}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className={`flex items-center justify-end gap-2 pt-1 border-t ${
                          isDark ? 'border-white/10' : 'border-slate-200/60'
                        }`}
                      >
                        {understoodResult.matchedBook && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBook(understoodResult.matchedBook!);
                              closeOverlay();
                            }}
                            className={`px-3 py-1 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                              isDark
                                ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>View Book Details</span>
                            <ArrowRight size={11} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={closeOverlay}
                          className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:brightness-105 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
                        >
                          {isSubmitting ? 'Logging...' : 'Done'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Suggestion Chips: shown while listening or idle, smoothly hidden when recognized action card appears */}
                  {!understoodResult && (
                    <div className="w-full flex flex-col items-center space-y-2 pt-0.5">
                      <span
                        className={`text-[10px] uppercase tracking-widest font-semibold ${
                          isDark ? 'text-slate-300/80 drop-shadow' : 'text-sky-900/70 font-bold'
                        }`}
                      >
                        Try saying or tapping:
                      </span>
                      <div className="flex flex-wrap justify-center gap-2 max-w-md">
                        {dynamicSuggestions.map((phrase, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setLiveTranscript(phrase);
                              handleExecuteCommand(phrase);
                            }}
                            className={`px-3.5 py-1.5 rounded-full border text-xs font-normal tracking-wide backdrop-blur-xl transition-all text-left active:scale-95 ${
                              isDark
                                ? 'bg-white/[0.08] hover:bg-white/[0.16] border-white/[0.15] hover:border-white/30 text-white/95 shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
                                : 'bg-white/80 hover:bg-white border-sky-200/80 hover:border-sky-300 text-slate-800 shadow-xs hover:shadow-sm'
                            }`}
                          >
                            &ldquo;{phrase}&rdquo;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
