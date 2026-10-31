import type { Book, BookListResponse } from '../types/book';

// If VITE_API_URL is configured (e.g. https://user-molat-api.hf.space on Vercel), use it.
// Otherwise, fallback to relative path '/api/v1' which is proxied by Vite dev server.
const RAW_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = `${RAW_BASE}/api/v1`;

function getAuthHeaders(tokenOrKey?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cred =
    tokenOrKey ||
    localStorage.getItem('molat_auth_token') ||
    localStorage.getItem('molat_library_key') ||
    (import.meta.env.VITE_LIBRARY_KEY || '');

  if (cred) {
    if (cred.includes('.')) {
      headers['Authorization'] = `Bearer ${cred}`;
    } else {
      headers['X-Library-Key'] = cred;
    }
  }
  return headers;
}

// ==================== AUTH ====================

export async function loginUser(
  username: string,
  password: string
): Promise<{ access_token: string; username: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Invalid username or password');
  }
  return res.json();
}

// ==================== BOOKS ====================

  export async function fetchBooks(refresh = false): Promise<BookListResponse> {
    const url = refresh ? `${API_BASE}/books?refresh=true` : `${API_BASE}/books`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
    return res.json();
  }

  export async function fetchBookById(id: string): Promise<Book> {
    const res = await fetch(`${API_BASE}/books/${id}`);
    if (!res.ok) throw new Error(`Book not found: ${res.status}`);
    return res.json();
  }

  export async function createBook(book: Partial<Book>, tokenOrKey?: string): Promise<Book> {
    const res = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: getAuthHeaders(tokenOrKey),
      body: JSON.stringify(book),
    });
    if (!res.ok) throw new Error(`Failed to create book: ${res.status}`);
    return res.json();
  }

  export async function updateBook(id: string, updates: Partial<Book>, tokenOrKey?: string): Promise<Book> {
    const res = await fetch(`${API_BASE}/books/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(tokenOrKey),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update book: ${res.status}`);
    return res.json();
  }

  export async function deleteBook(id: string, tokenOrKey?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/books/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(tokenOrKey),
    });
    if (!res.ok) throw new Error(`Failed to delete book: ${res.status}`);
  }

  export async function enrichCovers(tokenOrKey?: string): Promise<{ scanned: number; enriched: number; message: string }> {
    const res = await fetch(`${API_BASE}/books/enrich-covers`, {
      method: 'POST',
      headers: getAuthHeaders(tokenOrKey),
    });
    if (!res.ok) throw new Error(`Enrichment failed: ${res.status}`);
    return res.json();
  }

  // ==================== READING & STREAK ====================

  export async function fetchStreakSummary(goal = 20): Promise<import('../types/book').StreakSummary> {
    const res = await fetch(`${API_BASE}/reading/streak-summary?goal=${goal}`);
    if (!res.ok) throw new Error(`Failed to fetch streak summary: ${res.status}`);
    return res.json();
  }

  export async function logReadingSession(
    payload: import('../types/book').ReadingLogCreate,
    tokenOrKey?: string
  ): Promise<import('../types/book').ReadingLog> {
    const res = await fetch(`${API_BASE}/reading/logs`, {
      method: 'POST',
      headers: getAuthHeaders(tokenOrKey),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to log reading session: ${res.status}`);
    return res.json();
  }

  export async function fetchReadingLogs(bookId?: string): Promise<import('../types/book').ReadingLog[]> {
    const url = bookId ? `${API_BASE}/reading/logs?book_id=${encodeURIComponent(bookId)}` : `${API_BASE}/reading/logs`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch reading logs: ${res.status}`);
    return res.json();
  }

  // ==================== WISHLIST ====================

  export async function fetchWishlist(): Promise<import('../types/book').WishlistItem[]> {
    const res = await fetch(`${API_BASE}/wishlist`);
    if (!res.ok) throw new Error(`Failed to fetch wishlist: ${res.status}`);
    return res.json();
  }

  export async function createWishlistItem(
    item: Partial<import('../types/book').WishlistItem>,
    tokenOrKey?: string
  ): Promise<import('../types/book').WishlistItem> {
    const res = await fetch(`${API_BASE}/wishlist`, {
      method: 'POST',
      headers: getAuthHeaders(tokenOrKey),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(`Failed to add wishlist item: ${res.status}`);
    return res.json();
  }

  export async function acquireWishlistItem(
    wishlistId: string,
    payload: import('../types/book').WishlistAcquirePayload,
    tokenOrKey?: string
  ): Promise<Book> {
    const res = await fetch(`${API_BASE}/wishlist/${wishlistId}/acquire`, {
      method: 'POST',
      headers: getAuthHeaders(tokenOrKey),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to acquire wishlist item: ${res.status}`);
    return res.json();
  }

  // ==================== LENDING ====================

  export async function fetchLendingRecords(
    status?: string,
    refresh = false
  ): Promise<import('../types/book').LendingRecord[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (refresh) params.set('refresh', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/lending${qs}`);
    if (!res.ok) throw new Error(`Failed to fetch lending records: ${res.status}`);
    return res.json();
  }

  export async function fetchActiveLendingForBook(
    bookId: string
  ): Promise<import('../types/book').LendingRecord | null> {
    const res = await fetch(`${API_BASE}/lending/book/${bookId}`);
    if (!res.ok) throw new Error(`Failed to check lending status: ${res.status}`);
    return res.json();
  }

  export async function lendBook(
    payload: import('../types/book').LendingRecordCreate,
    tokenOrKey?: string
  ): Promise<import('../types/book').LendingRecord> {
    const res = await fetch(`${API_BASE}/lending`, {
      method: 'POST',
      headers: getAuthHeaders(tokenOrKey),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to lend book: ${res.status}`);
    }
    return res.json();
  }

  export async function returnBook(
    lendingId: string,
    payload: import('../types/book').LendingRecordReturn = {},
    tokenOrKey?: string
  ): Promise<import('../types/book').LendingRecord> {
    const res = await fetch(`${API_BASE}/lending/${lendingId}/return`, {
      method: 'POST',
      headers: getAuthHeaders(tokenOrKey),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to return book: ${res.status}`);
    }
    return res.json();
  }
