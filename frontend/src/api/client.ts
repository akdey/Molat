import type { Book, BookListResponse } from '../types/book';

const API_BASE = '/api/v1';

export async function fetchBooks(): Promise<BookListResponse> {
  const res = await fetch(`${API_BASE}/books`);
  if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
  return res.json();
}

export async function fetchBookById(id: string): Promise<Book> {
  const res = await fetch(`${API_BASE}/books/${id}`);
  if (!res.ok) throw new Error(`Book not found: ${res.status}`);
  return res.json();
}

export async function createBook(book: Partial<Book>, libraryKey?: string): Promise<Book> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (libraryKey) headers['X-Library-Key'] = libraryKey;

  const res = await fetch(`${API_BASE}/books`, {
    method: 'POST',
    headers,
    body: JSON.stringify(book),
  });
  if (!res.ok) throw new Error(`Failed to create book: ${res.status}`);
  return res.json();
}

export async function updateBook(id: string, updates: Partial<Book>, libraryKey?: string): Promise<Book> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (libraryKey) headers['X-Library-Key'] = libraryKey;

  const res = await fetch(`${API_BASE}/books/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update book: ${res.status}`);
  return res.json();
}

export async function deleteBook(id: string, libraryKey?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (libraryKey) headers['X-Library-Key'] = libraryKey;

  const res = await fetch(`${API_BASE}/books/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`Failed to delete book: ${res.status}`);
}

export async function enrichCovers(libraryKey?: string): Promise<{ scanned: number; enriched: number; message: string }> {
  const headers: Record<string, string> = {};
  if (libraryKey) headers['X-Library-Key'] = libraryKey;

  const res = await fetch(`${API_BASE}/books/enrich-covers`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error(`Enrichment failed: ${res.status}`);
  return res.json();
}

export async function fetchStreakSummary(goal = 20): Promise<import('../types/book').StreakSummary> {
  const res = await fetch(`${API_BASE}/reading/streak-summary?goal=${goal}`);
  if (!res.ok) throw new Error(`Failed to fetch streak summary: ${res.status}`);
  return res.json();
}

export async function logReadingSession(
  payload: import('../types/book').ReadingLogCreate,
  libraryKey?: string
): Promise<import('../types/book').ReadingLog> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (libraryKey) headers['X-Library-Key'] = libraryKey;

  const res = await fetch(`${API_BASE}/reading/logs`, {
    method: 'POST',
    headers,
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

export async function fetchWishlist(): Promise<import('../types/book').WishlistItem[]> {
  const res = await fetch(`${API_BASE}/wishlist`);
  if (!res.ok) throw new Error(`Failed to fetch wishlist: ${res.status}`);
  return res.json();
}

export async function createWishlistItem(
  item: Partial<import('../types/book').WishlistItem>,
  libraryKey?: string
): Promise<import('../types/book').WishlistItem> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (libraryKey) headers['X-Library-Key'] = libraryKey;

  const res = await fetch(`${API_BASE}/wishlist`, {
    method: 'POST',
    headers,
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`Failed to add wishlist item: ${res.status}`);
  return res.json();
}

export async function acquireWishlistItem(
  wishlistId: string,
  payload: import('../types/book').WishlistAcquirePayload,
  libraryKey?: string
): Promise<Book> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (libraryKey) headers['X-Library-Key'] = libraryKey;

  const res = await fetch(`${API_BASE}/wishlist/${wishlistId}/acquire`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to acquire wishlist item: ${res.status}`);
  return res.json();
}

