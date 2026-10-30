import { create } from 'zustand';
import type { Book, PortfolioSummary, StreakSummary, WishlistItem, ReadingStatus, BookCondition } from '../types/book';
import {
  fetchBooks,
  fetchStreakSummary,
  fetchWishlist,
  logReadingSession,
  acquireWishlistItem,
  updateBook,
  enrichCovers,
} from '../api/client';

interface LibraryState {
  books: Book[];
  portfolio: PortfolioSummary | null;
  streakSummary: StreakSummary | null;
  wishlist: WishlistItem[];
  loading: boolean;
  error: string | null;
  
  // Navigation & View Mode
  activeTab: 'shelf' | 'tracker' | 'wishlist' | 'maintenance';
  viewMode: 'grid' | 'spine' | 'table';
  
  // Filters & Search
  search: string;
  statusFilter: string;
  genreFilter: string;
  conditionFilter: string;
  
  // Drawers & Modals
  selectedBook: Book | null;
  quickLogOpen: boolean;
  quickLogBook: Book | null;
  scannerOpen: boolean;
  keyModalOpen: boolean;
  
  // Auth & Settings
  libraryKey: string;
  theme: 'light' | 'dark';
  
  // Setters & Actions
  setActiveTab: (tab: 'shelf' | 'tracker' | 'wishlist' | 'maintenance') => void;
  setViewMode: (mode: 'grid' | 'spine' | 'table') => void;
  setSearch: (search: string) => void;
  setStatusFilter: (status: string) => void;
  setGenreFilter: (genre: string) => void;
  setConditionFilter: (condition: string) => void;
  setSelectedBook: (book: Book | null) => void;
  openQuickLog: (book?: Book) => void;
  closeQuickLog: () => void;
  setScannerOpen: (open: boolean) => void;
  setKeyModalOpen: (open: boolean) => void;
  setLibraryKey: (key: string) => void;
  toggleTheme: () => void;
  
  // API Calls
  loadAllData: () => Promise<void>;
  loadBooks: () => Promise<void>;
  loadStreak: () => Promise<void>;
  loadWishlist: () => Promise<void>;
  submitReadingLog: (payload: import('../types/book').ReadingLogCreate) => Promise<void>;
  acquireItem: (wishlistId: string, payload: import('../types/book').WishlistAcquirePayload) => Promise<void>;
  updateBookDetails: (bookId: string, updates: Partial<Book>) => Promise<void>;
  triggerCoverEnrichment: () => Promise<{ scanned: number; enriched: number; message: string }>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  portfolio: null,
  streakSummary: null,
  wishlist: [],
  loading: false,
  error: null,
  
  activeTab: 'shelf',
  viewMode: 'grid',
  
  search: '',
  statusFilter: 'ALL',
  genreFilter: 'ALL',
  conditionFilter: 'ALL',
  
  selectedBook: null,
  quickLogOpen: false,
  quickLogBook: null,
  scannerOpen: false,
  keyModalOpen: false,
  
  libraryKey: localStorage.getItem('molat_library_key') || '',
  theme: (localStorage.getItem('molat_theme') as 'light' | 'dark') || 'light',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setGenreFilter: (genreFilter) => set({ genreFilter }),
  setConditionFilter: (conditionFilter) => set({ conditionFilter }),
  setSelectedBook: (selectedBook) => set({ selectedBook }),
  
  openQuickLog: (book) => set({
    quickLogOpen: true,
    quickLogBook: book || get().books.find(b => b.reading_status === 'READING') || get().books[0] || null,
  }),
  closeQuickLog: () => set({ quickLogOpen: false, quickLogBook: null }),
  setScannerOpen: (scannerOpen) => set({ scannerOpen }),
  setKeyModalOpen: (keyModalOpen) => set({ keyModalOpen }),

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

  loadAllData: async () => {
    set({ loading: true, error: null });
    try {
      const [bookRes, streakRes, wishRes] = await Promise.allSettled([
        fetchBooks(),
        fetchStreakSummary(),
        fetchWishlist(),
      ]);

      set((state) => ({
        books: bookRes.status === 'fulfilled' ? bookRes.value.books : state.books,
        portfolio: bookRes.status === 'fulfilled' ? bookRes.value.portfolio : state.portfolio,
        streakSummary: streakRes.status === 'fulfilled' ? streakRes.value : state.streakSummary,
        wishlist: wishRes.status === 'fulfilled' ? wishRes.value : state.wishlist,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Error loading library data', loading: false });
    }
  },

  loadBooks: async () => {
    try {
      const data = await fetchBooks();
      set({ books: data.books, portfolio: data.portfolio });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  loadStreak: async () => {
    try {
      const streak = await fetchStreakSummary();
      set({ streakSummary: streak });
    } catch (err: any) {
      console.warn('Failed to fetch streak summary:', err);
    }
  },

  loadWishlist: async () => {
    try {
      const wishlist = await fetchWishlist();
      set({ wishlist });
    } catch (err: any) {
      console.warn('Failed to fetch wishlist:', err);
    }
  },

  submitReadingLog: async (payload) => {
    const { libraryKey } = get();
    await logReadingSession(payload, libraryKey);
    // Refresh both books (status auto-transitioned) and streak summary
    await Promise.all([get().loadBooks(), get().loadStreak()]);
  },

  acquireItem: async (wishlistId, payload) => {
    const { libraryKey } = get();
    await acquireWishlistItem(wishlistId, payload, libraryKey);
    await Promise.all([get().loadBooks(), get().loadWishlist()]);
  },

  updateBookDetails: async (bookId, updates) => {
    const { libraryKey } = get();
    const updated = await updateBook(bookId, updates, libraryKey);
    set((state) => ({
      books: state.books.map((b) => (b.book_id === bookId ? updated : b)),
      selectedBook: state.selectedBook?.book_id === bookId ? updated : state.selectedBook,
    }));
    await get().loadBooks();
  },

  triggerCoverEnrichment: async () => {
    const { libraryKey } = get();
    const res = await enrichCovers(libraryKey);
    await get().loadBooks();
    return res;
  },
}));
