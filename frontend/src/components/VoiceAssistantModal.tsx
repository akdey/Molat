import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  MapPin,
  Flame,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { processVoiceAssistantCommand, AssistantResult } from '../utils/voiceAssistantEngine';
import { BookCover } from './BookCover';

export const VoiceAssistantModal: React.FC = () => {
  const {
    books,
    lendingRecords,
    streakSummary,
    voiceAssistantOpen,
    setVoiceAssistantOpen,
    submitReadingLog,
    setSelectedBook,
    addToast,
  } = useLibraryStore();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  // Trigger haptic feedback for mobile (Samsung S21 FE)
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore haptic errors if unsupported
      }
    }
  };

  // Speak aloud with native Web SpeechSynthesis (Samsung One UI / Google TTS)
  const speakText = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleClose = () => {
    stopListening();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceAssistantOpen(false);
    setResult(null);
    setLiveTranscript('');
    setSpeechError(null);
  };

  const executeAction = async (commandText: string) => {
    stopListening();
    if (!commandText.trim()) return;

    setIsExecuting(true);
    triggerHaptic(50);

    const res = processVoiceAssistantCommand(commandText, {
      books,
      lendingRecords,
      streakSummary,
    });

    setResult(res);

    // If intent is LOG_READING and payload is present, automatically submit log to Google Sheets!
    if (res.intent === 'LOG_READING' && res.actionPayload && res.actionPayload.bookId) {
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
        console.error('Failed to auto-submit reading log via assistant:', err);
        addToast('Session recognized, but saving required authentication.', 'error');
      }
    }

    speakText(res.spokenReply);
    setIsExecuting(false);
  };

  const startListening = () => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome or Samsung Internet.');
      return;
    }

    setResult(null);
    setSpeechError(null);
    setLiveTranscript('');

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        triggerHaptic(40);
      };

      recognition.onresult = (event: any) => {
        let transcriptText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcriptText += event.results[i][0].transcript;
        }
        setLiveTranscript(transcriptText);

        // Reset silence timer on speech
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (transcriptText.trim()) {
            executeAction(transcriptText);
          }
        }, 1600);
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice assistant recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setSpeechError('Could not start microphone. Please check permissions.');
    }
  };

  // Start listening automatically when assistant overlay opens
  useEffect(() => {
    if (voiceAssistantOpen) {
      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [voiceAssistantOpen]);

  return (
    <AnimatePresence>
      {voiceAssistantOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0">
          {/* Deep Translucent Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Siri-Style Bottom Sheet & Fluid Orb Overlay */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-lg mx-auto bg-canvas dark:bg-[#0d1117] border-t border-rule dark:border-[#30363d] rounded-t-3xl shadow-2xl flex flex-col p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Pull Handle */}
            <div className="w-10 h-1 bg-ink-muted/30 rounded-full mx-auto -mt-1 mb-1 shrink-0" />

            {/* Top Bar: Title & Mute & Close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                <h3 className="font-serif text-sm font-semibold tracking-wide text-ink dark:text-ink-dark flex items-center gap-1.5">
                  <Sparkles size={14} className="text-accent" />
                  Molat Voice Assistant
                </h3>
              </div>

              <div className="flex items-center gap-1">
                {/* TTS Spoken Output Toggle */}
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                    ttsEnabled
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-rule dark:border-rule-dark text-ink-muted'
                  }`}
                  title={ttsEnabled ? 'Spoken Voice Response: Enabled' : 'Spoken Voice Response: Muted'}
                >
                  {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>

                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Error Message if Any */}
            {speechError && (
              <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{speechError}</span>
              </div>
            )}

            {/* Real-Time Spoken Transcript Display */}
            <div className="min-h-[50px] flex items-center justify-center text-center px-2">
              {liveTranscript ? (
                <p className="font-serif text-base sm:text-lg text-ink dark:text-ink-dark italic font-medium leading-relaxed animate-fade-in">
                  &ldquo;{liveTranscript}&rdquo;
                </p>
              ) : isListening ? (
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted animate-pulse">
                  Listening... Say e.g. &ldquo;Log reading for The Fourth Protocol from 45 to 80&rdquo;
                </p>
              ) : (
                <p className="text-xs text-ink-muted">Tap the microphone to speak</p>
              )}
            </div>

            {/* Glowing Siri Soundwave / Pulsing Orb */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative flex items-center justify-center">
                {/* Siri Multi-Layer Pulsing Rings */}
                {isListening && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-accent via-purple-500 to-sky-400 blur-lg -z-10"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.9, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut', delay: 0.2 }}
                      className="absolute w-16 h-16 rounded-full bg-gradient-to-r from-emerald-400 to-accent blur-md -z-10"
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                      if (liveTranscript.trim()) executeAction(liveTranscript);
                    } else {
                      startListening();
                    }
                  }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                    isListening
                      ? 'bg-accent text-white scale-105 shadow-accent/50'
                      : 'bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark text-ink dark:text-ink-dark hover:border-accent'
                  }`}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                >
                  {isListening ? (
                    <MicOff size={24} className="animate-pulse" />
                  ) : (
                    <Mic size={24} className="text-accent" />
                  )}
                </button>
              </div>

              <span className="text-3xs text-ink-muted mt-2 font-medium">
                {isListening ? 'Tap to finish speaking' : 'Tap to start speaking'}
              </span>
            </div>

            {/* Action Result Confirmation Card */}
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-md space-y-2.5 animate-in"
              >
                <div className="flex items-start gap-3">
                  {result.matchedBook ? (
                    <div
                      className="w-12 shrink-0 cursor-pointer"
                      onClick={() => {
                        setSelectedBook(result.matchedBook!);
                        handleClose();
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
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      {result.intent === 'CHECK_STREAK' ? (
                        <Flame size={20} className="text-amber-500" />
                      ) : (
                        <CheckCircle2 size={20} className="text-emerald-500" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-3xs font-semibold uppercase bg-accent/15 text-accent dark:text-accent-dark">
                        {result.intent.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-serif text-sm font-semibold text-ink dark:text-ink-dark truncate mt-0.5">
                      {result.cardTitle}
                    </h4>
                    <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 line-clamp-2">
                      {result.cardDetail}
                    </p>
                  </div>
                </div>

                {/* Bottom Actions for the Card */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-rule/40 dark:border-rule-dark/40">
                  {result.matchedBook && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBook(result.matchedBook!);
                        handleClose();
                      }}
                      className="px-3 py-1 rounded-lg border border-rule dark:border-rule-dark text-xs font-medium text-ink hover:border-accent transition-colors"
                    >
                      View Book
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3.5 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-2xs"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}

            {/* Quick Voice Suggestion Pills */}
            <div className="space-y-1.5 pt-1">
              <span className="text-3xs uppercase tracking-wider font-semibold text-ink-muted block">
                Try saying:
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
                      executeAction(phrase);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent text-3xs font-medium text-ink-secondary dark:text-ink-dark-secondary transition-colors cursor-pointer text-left"
                  >
                    &ldquo;{phrase}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

