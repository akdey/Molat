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
