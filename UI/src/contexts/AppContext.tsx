import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Book } from '../types/book';
import type { ConnectionStatus } from '../types/api';

export type Theme = 'light' | 'dark' | 'system';

interface AppState {
  books: Book[];
  booksLoading: boolean;
  booksError: string | null;
  connectionStatus: ConnectionStatus;
  lastRefresh: Date | null;
  theme: Theme;
  currency: string;
}

interface AppActions {
  setBooks: (books: Book[]) => void;
  setBooksLoading: (v: boolean) => void;
  setBooksError: (e: string | null) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setLastRefresh: (d: Date) => void;
  setTheme: (t: Theme) => void;
  setCurrency: (c: string) => void;
  updateBook: (book: Book) => void;
  removeBook: (book_id: string) => void;
  addBook: (book: Book) => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const [currency, setCurrency] = useState('INR');

  const updateBook = useCallback((book: Book) => {
    setBooks(prev => prev.map(b => b.book_id === book.book_id ? book : b));
  }, []);

  const removeBook = useCallback((book_id: string) => {
    setBooks(prev => prev.filter(b => b.book_id !== book_id));
  }, []);

  const addBook = useCallback((book: Book) => {
    setBooks(prev => [book, ...prev]);
  }, []);

  const value = useMemo(() => ({
    books, booksLoading, booksError,
    connectionStatus, lastRefresh, theme, currency,
    setBooks, setBooksLoading, setBooksError,
    setConnectionStatus, setLastRefresh, setTheme, setCurrency,
    updateBook, removeBook, addBook,
  }), [books, booksLoading, booksError, connectionStatus, lastRefresh, theme, currency, updateBook, removeBook, addBook]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
