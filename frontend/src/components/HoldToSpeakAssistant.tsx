import React, { useState, useEffect, useRef } from 'react';
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

  const holdTimerRef = useRef<any>(null);
  const didTriggerHoldRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isTouchActiveRef = useRef<boolean>(false);

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

    setOverlayOpen(true);
    setLiveTranscript('');
    latestTranscriptRef.current = '';
    setUnderstoodResult(null);

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        triggerHaptic(45);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
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

        // Auto execute on natural pause of 1.6s
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (transcript.trim()) {
            handleExecuteCommand(transcript);
          }
        }, 1600);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          addToast('Microphone access denied. Please allow microphone permissions.', 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
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
              ? 'scale-110 bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 shadow-[0_0_25px_rgba(217,70,239,0.55)] ring-2 ring-white/30'
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
              className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 opacity-70 blur-xs -z-10"
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

      {/* 2. THE AI ASSISTANT OVERLAY (FLOATING ABOVE BOTTOM BAR, SHOWING TRANSCRIPT, WHAT IT UNDERSTOOD, SUGGESTIONS & ACTIONS) */}
      <AnimatePresence>
        {overlayOpen && (
          <>
            {/* Soft Ambient Backdrop Blur (leaves bottom bar untouched) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeOverlay}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            />

            {/* Floating Glassmorphic AI Overlay Card */}
            <motion.div
              initial={{ opacity: 0, y: 35, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.94 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              className="fixed bottom-[74px] left-3 right-3 sm:left-auto sm:right-6 sm:w-[440px] z-50 p-4 rounded-3xl bg-canvas/95 dark:bg-[#0d1117]/95 border border-rule/80 dark:border-[#30363d] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl flex flex-col space-y-3.5 max-h-[75vh] overflow-y-auto"
              role="dialog"
              aria-label="Voice Assistant"
            >
              {/* Overlay Top Bar: Header, Audio Mute Toggle & Close */}
              <div className="flex items-center justify-between pb-1 border-b border-rule/50 dark:border-rule-dark/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-accent animate-ping' : 'bg-emerald-500'}`} />
                  <span className="font-serif text-xs font-semibold text-ink dark:text-ink-dark flex items-center gap-1.5">
                    <Sparkles size={13} className="text-accent" />
                    <span>Molat AI Assistant</span>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTtsMuted(!ttsMuted)}
                    className={`p-1.5 rounded-lg border text-3xs transition-colors cursor-pointer ${
                      !ttsMuted
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-rule dark:border-rule-dark text-ink-muted'
                    }`}
                    title={ttsMuted ? 'Voice Response Muted' : 'Voice Response Active'}
                  >
                    {!ttsMuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </button>

                  <button
                    onClick={closeOverlay}
                    className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* 1. TRANSCRIPT SECTION */}
              <div className="p-3 rounded-2xl bg-surface/80 dark:bg-surface-dark/80 border border-rule dark:border-rule-dark/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-muted flex items-center gap-1.5">
                    {/* Dancing Equalizer Waveform */}
                    <div className="flex items-center gap-0.5 h-3">
                      {[0.4, 0.9, 0.6, 1.0, 0.5].map((mult, idx) => (
                        <motion.span
                          key={idx}
                          animate={{
                            scaleY: isListening ? (liveTranscript ? [0.3, mult * 1.6, 0.3] : [0.3, mult, 0.3]) : 0.3,
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.5 + idx * 0.1,
                            ease: 'easeInOut',
                          }}
                          className="w-0.5 bg-accent rounded-full h-3 origin-bottom"
                        />
                      ))}
                    </div>
                    <span>Spoken Transcript</span>
                  </span>

                  {isListening ? (
                    <span className="text-[10px] text-accent font-medium animate-pulse">
                      Listening...
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={startListening}
                      className="text-[10px] text-accent hover:underline flex items-center gap-1"
                    >
                      <RotateCcw size={10} />
                      <span>Speak again</span>
                    </button>
                  )}
                </div>

                <div className="min-h-[38px] flex items-center">
                  {liveTranscript ? (
                    <p className="font-serif text-sm font-medium text-ink dark:text-ink-dark italic leading-relaxed">
                      &ldquo;{liveTranscript}&rdquo;
                    </p>
                  ) : isListening ? (
                    <p className="text-xs text-ink-muted italic font-serif">
                      Listening... Say e.g. &ldquo;Log reading for The Fourth Protocol from 45 to 80&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      Tap the center mic or hold to speak.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. WHAT IT UNDERSTOOD (PARSED RESULT CARD) */}
              {understoodResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-2xl bg-accent/5 dark:bg-accent/10 border border-accent/25 space-y-2 animate-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-accent dark:text-accent-dark flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>What Molat Understood</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-accent/20 text-accent">
                      {understoodResult.intent.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-start gap-3 pt-0.5">
                    {understoodResult.matchedBook ? (
                      <div
                        className="w-11 shrink-0 cursor-pointer hover:scale-105 transition-transform"
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
                      <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                        {understoodResult.intent === 'CHECK_STREAK' ? (
                          <Flame size={18} className="text-amber-500" />
                        ) : understoodResult.intent === 'LOCATE_BOOK' ? (
                          <MapPin size={18} className="text-sky-500" />
                        ) : (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-xs font-semibold text-ink dark:text-ink-dark truncate">
                        {understoodResult.cardTitle}
                      </h4>
                      <p className="text-[11px] text-ink-secondary dark:text-ink-dark-secondary mt-0.5 leading-snug">
                        {understoodResult.cardDetail}
                      </p>
                    </div>
                  </div>

                  {/* 3. ACTIONS SECTION */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-accent/20">
                    {understoodResult.matchedBook && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBook(understoodResult.matchedBook!);
                          closeOverlay();
                        }}
                        className="px-2.5 py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-medium text-ink hover:border-accent transition-colors flex items-center gap-1"
                      >
                        <span>View Book</span>
                        <ArrowRight size={11} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeOverlay}
                      className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-2xs"
                    >
                      {isSubmitting ? 'Logging...' : 'Done'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 4. SUGGESTIONS SECTION */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-muted block">
                  Suggestions to try:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Log reading for The Fourth Protocol from 45 to 80',
                    'Where is Dune?',
                    "What's my streak?",
                    'What should I read next?',
                  ].map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLiveTranscript(phrase);
                        handleExecuteCommand(phrase);
                      }}
                      className="px-2.5 py-1 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark hover:border-accent hover:text-accent text-[11px] font-medium text-ink-secondary dark:text-ink-dark-secondary transition-colors cursor-pointer text-left active:scale-98"
                    >
                      &ldquo;{phrase}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
