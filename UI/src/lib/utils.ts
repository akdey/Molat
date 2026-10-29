import { type ClassValue, clsx } from 'clsx';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format currency with locale-aware number formatting */
export function formatCurrency(amount: number, currency = 'INR', locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format ISO date to human-readable, e.g. "14 Mar 2024" */
export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Relative time, e.g. "2 hours ago" */
export function relativeTime(iso?: string | Date | null): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d.toISOString());
}

/** Normalize and validate ISBN-13/10 */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^\dX]/gi, '').toUpperCase();
}

export function isValidIsbn13(isbn: string): boolean {
  const clean = normalizeIsbn(isbn);
  if (clean.length !== 13) return false;
  const digits = clean.split('').map(Number);
  const check = digits.slice(0, 12).reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (check % 10)) % 10 === digits[12];
}

/** Truncate a string to maxLen characters with ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/** Progress percentage (0–100) */
export function readingProgress(current?: number, total?: number): number | null {
  if (current === undefined || !total || total <= 0) return null;
  return Math.min(100, Math.round((current / total) * 100));
}

/** Sanitize a string for formula injection (CSV export) */
export function sanitizeCsvCell(val: string): string {
  if (/^[=+\-@\t\r]/.test(val)) return `'${val}`;
  return val;
}

