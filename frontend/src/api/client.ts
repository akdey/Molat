import type { Book, BookListResponse, ReadingLog, ReadingLogCreate, StreakSummary, WishlistItem, WishlistAcquirePayload, LendingRecord, LendingRecordCreate, LendingRecordReturn } from '../types/book';

// If VITE_API_URL is configured (e.g. https://user-molat-api.hf.space on Vercel), use it.
// Otherwise, fallback to relative path '/api/v1' which is proxied by Vite dev server.
const RAW_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = `${RAW_BASE}/api/v1`;

export interface ApiFetchOptions extends RequestInit {
  token?: string;
  skipAuth?: boolean;
}

/**
 * Centralized Network Interceptor for Molat REST API.
 * - Auto-resolves API_BASE
 * - Auto-injects Authorization: Bearer <token> from options or localStorage
 * - Auto-sets Content-Type: application/json for JSON payloads
 * - Intercepts 401 Unauthorized: purges stale tokens & fires 'molat:unauthorized'
 * - Intercepts structured API errors with descriptive messages
 */
export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // 1. Request Interceptor: Content-Type header
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // 2. Request Interceptor: Bearer Token injection
  if (!options.skipAuth && !headers.has('Authorization')) {
    const cred = options.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_token') : null);
    if (cred) {
      headers.set('Authorization', `Bearer ${cred.replace(/^Bearer\s+/i, '')}`);
    }
  }

  // 3. Execution
  const res = await fetch(url, { ...options, headers });

  // 4. Response Interceptor
  if (!res.ok) {
    if (res.status === 401 && !options.skipAuth) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('molat_auth_token');
        localStorage.removeItem('molat_auth_user');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('molat:unauthorized'));
      }
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed (${res.status})`);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json();
}

// ==================== AUTH ====================

export interface AuthUser {
  id: string;
  email?: string;
  username: string;
  role: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  expires_in_days: number;
}

export async function signupUser(
  email: string,
  username: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
    skipAuth: true,
  });
}

export async function loginUser(
  identifier: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
    skipAuth: true,
  });
}

// ==================== BOOKS ====================

export async function fetchBooks(refresh = false, tokenOrKey?: string): Promise<BookListResponse> {
  return apiFetch<BookListResponse>(refresh ? '/books?refresh=true' : '/books', {
    token: tokenOrKey,
  });
}

export async function fetchBookById(id: string, tokenOrKey?: string): Promise<Book> {
  return apiFetch<Book>(`/books/${id}`, {
    token: tokenOrKey,
  });
}

export async function createBook(book: Partial<Book>, tokenOrKey?: string): Promise<Book> {
  return apiFetch<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(book),
    token: tokenOrKey,
  });
}

export async function updateBook(id: string, updates: Partial<Book>, tokenOrKey?: string): Promise<Book> {
  return apiFetch<Book>(`/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    token: tokenOrKey,
  });
}

export async function deleteBook(id: string, tokenOrKey?: string): Promise<void> {
  return apiFetch<void>(`/books/${id}`, {
    method: 'DELETE',
    token: tokenOrKey,
  });
}

export async function enrichCovers(tokenOrKey?: string): Promise<{ scanned: number; enriched: number; message: string }> {
  return apiFetch<{ scanned: number; enriched: number; message: string }>('/books/enrich-covers', {
    method: 'POST',
    token: tokenOrKey,
  });
}

// ==================== READING & STREAK ====================

export async function fetchStreakSummary(goal = 20, tokenOrKey?: string): Promise<StreakSummary> {
  return apiFetch<StreakSummary>(`/reading/streak-summary?goal=${goal}`, {
    token: tokenOrKey,
  });
}

export async function logReadingSession(
  payload: ReadingLogCreate,
  tokenOrKey?: string
): Promise<ReadingLog> {
  return apiFetch<ReadingLog>('/reading/logs', {
    method: 'POST',
    body: JSON.stringify(payload),
    token: tokenOrKey,
  });
}

export async function fetchReadingLogs(bookId?: string, tokenOrKey?: string): Promise<ReadingLog[]> {
  const endpoint = bookId ? `/reading/logs?book_id=${encodeURIComponent(bookId)}` : '/reading/logs';
  return apiFetch<ReadingLog[]>(endpoint, {
    token: tokenOrKey,
  });
}

// ==================== WISHLIST ====================

export async function fetchWishlist(tokenOrKey?: string): Promise<WishlistItem[]> {
  return apiFetch<WishlistItem[]>('/wishlist', {
    token: tokenOrKey,
  });
}

export async function createWishlistItem(
  item: Partial<WishlistItem>,
  tokenOrKey?: string
): Promise<WishlistItem> {
  return apiFetch<WishlistItem>('/wishlist', {
    method: 'POST',
    body: JSON.stringify(item),
    token: tokenOrKey,
  });
}

export async function acquireWishlistItem(
  wishlistId: string,
  payload: WishlistAcquirePayload,
  tokenOrKey?: string
): Promise<Book> {
  return apiFetch<Book>(`/wishlist/${wishlistId}/acquire`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token: tokenOrKey,
  });
}

// ==================== LENDING ====================

export async function fetchLendingRecords(
  status?: string,
  refresh = false,
  tokenOrKey?: string
): Promise<LendingRecord[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (refresh) params.set('refresh', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<LendingRecord[]>(`/lending${qs}`, {
    token: tokenOrKey,
  });
}

export async function fetchActiveLendingForBook(
  bookId: string,
  tokenOrKey?: string
): Promise<LendingRecord | null> {
  return apiFetch<LendingRecord | null>(`/lending/book/${bookId}`, {
    token: tokenOrKey,
  });
}

export async function lendBook(
  payload: LendingRecordCreate,
  tokenOrKey?: string
): Promise<LendingRecord> {
  return apiFetch<LendingRecord>('/lending', {
    method: 'POST',
    body: JSON.stringify(payload),
    token: tokenOrKey,
  });
}

export async function returnBook(
  lendingId: string,
  payload: LendingRecordReturn = {},
  tokenOrKey?: string
): Promise<LendingRecord> {
  return apiFetch<LendingRecord>(`/lending/${lendingId}/return`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token: tokenOrKey,
  });
}

// ==================== SETTINGS ====================

export interface UserSettings {
  daily_goal_pages: number;
  active_book_id: string | null;
  theme: string;
  updated_at?: string;
}

export interface UserSettingsUpdate {
  daily_goal_pages?: number;
  active_book_id?: string | null;
  theme?: string;
}

export async function fetchSettings(tokenOrKey?: string): Promise<UserSettings> {
  return apiFetch<UserSettings>('/settings', {
    token: tokenOrKey,
  });
}

export async function updateSettings(
  updates: UserSettingsUpdate,
  tokenOrKey?: string
): Promise<UserSettings> {
  return apiFetch<UserSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(updates),
    token: tokenOrKey,
  });
}
