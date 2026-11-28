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
  ReadingLog,
  AlcoveOverview,
  AppNotification,
} from '../types/book';
import {
  fetchBooks,
  fetchStreakSummary,
  fetchWishlist,
  fetchLendingRecords,
  fetchReadingLogs,
  fetchAlcoveOverview,
  fetchNotifications,
  markNotificationRead as apiMarkNotificationRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  lendBook as apiLendBook,
  returnBook as apiReturnBook,
  logReadingSession,
  acquireWishlistItem,
  updateBook,
  enrichCovers,
  loginUser,
  signupUser,
  fetchCurrentUser,
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
  activeTab: 'home' | 'shelf' | 'tracker' | 'wishlist' | 'maintenance' | 'insights' | 'lending' | 'alcoves' | 'adda' | 'profile' | 'more';
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
  readingLogs: ReadingLog[];
  pickNextModalOpen: boolean;
  voiceAssistantOpen: boolean;
  focusRoomOpen: boolean;
  focusRoomBook: Book | null;
  hasActiveFocusTimer: boolean;

  // Auth & Settings
  authToken: string | null;
  authUser: string | null;
  authEmail: string | null;
  authRole: string | null;
  emailVerified: boolean;
  verifyEmailModalOpen: boolean;
  alcoveOverview: AlcoveOverview | null;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  shelfScope: 'mine' | 'alcove';
  theme: 'light' | 'dark';
  dailyGoal: number;
  activeBookId: string | null;

  // Setters & Actions
  setActiveTab: (tab: 'home' | 'shelf' | 'tracker' | 'wishlist' | 'maintenance' | 'insights' | 'lending' | 'alcoves' | 'adda' | 'profile' | 'more') => void;
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
  completeVerificationLogin: (user: { username?: string; email?: string; role?: string }) => Promise<void>;
  logout: () => void;
  logoutOwner: () => void;
  syncUserProfile: () => Promise<void>;
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
  loadAlcoves: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  setShelfScope: (scope: 'mine' | 'alcove') => void;
  setEmailVerified: (verified: boolean) => void;
  setVerifyEmailModalOpen: (open: boolean) => void;
  loadBooks: (forceRefresh?: boolean) => Promise<void>;
  loadStreak: () => Promise<void>;
  loadWishlist: () => Promise<void>;
  loadReadingLogs: () => Promise<void>;
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
  readingLogs: [],
  pickNextModalOpen: false,
  voiceAssistantOpen: false,
  focusRoomOpen: false,
  focusRoomBook: null,
  hasActiveFocusTimer: typeof localStorage !== 'undefined' && !!localStorage.getItem('molat_active_focus_session_v1'),

  authToken: typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_token') : null,
  authUser: typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_user') : null,
  authEmail: typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_email') : null,
  authRole: typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_role') : null,
  emailVerified: true,
  verifyEmailModalOpen: false,
  alcoveOverview: null,
  notifications: [],
  unreadNotificationCount: 0,
  shelfScope: 'mine',
  theme: 'light',
  dailyGoal: 15,
  activeBookId: null,

  setShelfScope: (shelfScope) => set({ shelfScope }),
  setEmailVerified: (emailVerified) => set({ emailVerified }),
  setVerifyEmailModalOpen: (verifyEmailModalOpen) => set({ verifyEmailModalOpen }),

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
    const user = await loginUser(username, password);
    const uName = user.username || user.email || 'reader';
    const uEmail = user.email || '';
    const uRole = user.role || 'reader';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('molat_auth_user', uName);
      if (uEmail) localStorage.setItem('molat_auth_email', uEmail);
      if (uRole) localStorage.setItem('molat_auth_role', uRole);
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_token') : null;
    const isVerified = user.email_verified ?? false;
    set({
      authToken: token,
      authUser: uName,
      authEmail: uEmail,
      authRole: uRole,
      emailVerified: isVerified,
      verifyEmailModalOpen: !isVerified,
      alcoveOverview: null,
      books: [],
      portfolio: null,
      streakSummary: null,
      wishlist: [],
      lendingRecords: [],
      readingLogs: [],
    });
    get().addToast(`Welcome back, @${uName}!`, 'success');
    await get().loadAllData(true);
  },

  signupReader: async (email, username, password) => {
    await signupUser(email, username, password);
    get().addToast('Account created! Please verify your email before signing in.', 'info');
  },

  completeVerificationLogin: async (user) => {
    const uName = user.username || user.email || 'reader';
    const uEmail = user.email || '';
    const uRole = user.role || 'reader';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('molat_auth_user', uName);
      if (uEmail) localStorage.setItem('molat_auth_email', uEmail);
      if (uRole) localStorage.setItem('molat_auth_role', uRole);
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_token') : null;
    set({
      authToken: token,
      authUser: uName,
      authEmail: uEmail,
      authRole: uRole,
      emailVerified: true,
      verifyEmailModalOpen: false,
      alcoveOverview: null,
      books: [],
      portfolio: null,
      streakSummary: null,
      wishlist: [],
      lendingRecords: [],
      readingLogs: [],
    });
    get().addToast(`Email verified! Welcome to Molat, ex/${uName}.`, 'success');
    await get().loadAllData(true);
  },

  logout: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('molat_auth_token');
      localStorage.removeItem('molat_auth_user');
      localStorage.removeItem('molat_auth_email');
      localStorage.removeItem('molat_auth_role');
      localStorage.removeItem('molat_active_focus_session_v1');
    }
    set({
      authToken: null,
      authUser: null,
      authEmail: null,
      authRole: null,
      emailVerified: true,
      alcoveOverview: null,
      shelfScope: 'mine',
      hasActiveFocusTimer: false,
      focusRoomOpen: false,
      focusRoomBook: null,
      books: [],
      portfolio: null,
      streakSummary: null,
      wishlist: [],
      lendingRecords: [],
      readingLogs: [],
    });
    get().addToast('Signed out of reader session.', 'info');
  },

  logoutOwner: () => {
    get().logout();
  },

  syncUserProfile: async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('molat_auth_token') : null;
    if (!token) return;
    try {
      const user = await fetchCurrentUser(token);
      const uName = user.username || user.email || 'reader';
      const uEmail = user.email || '';
      const uRole = user.role || 'reader';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('molat_auth_user', uName);
        if (uEmail) localStorage.setItem('molat_auth_email', uEmail);
        if (uRole) localStorage.setItem('molat_auth_role', uRole);
      }
      set({
        authUser: uName,
        authEmail: uEmail,
        authRole: uRole,
        emailVerified: user.email_verified ?? true,
      });
    } catch (err) {
      // Retain existing session cached info
    }
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
      set({ refreshing: true, error: null });
    } else {
      set({ loading: true, error: null });
    }
    try {
      const [bookRes, streakRes, wishRes, lendRes, settingsRes, userRes, logsRes, alcoveRes, notifRes] = await Promise.allSettled([
        fetchBooks(forceRefresh),
        fetchStreakSummary(get().dailyGoal),
        fetchWishlist(),
        fetchLendingRecords(undefined, forceRefresh),
        fetchSettings(),
        fetchCurrentUser(),
        fetchReadingLogs(),
        fetchAlcoveOverview(),
        fetchNotifications(),
      ]);

      let loadedGoal = get().dailyGoal;
      let loadedActiveBookId = get().activeBookId;
      let loadedTheme = get().theme;

      if (userRes.status === 'fulfilled' && userRes.value) {
        const u = userRes.value;
        const uName = u.username || u.email || 'reader';
        const uEmail = u.email || '';
        const uRole = u.role || 'reader';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('molat_auth_user', uName);
          if (uEmail) localStorage.setItem('molat_auth_email', uEmail);
          if (uRole) localStorage.setItem('molat_auth_role', uRole);
        }
        set({
          authUser: uName,
          authEmail: uEmail,
          authRole: uRole,
          emailVerified: u.email_verified ?? true,
        });
      }

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
        books: bookRes.status === 'fulfilled' ? bookRes.value.books : (get().authToken ? [] : state.books),
        portfolio: bookRes.status === 'fulfilled' ? bookRes.value.portfolio : null,
        streakSummary: streakRes.status === 'fulfilled' ? streakRes.value : null,
        wishlist: wishRes.status === 'fulfilled' ? wishRes.value : [],
        lendingRecords: lendRes.status === 'fulfilled' ? lendRes.value : [],
        readingLogs: logsRes.status === 'fulfilled' ? logsRes.value : [],
        alcoveOverview: alcoveRes.status === 'fulfilled' ? alcoveRes.value : state.alcoveOverview,
        notifications: notifRes.status === 'fulfilled' ? notifRes.value.notifications : state.notifications,
        unreadNotificationCount: notifRes.status === 'fulfilled' ? notifRes.value.unread_count : state.unreadNotificationCount,
        dailyGoal: loadedGoal,
        activeBookId: loadedActiveBookId,
        theme: loadedTheme,
        loading: false,
        refreshing: false,
      }));

      if (notifRes.status === 'fulfilled' && notifRes.value) {
        set({
          notifications: notifRes.value.notifications,
          unreadNotificationCount: notifRes.value.unread_count,
        });
      }

      if (forceRefresh) {
        get().addToast('Catalogue refreshed', 'success');
      }
    } catch (err: any) {
      set({ error: err.message || 'Error loading library data', loading: false, refreshing: false });
      get().addToast(err.message || 'Failed to sync library', 'error');
    }
  },

  loadAlcoves: async () => {
    try {
      const overview = await fetchAlcoveOverview();
      set({ alcoveOverview: overview });
    } catch (err: any) {
      console.warn('Could not load Alcove overview:', err);
    }
  },

  loadNotifications: async () => {
    try {
      const res = await fetchNotifications();
      set({ notifications: res.notifications, unreadNotificationCount: res.unread_count });
    } catch (err: any) {
      console.warn('Could not load notifications:', err);
    }
  },

  markNotificationRead: async (notificationId: string) => {
    set((state) => {
      const next = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      return {
        notifications: next,
        unreadNotificationCount: next.filter((n) => !n.is_read).length,
      };
    });
    try {
      await apiMarkNotificationRead(notificationId);
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  },

  markAllNotificationsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadNotificationCount: 0,
    }));
    try {
      await apiMarkAllNotificationsRead();
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
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

  loadReadingLogs: async () => {
    try {
      const logs = await fetchReadingLogs();
      set({ readingLogs: logs || [] });
    } catch (err: any) {
      console.warn('Failed to fetch reading logs:', err);
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
    const prevStreak = get().streakSummary;
    const prevLogs = get().readingLogs;

    // Optimistic update for instant UI feedback
    const optimisticPages = Math.max(0, payload.pages_read || 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const optimisticLog: ReadingLog = {
      log_id: `optimistic-${Date.now()}`,
      book_id: payload.book_id,
      session_date: payload.session_date || todayStr,
      start_page: payload.start_page,
      end_page: payload.end_page,
      pages_read: optimisticPages,
      duration_minutes: payload.duration_minutes ?? 0,
      session_note: payload.session_note,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      readingLogs: [optimisticLog, ...state.readingLogs],
      streakSummary: state.streakSummary
        ? {
            ...state.streakSummary,
            today_pages: (state.streakSummary.today_pages || 0) + optimisticPages,
            streak_at_risk: false,
          }
        : state.streakSummary,
    }));

    try {
      await logReadingSession(payload, token || undefined);
      get().addToast(`Recorded reading session (+${optimisticPages} pages)!`, 'success');
      await Promise.all([get().loadBooks(true), get().loadStreak(), get().loadReadingLogs()]);
    } catch (err) {
      // Revert optimistic update on failure
      set({ streakSummary: prevStreak, readingLogs: prevLogs });
      throw err;
    }
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
