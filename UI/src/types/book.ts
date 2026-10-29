export type OwnershipStatus = 'Owned' | 'Wishlist' | 'Borrowed';
export type ReadingStatus = 'Unread' | 'Reading' | 'Completed' | 'Abandoned';
export type Condition = 'New' | 'Good' | 'Fair' | 'Damaged' | 'Unknown';

export interface Book {
  book_id: string;
  title: string;
  subtitle?: string;
  author?: string;
  isbn_13?: string;
  isbn_10?: string;
  publisher?: string;
  publication_year?: number;
  language?: string;
  genre?: string;
  ownership_status: OwnershipStatus;
  reading_status: ReadingStatus;
  current_page?: number;
  total_pages?: number;
  purchase_price?: number;
  retail_price?: number;
  purchase_date?: string;
  purchase_source?: string;
  condition: Condition;
  shelf_location?: string;
  loaned_to?: string;
  loan_date?: string;
  expected_return_date?: string;
  personal_rating?: number;
  notes?: string;
  cover_url?: string;
  cover_source?: string;
  metadata_verified?: boolean;
  created_at: string;
  updated_at: string;
  row_version?: number;
}

export interface BookFilters {
  search: string;
  ownership_status?: OwnershipStatus;
  reading_status?: ReadingStatus;
  genre?: string;
  condition?: Condition;
  shelf_location?: string;
  on_loan?: boolean;
  missing_cover?: boolean;
  missing_metadata?: boolean;
}

export type BookSortField =
  | 'title'
  | 'author'
  | 'created_at'
  | 'purchase_date'
  | 'purchase_price'
  | 'reading_status'
  | 'personal_rating';

export interface BookSort {
  field: BookSortField;
  direction: 'asc' | 'desc';
}
