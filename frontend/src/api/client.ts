import type { Book, BookListResponse, ReadingLog, ReadingLogCreate, StreakSummary, WishlistItem, WishlistAcquirePayload, LendingRecord, LendingRecordCreate, LendingRecordReturn, AlcoveOverview, ReadingStatus } from '../types/book';

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

  // 4. Response Interceptor: Capture Auth Token from Headers
  const authHeader = res.headers.get('Authorization') || res.headers.get('X-Auth-Token');
  if (authHeader) {
    const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (rawToken && typeof localStorage !== 'undefined') {
      localStorage.setItem('molat_auth_token', rawToken);
    }
  }

  // 5. Response Interceptor: Error handling
  if (!res.ok) {
    if (res.status === 401 && !options.skipAuth) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('molat_auth_token');
        localStorage.removeItem('molat_auth_user');
        localStorage.removeItem('molat_auth_email');
        localStorage.removeItem('molat_auth_role');
        localStorage.removeItem('molat_active_focus_session_v1');
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
  email_verified?: boolean;
  created_at?: string;
}

export async function signupUser(
  email: string,
  username: string,
  password: string
): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
    skipAuth: true,
  });
}

export async function loginUser(
  identifier: string,
  password: string
): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/login', {
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

// ==================== USER PROFILE & SECURITY ====================

export async function fetchCurrentUser(tokenOrKey?: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', {
    token: tokenOrKey,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  tokenOrKey?: string
): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    token: tokenOrKey,
  });
}

// ==================== EMAIL VERIFICATION ====================

export async function sendVerificationEmail(tokenOrKey?: string): Promise<{ status: string; expires_in_minutes?: number }> {
  return apiFetch<{ status: string; expires_in_minutes?: number }>('/auth/send-verification', {
    method: 'POST',
    token: tokenOrKey,
  });
}

export async function verifyEmailOtp(otpCode: string, tokenOrKey?: string): Promise<{ status: string; email_verified: boolean }> {
  return apiFetch<{ status: string; email_verified: boolean }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ otp_code: otpCode }),
    token: tokenOrKey,
  });
}

export async function verifyEmailLinkToken(token: string): Promise<{ status: string; email_verified: boolean; username?: string }> {
  return apiFetch<{ status: string; email_verified: boolean; username?: string }>('/auth/verify-email-link', {
    method: 'POST',
    body: JSON.stringify({ token }),
    skipAuth: true,
  });
}

// ==================== ALCOVES (SHARED HOUSEHOLD LIBRARY) ====================

export async function fetchAlcoveOverview(tokenOrKey?: string): Promise<AlcoveOverview> {
  return apiFetch<AlcoveOverview>('/alcoves/me', { token: tokenOrKey });
}

export async function createAlcove(name: string): Promise<{ id: string; name: string; invite_code: string; created_at: string }> {
  return apiFetch('/alcoves', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function joinAlcove(inviteCode: string): Promise<{ status: string; alcove_id: string; name: string }> {
  return apiFetch('/alcoves/join', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

export interface ReaderLookupItem {
  user_id: string;
  username: string;
  email_verified: boolean;
}

export async function lookupReaders(query: string): Promise<ReaderLookupItem[]> {
  return apiFetch<ReaderLookupItem[]>(`/alcoves/lookup?q=${encodeURIComponent(query)}`);
}

export async function inviteMemberToAlcove(
  alcoveId: string,
  identifier: string
): Promise<{
  status: string;
  target_type?: 'member' | 'external';
  invitee_handle?: string | null;
  invite_id: string;
  invitee_email: string;
  invite_code: string;
  email_sent: boolean;
}> {
  return apiFetch(`/alcoves/${alcoveId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

export async function leaveAlcove(alcoveId: string): Promise<{ status: string; alcove_id: string }> {
  return apiFetch(`/alcoves/${alcoveId}/leave`, {
    method: 'POST',
  });
}

export async function updateAlcoveAutoShare(
  alcoveId: string,
  autoShare: boolean,
  applyToExisting = true
): Promise<{ status: string; auto_share: boolean }> {
  return apiFetch(`/alcoves/${alcoveId}/auto-share`, {
    method: 'PUT',
    body: JSON.stringify({ auto_share: autoShare, apply_to_existing: applyToExisting }),
  });
}

export async function toggleBookAlcoveShare(bookId: string, shared: boolean): Promise<{ status: string; book_id: string; alcove_id: string | null }> {
  return apiFetch(`/alcoves/books/${bookId}/share`, {
    method: 'PUT',
    body: JSON.stringify({ shared }),
  });
}

export async function updateAlcoveBookState(
  bookId: string,
  payload: { reading_status?: ReadingStatus; current_page?: number; rating?: number | null; notes?: string | null }
): Promise<{ book_id: string; reading_status: ReadingStatus; current_page: number; rating?: number | null; notes?: string | null }> {
  return apiFetch(`/alcoves/books/${bookId}/state`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateAlcoveBookHolder(
  bookId: string,
  heldByLabel: string | null
): Promise<{ book_id: string; held_by_label: string | null }> {
  return apiFetch(`/alcoves/books/${bookId}/holder`, {
    method: 'PUT',
    body: JSON.stringify({ held_by_label: heldByLabel }),
  });
}
