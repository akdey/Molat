import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Star,
  BookOpen,
  Clock,
  FileText,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { fetchReadingLogs } from '../api/client';
import { parseVoiceLogCommand } from '../utils/voiceLogParser';

export const QuickLogModal: React.FC = () => {
  const {
    books,
    quickLogOpen,
    quickLogBook,
    closeQuickLog,
    submitReadingLog,
    setKeyModalOpen,
    libraryKey,
    authToken,
  } = useLibraryStore();

  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [startPage, setStartPage] = useState<number>(0);
  const [endPage, setEndPage] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [sessionNote, setSessionNote] = useState<string>('');
  const [finishedBook, setFinishedBook] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Speech recognition states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [voiceFeedback, setVoiceFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const startPageRef = useRef<number>(startPage);

  useEffect(() => {
    startPageRef.current = startPage;
  }, [startPage]);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    if (quickLogBook) {
      setSelectedBookId(quickLogBook.book_id);
    } else if (books.length > 0) {
      const active = books.find((b) => b.reading_status === 'READING');
      setSelectedBookId(active ? active.book_id : books[0].book_id);
    }
  }, [quickLogBook, books]);

  // When book selection changes, auto-prefill startPage with the latest logged end_page
  useEffect(() => {
    if (!selectedBookId) return;
    let isCancelled = false;

    fetchReadingLogs(selectedBookId)
      .then((pastLogs) => {
        if (!isCancelled && pastLogs && pastLogs.length > 0) {
          const maxEnd = Math.max(...pastLogs.map((l) => l.end_page || 0));
          if (maxEnd > 0) {
            setStartPage(maxEnd);
            setEndPage(maxEnd);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully without breaking modal
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedBookId]);

  const stopVoiceListening = () => {
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
    stopVoiceListening();
    setLiveTranscript('');
    setVoiceFeedback(null);
    closeQuickLog();
  };

  const toggleVoiceListening = () => {
    if (isListening) {
      stopVoiceListening();
      return;
    }

    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      setErrorMsg('Voice dictation is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript('');
        setVoiceFeedback(null);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let transcriptText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcriptText += event.results[i][0].transcript;
        }
        setLiveTranscript(transcriptText);

        // Real-time parsed preview
        const parsed = parseVoiceLogCommand(transcriptText, startPageRef.current);
        if (parsed) {
          if (parsed.startPage !== undefined) setStartPage(parsed.startPage);
          if (parsed.endPage !== undefined) setEndPage(parsed.endPage);
          if (parsed.durationMinutes !== undefined) setDurationMinutes(parsed.durationMinutes);
          if (parsed.finishedBook !== undefined) setFinishedBook(parsed.finishedBook);
          if (parsed.rating !== undefined) setRating(parsed.rating);
          if (parsed.sessionNote !== undefined) setSessionNote(parsed.sessionNote);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error === 'no-speech') {
          setVoiceFeedback({ text: 'No speech heard. Tap the mic and try again.', success: false });
        } else {
          setErrorMsg(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setLiveTranscript((latestText) => {
          if (latestText && latestText.trim()) {
            const finalParsed = parseVoiceLogCommand(latestText, startPageRef.current);
            if (finalParsed) {
              setVoiceFeedback({
                text: `✓ Voice Logged: ${finalParsed.summary}`,
                success: true,
              });
            } else {
              setVoiceFeedback({
                text: `Heard "${latestText}". Try saying e.g. "from 45 to 80" or "read 30 pages"`,
                success: false,
              });
            }
          }
          return latestText;
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
      setErrorMsg('Could not start microphone. Please check browser permissions.');
    }
  };

  const pagesRead = Math.max(0, endPage - startPage);

  const handleIncrement = (inc: number) => {
    setEndPage((prev) => Math.max(startPage, prev + inc));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      setErrorMsg('Please select a book.');
      return;
    }
    if (endPage < startPage) {
      setErrorMsg('End page cannot be less than start page.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await submitReadingLog({
        book_id: selectedBookId,
        start_page: startPage,
        end_page: endPage,
        pages_read: pagesRead,
        duration_minutes: durationMinutes,
        session_note: sessionNote.trim() || undefined,
        finished_book: finishedBook,
        rating: finishedBook ? rating : undefined,
      });
      closeQuickLog();
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setErrorMsg('Authentication key required. Please set your X-Library-Key.');
        setKeyModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Failed to record session.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {quickLogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-lg bg-canvas dark:bg-canvas-dark border-t border-rule dark:border-rule-dark rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Drawer Pull Handle */}
            <div className="w-10 h-1 bg-ink-muted/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-rule dark:border-rule-dark">
              <div className="flex items-center gap-2">
                <BookOpen className="text-accent dark:text-accent-dark h-5 w-5" />
                <h2 id="modal-title" className="font-serif text-base sm:text-lg font-medium text-ink dark:text-ink-dark">
                  Log Reading Session
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg text-ink-muted hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              >
                <X size={18} />
              </button>
            </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40">
              {errorMsg}
            </div>
          )}

          {/* Book Selector */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
              Select Book
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent"
            >
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  {b.title} ({b.reading_status})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Reading Log Assistant */}
          <div className="p-3 rounded-2xl border border-accent/25 bg-accent/5 dark:bg-accent/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-3xs uppercase tracking-wider font-semibold text-accent dark:text-accent-dark flex items-center gap-1.5">
                <Sparkles size={12} />
                <span>Voice Page Logger</span>
              </span>
              {isListening ? (
                <span className="flex items-center gap-1.5 text-3xs font-semibold text-red-600 dark:text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Listening...
                </span>
              ) : (
                <span className="text-3xs text-ink-muted">Speak naturally</span>
              )}
            </div>

            {/* Tap to Speak Button */}
            <button
              type="button"
              onClick={toggleVoiceListening}
              disabled={!speechSupported}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white border-red-600 shadow-md animate-pulse'
                  : 'bg-surface dark:bg-surface-dark border-rule dark:border-rule-dark text-ink dark:text-ink-dark hover:border-accent hover:bg-surface-raised active:scale-98'
              }`}
              title={speechSupported ? 'Click and say e.g. "From page 45 to 80"' : 'Voice not supported in this browser'}
            >
              {isListening ? (
                <>
                  <MicOff size={15} />
                  <span>Tap to finish speaking</span>
                </>
              ) : (
                <>
                  <Mic size={15} className="text-accent dark:text-accent-dark" />
                  <span>Tap to Speak: &ldquo;From page 45 to 80&rdquo;</span>
                </>
              )}
            </button>

            {/* Live Heard Transcript */}
            {isListening && liveTranscript && (
              <div className="p-2 rounded-lg bg-surface/90 dark:bg-surface-dark/90 border border-accent/30 text-xs text-ink dark:text-ink-dark flex items-center gap-2 animate-fade-in">
                <Volume2 size={13} className="text-accent shrink-0 animate-pulse" />
                <span className="italic truncate">&ldquo;{liveTranscript}&rdquo;</span>
              </div>
            )}

            {/* Parse Status Badge */}
            {voiceFeedback && (
              <div
                className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 animate-fade-in ${
                  voiceFeedback.success
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                }`}
              >
                <Check size={13} className="shrink-0" />
                <span>{voiceFeedback.text}</span>
              </div>
            )}

            {/* Natural Phrasing Hints */}
            <div className="flex flex-wrap items-center gap-1 text-3xs text-ink-muted pt-0.5">
              <span className="font-medium">Say:</span>
              <span className="px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-rule/50">&ldquo;from 45 to 80&rdquo;</span>
              <span className="px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-rule/50">&ldquo;read 35 pages&rdquo;</span>
              <span className="px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark border border-rule/50">&ldquo;page 20 to 50 for 30 mins&rdquo;</span>
            </div>
          </div>

          {/* Quick Increment Buttons */}
          <div className="space-y-1.5">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
              Quick Page Increment
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 20, 35].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => handleIncrement(amt)}
                  className="py-1 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark transition-colors"
                >
                  +{amt}p
                </button>
              ))}
            </div>
          </div>

          {/* Page Range Inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Start Page
              </label>
              <input
                type="number"
                min="0"
                value={startPage}
                onChange={(e) => setStartPage(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                End Page ({pagesRead} pgs)
              </label>
              <input
                type="number"
                min={startPage}
                value={endPage}
                onChange={(e) => setEndPage(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Duration in Minutes */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1.5">
              <Clock size={11} />
              Duration (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {/* Session Note */}
          <div className="space-y-1">
            <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted flex items-center gap-1.5">
              <FileText size={11} />
              Session Note (optional)
            </label>
            <input
              type="text"
              placeholder="Key thoughts, memorable quotes, or reflections..."
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
            />
          </div>

          {/* Finished Book Toggle */}
          <div className="pt-2 border-t border-rule/60 dark:border-rule-dark/60 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={finishedBook}
                onChange={(e) => setFinishedBook(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-accent focus:ring-accent accent-accent"
              />
              <span className="text-xs font-medium text-ink dark:text-ink-dark">
                I finished this book! (Transition to COMPLETED)
              </span>
            </label>

            {finishedBook && (
              <div className="p-2.5 rounded-xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark space-y-1 animate-in fade-in">
                <span className="text-3xs uppercase tracking-wider font-medium text-ink-muted block">
                  Book Rating
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={17}
                        className={
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300 dark:text-stone-600'
                        }
                      />
                    </button>
                  ))}
                  <span className="text-xs font-mono ml-2 text-ink-muted">{rating}/5</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark text-xs font-medium text-ink-secondary hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-sm transition-all"
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-white" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Session</span>
                </>
              )}
            </button>
          </div>
        </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

