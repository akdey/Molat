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
  } = useLibraryStore();

  const [overlayOpen, setOverlayOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [understoodResult, setUnderstoodResult] = useState<AssistantResult | null>(null);
  const [ttsMuted, setTtsMuted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeBookLastEndPage, setActiveBookLastEndPage] = useState<number | null>(null);

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

  // Fetch highest end_page previously logged for the active book
  useEffect(() => {
    if (!activeBook?.book_id) {
      setActiveBookLastEndPage(0);
      return;
    }
    let isMounted = true;
    fetchReadingLogs(activeBook.book_id)
      .then((pastLogs) => {
        if (!isMounted) return;
        if (pastLogs && pastLogs.length > 0) {
          const maxEnd = Math.max(...pastLogs.map((l) => l.end_page || 0));
          if (maxEnd > 0) {
            setActiveBookLastEndPage(maxEnd);
            return;
          }
        }
        setActiveBookLastEndPage(0);
      })
      .catch(() => {
        if (isMounted) setActiveBookLastEndPage(0);
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

      {/* 2. ATMOSPHERIC SEAMLESS OVERLAY (FADES UP FROM BOTTOM BAR, NO BOX OR MODAL POPUP) */}
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
                {/* Full-Screen Ambient Dim */}
                <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[7px] pointer-events-none" />

                {/* Atmospheric Dark-to-Fade Gradient: Pure Deep Midnight Obsidian at bottom, fading smoothly up */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(10, 14, 26, 0.98) 0%, rgba(13, 19, 36, 0.93) 38%, rgba(15, 23, 42, 0.72) 68%, rgba(15, 23, 42, 0.18) 88%, transparent 100%)',
                  }}
                />

                {/* Radiant Chromatic Aurora Pulse at Horizon */}
                <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-indigo-500/25 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-80 h-36 bg-gradient-to-tr from-cyan-400/20 via-indigo-500/25 to-fuchsia-500/20 blur-2xl rounded-full pointer-events-none" />

                {/* Seamless Content Stream floating on the gradient */}
                <motion.div
                  initial={{ y: 25, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="relative z-10 w-full max-w-lg mx-auto px-5 py-3 flex flex-col space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
              {/* Top Controls: Floating Frosted Pill with Title, TTS Mute & Close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 backdrop-blur-xl shadow-lg">
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="text-[11px] font-semibold text-white/90 flex items-center gap-1.5 font-sans tracking-wide">
                    <Sparkles size={12} className="text-cyan-300" />
                    <span>Molat Voice</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTtsMuted(!ttsMuted)}
                    className={`p-1.5 rounded-full border text-xs transition-colors cursor-pointer shadow-md backdrop-blur-xl ${
                      !ttsMuted
                        ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200'
                        : 'border-white/15 bg-white/10 text-white/50 hover:text-white/80'
                    }`}
                    title={ttsMuted ? 'Muted' : 'Spoken Feedback Active'}
                  >
                    {!ttsMuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </button>

                  <button
                    onClick={closeOverlay}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition-colors shadow-md backdrop-blur-xl"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* 1. TRANSCRIPT (CRISP FLOATING TYPOGRAPHY WITH DANCING EQUALIZER) */}
              <div className="flex flex-col items-center text-center space-y-2 py-1">
                {/* Dancing Equalizer Waveform */}
                <div className="flex items-center gap-1 h-5">
                  {[0.35, 0.9, 0.55, 1.0, 0.45, 0.8].map((mult, idx) => (
                    <motion.span
                      key={idx}
                      animate={{
                        scaleY: isListening ? (liveTranscript ? [0.25, mult * 1.8, 0.25] : [0.25, mult, 0.25]) : 0.25,
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.5 + idx * 0.08,
                        ease: 'easeInOut',
                      }}
                      className="w-1 bg-gradient-to-t from-cyan-400 via-indigo-300 to-violet-300 rounded-full h-5 origin-bottom shadow-[0_0_6px_rgba(56,189,248,0.4)]"
                    />
                  ))}
                </div>

                <div className="min-h-[52px] flex items-center justify-center px-2">
                  {liveTranscript ? (
                    <p className="font-serif text-lg sm:text-xl font-medium text-white italic tracking-tight leading-relaxed drop-shadow-md">
                      &ldquo;{liveTranscript}&rdquo;
                    </p>
                  ) : isListening ? (
                    <p className="text-xs sm:text-sm text-cyan-100/80 font-serif italic animate-pulse">
                      Listening... Speak book title, page range, or question
                    </p>
                  ) : (
                    <button
                      onClick={startListening}
                      className="text-xs text-cyan-200 hover:text-white flex items-center gap-1.5 font-medium px-3.5 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all shadow-sm cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Tap to speak again</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. WHAT IT UNDERSTOOD & ACTIONS (SEAMLESS LUMINOUS STRIP, NO BOX) */}
              {understoodResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full p-3.5 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-2xl shadow-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-300 flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-cyan-400" />
                      <span>What Molat Understood</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/25 border border-indigo-400/30 text-indigo-200">
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
                      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 text-cyan-300 flex items-center justify-center shrink-0">
                        {understoodResult.intent === 'CHECK_STREAK' ? (
                          <Flame size={20} className="text-orange-400" />
                        ) : understoodResult.intent === 'LOCATE_BOOK' ? (
                          <MapPin size={20} className="text-sky-400" />
                        ) : (
                          <CheckCircle2 size={20} className="text-emerald-400" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="font-serif text-sm font-semibold text-white truncate drop-shadow-sm">
                        {understoodResult.cardTitle}
                      </h4>
                      <p className="text-xs text-white/80 mt-0.5 leading-snug">
                        {understoodResult.cardDetail}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                    {understoodResult.matchedBook && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBook(understoodResult.matchedBook!);
                          closeOverlay();
                        }}
                        className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                      >
                        <span>View Book Details</span>
                        <ArrowRight size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeOverlay}
                      className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:brightness-110 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
                    >
                      {isSubmitting ? 'Logging...' : 'Done'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 3. SUGGESTIONS (CRISP FROSTED GLASS PILLS) */}
              <div className="w-full flex flex-col items-center space-y-2.5 pt-1">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-300/80 drop-shadow">
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
                      className="px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 border border-white/[0.15] hover:border-white/30 text-white/95 text-xs font-normal tracking-wide backdrop-blur-xl transition-all shadow-[0_4px_16px_rgba(0,0,0,0.25)] text-left"
                    >
                      &ldquo;{phrase}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
};
