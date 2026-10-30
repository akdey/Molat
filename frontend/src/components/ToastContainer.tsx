import React from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useLibraryStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border shadow-lg backdrop-blur-md text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 transition-all ${
              isSuccess
                ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : isError
                ? 'bg-red-50/95 dark:bg-red-950/90 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                : 'bg-surface-raised/95 dark:bg-surface-dark-raised/95 border-rule dark:border-rule-dark text-ink dark:text-ink-dark'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />}
              {isError && <AlertCircle size={16} className="text-red-600 dark:text-red-400" />}
              {!isSuccess && !isError && <Info size={16} className="text-accent dark:text-accent-dark" />}
            </div>
            <div className="flex-1 leading-snug">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-ink-muted hover:text-ink dark:hover:text-ink-dark transition-colors"
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

