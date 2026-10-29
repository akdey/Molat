import { api } from './client';
import type { Book } from '../types/book';
import type { ApiResponse } from '../types/api';

export const booksApi = {
  list: () => api.get<ApiResponse<Book[]>>('/books'),
  get: (id: string) => api.get<Book>(`/books/${id}`),
  create: (book: Partial<Book>) => api.post<Book>('/books', book),
  update: (id: string, book: Partial<Book>) => api.patch<Book>(`/books/${id}`, book),
  delete: (id: string) => api.delete<void>(`/books/${id}`),
  searchMetadata: (query: string) =>
    api.get<ApiResponse<Partial<Book>[]>>(`/metadata/search?q=${encodeURIComponent(query)}`),
  lookupIsbn: (isbn: string) =>
    api.get<Partial<Book>>(`/metadata/isbn/${encodeURIComponent(isbn)}`),
};
