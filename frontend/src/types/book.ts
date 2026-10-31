export type ReadingStatus = 'UNREAD' | 'READING' | 'COMPLETED' | 'PAUSED' | 'ABANDONED';
export type BookCondition = 'New' | 'Good' | 'Fair' | 'Damaged';

export interface Book {
  book_id: string;
  title: string;
  subtitle?: string;
  authors?: string;
  isbn_10?: string;
  isbn_13?: string;
  publisher?: string;
  publication_year?: number;
  language?: string;
  genre?: string;
  cover_url?: string;
  reading_status: ReadingStatus;
  condition: BookCondition;
  location?: string;
  purchase_price?: number; // Cost Price (CP)
  rp?: number;             // Retail Price / MRP
  purchase_date?: string;  // YYYY-MM-DD
  rating?: number;         // 1 to 5
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  total_cp: number;
  total_rp: number;
  total_saved: number;
  discount_pct: number;
  total_books: number;
}

export interface BookListResponse {
  books: Book[];
  portfolio: PortfolioSummary;
}

export interface ReadingLog {
  log_id: string;
  book_id: string;
  session_date: string;
  start_page: number;
  end_page: number;
  pages_read: number;
  duration_minutes: number;
  session_note?: string;
  created_at: string;
}

export interface ReadingLogCreate {
  book_id: string;
  session_date?: string;
  start_page: number;
  end_page: number;
  pages_read?: number;
  duration_minutes?: number;
  session_note?: string;
  finished_book?: boolean;
  rating?: number;
}

export interface StreakSummary {
  current_streak_days: number;
  longest_streak_days: number;
  streak_at_risk: boolean;
  today_pages: number;
  daily_goal_pages: number;
  grace_freeze_used: boolean;
  reading_velocity_pages_per_day: number;
  heatmap_365: Record<string, number>;
}

export interface WishlistItem {
  wishlist_id: string;
  title: string;
  authors?: string;
  isbn_13?: string;
  genre?: string;
  expected_rp?: number;
  target_price?: number;
  priority: string;
  notes?: string;
  created_at: string;
}

export interface WishlistAcquirePayload {
  purchase_price?: number;
  condition?: BookCondition;
  location?: string;
}

export type LendingStatus = 'ACTIVE' | 'RETURNED';

export interface LendingRecord {
  lending_id: string;
  book_id: string;
  borrower_name: string;
  borrower_contact?: string;
  lent_date: string;
  due_date?: string;
  returned_date?: string;
  status: LendingStatus;
  notes?: string;
  created_at?: string;
  book_title?: string;
  book_authors?: string;
  book_cover_url?: string;
  is_overdue?: boolean;
  days_lent?: number;
}

export interface LendingRecordCreate {
  book_id: string;
  borrower_name: string;
  borrower_contact?: string;
  lent_date?: string;
  due_date?: string;
  notes?: string;
}

export interface LendingRecordReturn {
  return_location?: string;
  notes?: string;
}

