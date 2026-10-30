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
