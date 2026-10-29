import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// =================== Button ===================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent text-white border border-transparent',
    'hover:bg-accent-hover active:scale-[0.99]',
    'dark:bg-accent-dark dark:hover:bg-accent-dark-hover',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  secondary: [
    'bg-surface text-ink border border-rule',
    'hover:bg-surface/80 hover:border-rule-strong',
    'dark:bg-surface-dark dark:text-ink-dark dark:border-rule-dark',
    'dark:hover:bg-surface-dark-raised',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  ghost: [
    'bg-transparent text-ink-secondary border border-transparent',
    'hover:bg-surface hover:text-ink',
    'dark:text-ink-dark-secondary dark:hover:bg-surface-dark dark:hover:text-ink-dark',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  danger: [
    'bg-error text-white border border-transparent',
    'hover:bg-error/90',
    'dark:bg-error-dark dark:hover:bg-error-dark/90 dark:text-canvas-dark',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  link: [
    'bg-transparent text-accent underline-offset-2 hover:underline border-none p-0',
    'dark:text-accent-dark',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs rounded gap-1',
  sm: 'px-3 py-1.5 text-sm rounded gap-1.5',
  md: 'px-4 py-2 text-sm rounded-md gap-2',
  lg: 'px-6 py-3 text-base rounded-md gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, iconLeft, iconRight, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-fast select-none whitespace-nowrap',
        BUTTON_VARIANTS[variant],
        variant !== 'link' ? BUTTON_SIZES[size] : '',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" aria-hidden="true" />
      ) : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  ),
);
Button.displayName = 'Button';

// =================== IconButton ===================

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // required accessible name
  size?: ButtonSize;
  variant?: Exclude<ButtonVariant, 'link'>;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'md', variant = 'ghost', children, className, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-fast rounded-md',
        BUTTON_VARIANTS[variant],
        size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-9 h-9' : 'w-10 h-10',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';

// =================== Input ===================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  inputClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, iconRight, id, className, inputClassName, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-ink-secondary dark:text-ink-dark-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted pointer-events-none" aria-hidden="true">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full bg-surface-raised dark:bg-surface-dark-raised',
              'border border-rule dark:border-rule-dark rounded-md',
              'text-sm text-ink dark:text-ink-dark',
              'placeholder:text-ink-muted dark:placeholder:text-ink-dark-muted',
              'py-2 transition-colors duration-fast',
              'focus:outline-none focus:border-accent dark:focus:border-accent-dark focus:ring-1 focus:ring-accent/30',
              iconLeft ? 'pl-9 pr-3' : 'px-3',
              iconRight ? 'pr-9' : '',
              error ? 'border-error dark:border-error-dark' : '',
              inputClassName,
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted" aria-hidden="true">
              {iconRight}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-error dark:text-error-dark">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-ink-muted dark:text-ink-dark-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

// =================== Select ===================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-ink-secondary dark:text-ink-dark-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full bg-surface-raised dark:bg-surface-dark-raised',
            'border border-rule dark:border-rule-dark rounded-md',
            'text-sm text-ink dark:text-ink-dark px-3 py-2',
            'focus:outline-none focus:border-accent dark:focus:border-accent-dark focus:ring-1 focus:ring-accent/30',
            'transition-colors duration-fast appearance-none',
            error ? 'border-error dark:border-error-dark' : '',
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p role="alert" className="text-xs text-error dark:text-error-dark">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

// =================== Textarea ===================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const areaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {label && (
          <label htmlFor={areaId} className="text-xs font-medium text-ink-secondary dark:text-ink-dark-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full bg-surface-raised dark:bg-surface-dark-raised',
            'border border-rule dark:border-rule-dark rounded-md',
            'text-sm text-ink dark:text-ink-dark px-3 py-2',
            'placeholder:text-ink-muted dark:placeholder:text-ink-dark-muted',
            'focus:outline-none focus:border-accent dark:focus:border-accent-dark focus:ring-1 focus:ring-accent/30',
            'transition-colors duration-fast resize-y min-h-[80px]',
            error ? 'border-error dark:border-error-dark' : '',
          )}
          {...props}
        />
        {error && <p role="alert" className="text-xs text-error dark:text-error-dark">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{hint}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

