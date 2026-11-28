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
  alcove_id?: string | null;
  held_by_label?: string | null;
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
  book_id?: string | null;
  book_title?: string | null;
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
  freeze_bank_count?: number;
  freeze_max_bank?: number;
  freeze_progress_days?: number;
  freeze_next_tier_required?: number;
  freeze_recovery_active?: boolean;
  grace_freeze_used: boolean;
  grace_freeze_available?: boolean;
  freeze_cooldown_days_left?: number;
  freeze_prior_pages?: number;
  freeze_required_pages?: number;
  frozen_dates?: string[];
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

// ==================== ALCOVES (SHARED HOUSEHOLD LIBRARY) ====================

export interface AlcoveMember {
  user_id: string;
  username: string;
  role: string;
  auto_share: boolean;
  joined_at: string;
}

export interface AlcoveInvite {
  id: string;
  alcove_id: string;
  alcove_name?: string;
  invited_by_username?: string;
  invitee_email: string;
  invite_code: string;
  status: string;
  created_at: string;
}

export interface AlcoveSummary {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  my_role: string;
  my_auto_share: boolean;
  created_at: string;
  members: AlcoveMember[];
  sent_invites: AlcoveInvite[];
}

export interface AlcoveBookItem {
  book_id: string;
  owner_user_id: string;
  owner_username: string;
  alcove_id: string;
  title: string;
  subtitle?: string;
  authors?: string;
  isbn_10?: string;
  isbn_13?: string;
  publisher?: string;
  publication_year?: number;
  language?: string;
  genres: string[];
  cover_url?: string;
  condition: BookCondition;
  location?: string;
  held_by_label?: string | null;
  my_reading_status: ReadingStatus;
  my_current_page: number;
  my_rating?: number | null;
  my_notes?: string | null;
}

export interface AlcoveOverview {
  alcoves: AlcoveSummary[];
  shared_books: AlcoveBookItem[];
  pending_invites_for_me: AlcoveInvite[];
}

export interface AppNotification {
  id: string;
  type: 'alcove_invite' | 'alcove_accepted' | 'alcove_removed' | 'adda_reply' | 'adda_reaction' | 'lending_overdue' | string;
  title: string;
  body: string;
  reference_id?: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unread_count: number;
}

export type AddaPostType = 'note' | 'quote' | 'review' | 'discussion';
export type AddaVisibility = 'public' | 'alcove';
export type AddaReactionType = 'resonated' | 'reading_too' | 'wishlisted';

export interface AddaComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface AddaPost {
  id: string;
  user_id: string;
  username: string;
  post_type: AddaPostType;
  visibility: AddaVisibility;
  alcove_id?: string | null;
  book_id?: string | null;
  book_title?: string | null;
  book_authors?: string | null;
  book_cover_url?: string | null;
  page_number?: number | null;
  content: string;
  has_spoiler: boolean;
  created_at: string;
  reaction_counts: Record<string, number>;
  my_reactions: string[];
  comments: AddaComment[];
}

export interface AddaPostCreate {
  post_type: AddaPostType;
  visibility: AddaVisibility;
  alcove_id?: string;
  book_id?: string;
  book_title?: string;
  book_authors?: string;
  book_cover_url?: string;
  page_number?: number;
  content: string;
  has_spoiler?: boolean;
}

