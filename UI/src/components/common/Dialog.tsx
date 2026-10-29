import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';
import { IconButton } from './FormControls';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** 'sm' ~480px | 'md' ~640px (default) | 'lg' ~800px | 'full' */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Show a sticky footer area */
  footer?: React.ReactNode;
}

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  full: 'max-w-full mx-4',
};

export function Dialog({ open, onClose, title, description, children, className, size = 'md', footer }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  // Capture return focus target
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement;
      // Delay to allow DOM to render before moving focus
      requestAnimationFrame(() => firstFocusRef.current?.focus());
    } else {
      (returnFocusRef.current as HTMLElement | null)?.focus();
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Focus trap
  const trapFocus = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 dark:bg-ink-dark/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef as unknown as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        onKeyDown={trapFocus}
        className={cn(
          'relative z-10 w-full bg-canvas dark:bg-canvas-dark',
          'border border-rule dark:border-rule-dark',
          'shadow-xl rounded-t-xl sm:rounded-xl',
          'flex flex-col max-h-[90dvh]',
          SIZE_MAP[size],
          'animate-slide-up',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-rule dark:border-rule-dark">
          <div>
            <h2 id="dialog-title" className="font-serif text-xl font-medium text-ink dark:text-ink-dark leading-snug">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-sm text-ink-secondary dark:text-ink-dark-secondary mt-1">
                {description}
              </p>
            )}
          </div>
          <IconButton
            ref={firstFocusRef}
            label="Close dialog"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="-mt-1 -mr-1 shrink-0"
          >
            <X size={16} />
          </IconButton>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// =================== Confirm Dialog ===================

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-rule dark:border-rule-dark text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface dark:hover:bg-surface-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-md bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary">{message}</p>
    </Dialog>
  );
}

