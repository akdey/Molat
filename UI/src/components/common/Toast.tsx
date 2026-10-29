import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  duration?: number; // ms, 0 = persistent
}

interface ToastProps extends Toast {
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-ok dark:text-ok-dark shrink-0" />,
  error: <AlertCircle size={16} className="text-error dark:text-error-dark shrink-0" />,
  warning: <AlertTriangle size={16} className="text-warn dark:text-warn-dark shrink-0" />,
  info: <Info size={16} className="text-info dark:text-info-dark shrink-0" />,
};

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'border-ok/30 bg-ok-subtle dark:border-ok-dark/30 dark:bg-ok-dark-subtle',
  error: 'border-error/30 bg-error-subtle dark:border-error-dark/30 dark:bg-error-dark-subtle',
  warning: 'border-warn/30 bg-warn-subtle dark:border-warn-dark/30 dark:bg-warn-dark-subtle',
  info: 'border-info/30 bg-info-subtle dark:border-info-dark/30 dark:bg-info-dark-subtle',
};

function ToastItem({ id, kind, message, duration = 4000, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (duration === 0) return;
    timerRef.current = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timerRef.current);
  }, [id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-full max-w-sm px-4 py-3',
        'rounded-lg border shadow-md',
        'animate-slide-up',
        KIND_CLASS[kind],
      )}
    >
      {ICONS[kind]}
      <p className="text-sm text-ink dark:text-ink-dark flex-1 leading-snug">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// =================== Toast Context ===================

interface ToastContextValue {
  toast: (msg: string, kind?: ToastKind, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = React.useCallback((message: string, kind: ToastKind = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, kind, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-like fixed container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[60] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

