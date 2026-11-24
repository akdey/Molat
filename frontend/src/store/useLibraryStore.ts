import { create } from 'zustand';
import type {
  Book,
  PortfolioSummary,
  StreakSummary,
  WishlistItem,
  ReadingStatus,
  BookCondition,
  LendingRecord,
  LendingRecordCreate,
  LendingRecordReturn,
} from '../types/book';
import {
  fetchBooks,
  fetchStreakSummary,
  fetchWishlist,
  fetchLendingRecords,
  lendBook as apiLendBook,
  returnBook as apiReturnBook,
  logReadingSession,
  acquireWishlistItem,
  updateBook,
  enrichCovers,
  loginUser,
  signupUser,
  fetchSettings,
  updateSettings,
} from '../api/client';

export type ShelfSortOption =
  | 'default'
  | 'title_asc'
  | 'title_desc'
  | 'author_asc'
  | 'recent'
  | 'rating_desc'
  | 'pub_year_desc'
  | 'pub_year_asc';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
  duration?: number;
}

interface LibraryState {
  books: Book[];
  portfolio: PortfolioSummary | null;
  streakSummary: StreakSummary | null;
  wishlist: WishlistItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  toasts: Toast[];
  
  // Navigation & View Mode
  activeTab: 'home' | 'shelf' | 'tracker' | 'wishlist' | 'maintenance' | 'insights' | 'lending';
  viewMode: 'grid' | 'spine' | 'table';
  sortBy: ShelfSortOption;
  
  // Filters & Search
  search: string;
  statusFilter: string;
  genreFilter: string;
  selectedGenres: string[];
  conditionFilter: string;
  
  // Drawers & Modals
  selectedBook: Book | null;
  quickLogOpen: boolean;
  quickLogBook: Book | null;
  scannerOpen: boolean;
  keyModalOpen: boolean;
  lendingModalOpen: boolean;
  lendingModalBook: Book | null;
  lendingRecords: LendingRecord[];
  pickNextModalOpen: boolean;
  voiceAssistantOpen: boolean;
  focusRoomOpen: boolean;
  focusRoomBook: Book | null;
  hasActiveFocusTimer: boolean;
  
  // Auth & Settings
  authToken: string | null;
  authUser: string | null;
  theme: 'light' | 'dark';
  dailyGoal: number;
  activeBookId: string | null;
  
  // Setters & Actions
  setActiveTab: (tab: 'home' | 'shelf' | 'tracker' | 'wishlist' | 'maintenance' | 'insights' | 'lending') => void;
  setViewMode: (mode: 'grid' | 'spine' | 'table') => void;
  setSortBy: (sortBy: ShelfSortOption) => void;
  setSearch: (search: string) => void;
  setStatusFilter: (status: string) => void;
  setGenreFilter: (genre: string) => void;
  setSelectedGenres: (genres: string[]) => void;
  toggleGenre: (genre: string) => void;
  clearSelectedGenres: () => void;
  setConditionFilter: (condition: string) => void;
  setSelectedBook: (book: Book | null) => void;
  openQuickLog: (book?: Book) => void;
  closeQuickLog: () => void;
  setScannerOpen: (open: boolean) => void;
  setKeyModalOpen: (open: boolean) => void;
  openLendModal: (book?: Book) => void;
  closeLendModal: () => void;
  setPickNextModalOpen: (open: boolean) => void;
  setVoiceAssistantOpen: (open: boolean) => void;
  openFocusRoom: (book?: Book) => void;
  closeFocusRoom: () => void;
  setHasActiveFocusTimer: (has: boolean) => void;
  setDailyGoal: (goal: number) => Promise<void>;
  setActiveBookId: (bookId: string) => Promise<void>;
  loginOwner: (username: string, password: string) => Promise<void>;
  signupReader: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  logoutOwner: () => void;
  toggleTheme: () => void;
  addToast: (
    message: string,
    type?: 'success' | 'error' | 'info',
    action?: ToastAction,
    duration?: number
  ) => string;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  removeToast: (id: string) => void;
  
  // API Calls
  loadAllData: (forceRefresh?: boolean) => Promise<void>;
  loadBooks: (forceRefresh?: boolean) => Promise<void>;
  loadStreak: () => Promise<void>;
  loadWishlist: () => Promise<void>;
  loadLendingRecords: (forceRefresh?: boolean) => Promise<void>;
  lendBookRecord: (payload: LendingRecordCreate) => Promise<void>;
  returnBookRecord: (lendingId: string, returnLocation?: string) => Promise<void>;
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
  refreshing: false,
  error: null,
  toasts: [],
  
  activeTab: 'home',
  viewMode: 'grid',
  sortBy: 'default',
  
  search: '',
  statusFilter: 'ALL',
  genreFilter: 'ALL',
  selectedGenres: [],
  conditionFilter: 'ALL',
  
  selectedBook: null,
  quickLogOpen: false,
  quickLogBook: null,
  scannerOpen: false,
  keyModalOpen: false,
  lendingModalOpen: false,
  lendingModalBook: null,
  lendingRecords: [],
  pickNextModalOpen: false,
  voiceAssistantOpen: false,
  focusRoomOpen: false,
  focusRoomBook: null,
  hasActiveFocusTimer: typeof localStorage !== 'undefined' && !!localStorage.getItem('molat_active_focus_session_v1'),
  
  authToken: localStorage.getItem('molat_auth_token') || null,
  authUser: localStorage.getItem('molat_auth_user') || null,
  theme: 'light',
  dailyGoal: 15,
  activeBookId: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setGenreFilter: (genreFilter) => set({ genreFilter }),
  setSelectedGenres: (selectedGenres) => set({ selectedGenres }),
  toggleGenre: (genre) => set((state) => {
    const exists = state.selectedGenres.includes(genre);
    const updated = exists
      ? state.selectedGenres.filter((g) => g !== genre)
      : [...state.selectedGenres, genre];
    return { selectedGenres: updated };
  }),
  clearSelectedGenres: () => set({ selectedGenres: [] }),
  setConditionFilter: (conditionFilter) => set({ conditionFilter }),
  setSelectedBook: (selectedBook) => set({ selectedBook }),
  
  openQuickLog: (book) => {
    const activeId = get().activeBookId;
    const activeBook = activeId ? get().books.find(b => b.book_id === activeId && b.reading_status === 'READING') : null;
    set({
      quickLogOpen: true,
      quickLogBook: book || activeBook || get().books.find(b => b.reading_status === 'READING') || get().books[0] || null,
    });
  },
  closeQuickLog: () => set({ quickLogOpen: false, quickLogBook: null }),
  setScannerOpen: (scannerOpen) => set({ scannerOpen }),
  setKeyModalOpen: (keyModalOpen) => set({ keyModalOpen }),
  openLendModal: (book) => set({
    lendingModalOpen: true,
    lendingModalBook: book || null,
  }),
  closeLendModal: () => set({ lendingModalOpen: false, lendingModalBook: null }),
  setPickNextModalOpen: (pickNextModalOpen) => set({ pickNextModalOpen }),
  setVoiceAssistantOpen: (voiceAssistantOpen) => set({ voiceAssistantOpen }),
  openFocusRoom: (book) => {
    set({
      focusRoomOpen: true,
      focusRoomBook: book || null,
    });
  },
  closeFocusRoom: () => set({ focusRoomOpen: false, focusRoomBook: null }),
  setHasActiveFocusTimer: (hasActiveFocusTimer) => set({ hasActiveFocusTimer }),

  setDailyGoal: async (goal: number) => {
    const clamped = Math.max(1, Math.min(500, Math.round(goal)));
    set({ dailyGoal: clamped });
    try {
      await updateSettings({ daily_goal_pages: clamped });
      const updated = await fetchStreakSummary(clamped);
      set({ streakSummary: updated });
      get().addToast(`Daily goal updated to ${clamped} pages`, 'success');
    } catch (err: any) {
      console.warn('Failed to update streak with new goal:', err);
    }
  },

  setActiveBookId: async (bookId: string) => {
    set({ activeBookId: bookId });
    try {
      await updateSettings({ active_book_id: bookId });
    } catch (err) {
      console.warn('Could not sync active book to database:', err);
    }
  },

  addToast: (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    action?: ToastAction,
    duration: number = 4000
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { id, message, type, action, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
    return id;
  },

  updateToast: (id: string, updates: Partial<Toast>) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  loginOwner: async (username, password) => {
    const res = await loginUser(username, password);
    const uName = res.user?.username || res.user?.email || 'reader';
    localStorage.setItem('molat_auth_token', res.access_token);
    localStorage.setItem('molat_auth_user', uName);
    set({ authToken: res.access_token, authUser: uName });
    get().addToast(`Welcome back, @${uName}!`, 'success');
  },

  signupReader: async (email, username, password) => {
    const res = await signupUser(email, username, password);
    const uName = res.user?.username || username;
    localStorage.setItem('molat_auth_token', res.access_token);
    localStorage.setItem('molat_auth_user', uName);
    set({ authToken: res.access_token, authUser: uName });
    get().addToast(`Welcome to Molat, ❧ ex/${uName}! Your library account is ready.`, 'success');
  },

  logout: () => {
    localStorage.removeItem('molat_auth_token');
    localStorage.removeItem('molat_auth_user');
    localStorage.removeItem('molat_library_key');
    set({ authToken: null, authUser: null });
    get().addToast('Signed out of reader session.', 'info');
  },

  logoutOwner: () => {
    get().logout();
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
    updateSettings({ theme: next }).catch((err) =>
      console.warn('Could not sync theme to database:', err)
    );
  },

  loadAllData: async (forceRefresh = false) => {
    if (forceRefresh) {
      set({ refreshing: true });
    } else {
      set({ loading: true, error: null });
    }
    try {
      const [bookRes, streakRes, wishRes, lendRes, settingsRes] = await Promise.allSettled([
        fetchBooks(forceRefresh),
        fetchStreakSummary(get().dailyGoal),
        fetchWishlist(),
        fetchLendingRecords(undefined, forceRefresh),
        fetchSettings(),
      ]);

      let loadedGoal = get().dailyGoal;
      let loadedActiveBookId = get().activeBookId;
      let loadedTheme = get().theme;

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        const s = settingsRes.value;
        if (s.daily_goal_pages) {
          loadedGoal = s.daily_goal_pages;
        }
        if (s.active_book_id) {
          loadedActiveBookId = s.active_book_id;
        }
        if (s.theme && (s.theme === 'dark' || s.theme === 'light')) {
          loadedTheme = s.theme;
          if (s.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }

      set((state) => ({
        books: bookRes.status === 'fulfilled' ? bookRes.value.books : state.books,
        portfolio: bookRes.status === 'fulfilled' ? bookRes.value.portfolio : state.portfolio,
        streakSummary: streakRes.status === 'fulfilled' ? streakRes.value : state.streakSummary,
        wishlist: wishRes.status === 'fulfilled' ? wishRes.value : state.wishlist,
        lendingRecords: lendRes.status === 'fulfilled' ? lendRes.value : state.lendingRecords,
        dailyGoal: loadedGoal,
        activeBookId: loadedActiveBookId,
        theme: loadedTheme,
        loading: false,
        refreshing: false,
      }));

      if (forceRefresh) {
        get().addToast('Catalogue refreshed from Google Sheets', 'success');
      }
    } catch (err: any) {
      set({ error: err.message || 'Error loading library data', loading: false, refreshing: false });
      get().addToast(err.message || 'Failed to sync with Google Sheets', 'error');
    }
  },

  loadBooks: async (forceRefresh = false) => {
    try {
      const data = await fetchBooks(forceRefresh);
      set({ books: data.books, portfolio: data.portfolio });
    } catch (err: any) {
      set({ error: err.message });
      get().addToast(`Error loading books: ${err.message}`, 'error');
    }
  },

  loadStreak: async () => {
    try {
      const streak = await fetchStreakSummary(get().dailyGoal);
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

  loadLendingRecords: async (forceRefresh = false) => {
    try {
      const records = await fetchLendingRecords(undefined, forceRefresh);
      set({ lendingRecords: records });
    } catch (err: any) {
      console.warn('Failed to fetch lending records:', err);
    }
  },

  lendBookRecord: async (payload) => {
    const token = get().authToken;
    const record = await apiLendBook(payload, token || undefined);
    get().addToast(`Lent volume to ${record.borrower_name}!`, 'success');
    await Promise.all([get().loadBooks(true), get().loadLendingRecords(true)]);
  },

  returnBookRecord: async (lendingId, returnLocation = 'Home Shelf') => {
    const token = get().authToken;
    const record = await apiReturnBook(lendingId, { return_location: returnLocation }, token || undefined);
    get().addToast(`Marked volume as returned by ${record.borrower_name}!`, 'success');
    await Promise.all([get().loadBooks(true), get().loadLendingRecords(true)]);
  },

  submitReadingLog: async (payload) => {
    const token = get().authToken;
    await logReadingSession(payload, token || undefined);
    get().addToast(`Recorded reading session (+${payload.pages_read} pages)!`, 'success');
    await Promise.all([get().loadBooks(true), get().loadStreak()]);
  },

  acquireItem: async (wishlistId, payload) => {
    const token = get().authToken;
    const book = await acquireWishlistItem(wishlistId, payload, token || undefined);
    get().addToast(`Acquired "${book.title}" and added to collection!`, 'success');
    await Promise.all([get().loadBooks(true), get().loadWishlist()]);
  },

  updateBookDetails: async (bookId, updates) => {
    const token = get().authToken;
    const updated = await updateBook(bookId, updates, token || undefined);
    get().addToast(`Updated details for "${updated.title}"`, 'success');
    await get().loadBooks(true);
  },

  triggerCoverEnrichment: async () => {
    const token = get().authToken;
    get().addToast('Scanning catalogue for cover enrichment...', 'info');
    const res = await enrichCovers(token || undefined);
    get().addToast(res.message || 'Cover enrichment completed!', 'success');
    await get().loadBooks(true);
    return res;
  },
}));
