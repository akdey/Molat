import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MessageCircle,
  Sparkles,
  Copy,
  Check,
  Send,
  RefreshCw,
  BookOpen,
  Calendar,
  AlertTriangle,
  User,
  Coffee,
  Feather,
  Smile,
  Heart,
  FileCheck,
} from 'lucide-react';
import type { LendingRecord } from '../types/book';
import {
  ReminderTone,
  checkChromeAiAvailability,
  getPresetReminder,
  generateReminderWithAi,
  AiAvailability,
} from '../utils/builtinAi';

interface WhatsAppReminderModalProps {
  record: LendingRecord | null;
  onClose: () => void;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  record,
  onClose,
}) => {
  const [tone, setTone] = useState<ReminderTone>('gentle');
  const [message, setMessage] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<AiAvailability>({
    supported: false,
    state: 'unsupported',
    label: 'Detecting AI...',
  });

  // Check window.ai on mount
  useEffect(() => {
    checkChromeAiAvailability().then(setAiStatus);
  }, []);

  // Sync initial message when record changes or opens
  useEffect(() => {
    if (record) {
      setTone(record.is_overdue ? 'formal' : 'gentle');
      setCustomPrompt('');
      const initial = getPresetReminder({
        borrowerName: record.borrower_name,
        bookTitle: record.book_title || 'the book',
        tone: record.is_overdue ? 'formal' : 'gentle',
        isOverdue: record.is_overdue,
        dueDate: record.due_date,
      });
      setMessage(initial);
      setCopied(false);
    }
  }, [record]);

  if (!record) return null;

  const handleToneChange = async (newTone: ReminderTone) => {
    setTone(newTone);
    if (aiStatus.supported && aiStatus.state === 'readily') {
      setIsGenerating(true);
      try {
        const generated = await generateReminderWithAi({
          borrowerName: record.borrower_name,
          bookTitle: record.book_title || 'the book',
          tone: newTone,
          isOverdue: record.is_overdue,
          dueDate: record.due_date,
          customPrompt,
        });
        setMessage(generated);
      } finally {
        setIsGenerating(false);
      }
    } else {
      const preset = getPresetReminder({
        borrowerName: record.borrower_name,
        bookTitle: record.book_title || 'the book',
        tone: newTone,
        isOverdue: record.is_overdue,
        dueDate: record.due_date,
      });
      setMessage(preset);
    }
  };

  const handleCustomAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const generated = await generateReminderWithAi({
        borrowerName: record.borrower_name,
        bookTitle: record.book_title || 'the book',
        tone,
        isOverdue: record.is_overdue,
        dueDate: record.due_date,
        customPrompt,
      });
      setMessage(generated);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (record.borrower_contact || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
    onClose();
  };

  const tones: { id: ReminderTone; label: string; icon: React.ReactNode }[] = [
    { id: 'gentle', label: 'Gentle', icon: <Heart size={12} /> },
    { id: 'playful', label: 'Playful', icon: <Smile size={12} /> },
    { id: 'casual', label: 'Casual', icon: <Coffee size={12} /> },
    { id: 'literary', label: 'Literary', icon: <Feather size={12} /> },
    { id: 'formal', label: 'Polite / Due', icon: <FileCheck size={12} /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal / Bottom Drawer Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full sm:max-w-lg bg-canvas dark:bg-canvas-dark border-t sm:border border-rule dark:border-rule-dark rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          {/* Mobile Drag Pull Bar */}
          <div className="w-10 h-1 bg-ink-muted/30 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Header Strip */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule dark:border-rule-dark bg-surface/50 dark:bg-surface-dark/50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <MessageCircle size={17} />
              </div>
              <div>
                <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark leading-tight flex items-center gap-1.5">
                  <span>WhatsApp Reminder Composer</span>
                </h3>
                <p className="text-3xs text-ink-muted">
                  Personalized follow-up for {record.borrower_name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Book & Borrower Summary Card */}
            <div className="p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 space-y-0.5">
                <div className="font-serif text-xs font-medium text-ink dark:text-ink-dark truncate">
                  "{record.book_title || 'Selected Volume'}"
                </div>
                <div className="text-3xs text-ink-secondary flex items-center gap-2">
                  <span>Lent to: <strong className="text-ink dark:text-ink-dark">{record.borrower_name}</strong></span>
                  {record.borrower_contact && (
                    <span className="text-ink-muted font-mono">{record.borrower_contact}</span>
                  )}
                </div>
              </div>

              {record.is_overdue ? (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 text-3xs font-semibold uppercase flex items-center gap-1">
                  <AlertTriangle size={10} />
                  <span>Overdue</span>
                </span>
              ) : (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-3xs font-medium">
                  {record.days_lent || 0}d on loan
                </span>
              )}
            </div>

            {/* AI & Preset Mode Indicator */}
            <div className="flex items-center justify-between text-3xs text-ink-muted">
              <span className="uppercase tracking-wider font-semibold">Choose Reminder Tone</span>
              <div className="flex items-center gap-1.5">
                {aiStatus.supported && aiStatus.state === 'readily' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium border border-emerald-300 dark:border-emerald-800">
                    <Sparkles size={10} className="text-emerald-600 animate-pulse" />
                    <span>window.ai (Gemini Nano)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface dark:bg-surface-dark border border-rule/50 text-ink-muted">
                    <Sparkles size={10} />
                    <span>Literary Tone Presets</span>
                  </span>
                )}
              </div>
            </div>

            {/* Tone Selector Chips */}
            <div className="flex flex-wrap gap-1.5">
              {tones.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToneChange(t.id)}
                  disabled={isGenerating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                    tone === t.id
                      ? 'bg-accent text-white shadow-xs'
                      : 'border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-ink-secondary hover:text-ink hover:bg-surface-raised'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* AI Custom Prompt Bar (Optional Instructions) */}
            <form onSubmit={handleCustomAiGenerate} className="flex items-center gap-1.5">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Custom instruction (e.g. mention book club, offer to swap...)"
                className="flex-1 px-3 py-1.5 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark focus:outline-none focus:border-accent h-9"
              />
              <button
                type="submit"
                disabled={isGenerating}
                className="h-9 px-3 rounded-xl bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:border-accent/40 text-ink text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Polish message with AI"
              >
                {isGenerating ? (
                  <RefreshCw size={13} className="animate-spin text-accent" />
                ) : (
                  <Sparkles size={13} className="text-accent" />
                )}
                <span className="hidden sm:inline">Refine</span>
              </button>
            </form>

            {/* Editable Message Preview Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-3xs text-ink-muted">
                <span>Message Preview (Tap to edit before sending)</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 hover:text-accent transition-colors cursor-pointer"
                >
                  {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs text-ink dark:text-ink-dark font-sans leading-relaxed focus:outline-none focus:border-accent resize-none shadow-xs"
                  placeholder="Generating message..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <Send size={14} />
                <span>Open in WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:bg-surface-raised text-ink text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
