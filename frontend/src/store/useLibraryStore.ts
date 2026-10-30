import { create } from 'zustand';
import type { Book, PortfolioSummary } from '../types/book';
import { fetchBooks } from '../api/client';

interface LibraryState {
  books: Book[];
  portfolio: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  libraryKey: string;
  theme: 'light' | 'dark';
  setLibraryKey: (key: string) => void;
  toggleTheme: () => void;
  loadBooks: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  portfolio: null,
  loading: false,
  error: null,
  libraryKey: localStorage.getItem('molat_library_key') || '',
  theme: (localStorage.getItem('molat_theme') as 'light' | 'dark') || 'light',

  setLibraryKey: (key: string) => {
    localStorage.setItem('molat_library_key', key);
    set({ libraryKey: key });
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('molat_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },

  loadBooks: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchBooks();
      set({ books: data.books, portfolio: data.portfolio, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error loading library', loading: false });
    }
  },
}));
