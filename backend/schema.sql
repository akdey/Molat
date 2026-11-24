-- ============================================================================
-- Molat Personal Book Library - Multi-User PostgreSQL Schema (Supabase)
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default owner seed
INSERT INTO users (id, username, display_name)
VALUES ('owner', 'admin', 'Library Owner')
ON CONFLICT (id) DO NOTHING;

-- 2. Books Table (Scoped to user_id)
CREATE TABLE IF NOT EXISTS books (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    authors VARCHAR(500),
    isbn_10 VARCHAR(20),
    isbn_13 VARCHAR(20),
    publisher VARCHAR(255),
    publication_year INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    genre VARCHAR(100),
    cover_url TEXT,
    reading_status VARCHAR(50) DEFAULT 'UNREAD',
    condition VARCHAR(50) DEFAULT 'Good',
    location VARCHAR(100) DEFAULT 'Home Shelf',
    purchase_price NUMERIC(10, 2) DEFAULT 0.0,
    rp NUMERIC(10, 2) DEFAULT 0.0,
    purchase_date VARCHAR(20),
    rating INTEGER,
    notes TEXT,
    created_at VARCHAR(50),
    updated_at VARCHAR(50),
    PRIMARY KEY (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_books_user_status ON books(user_id, reading_status);
CREATE INDEX IF NOT EXISTS idx_books_user_genre ON books(user_id, genre);
CREATE INDEX IF NOT EXISTS idx_books_user_isbn ON books(user_id, isbn_13);

-- 3. Reading Logs Table (Scoped to user_id)
CREATE TABLE IF NOT EXISTS reading_logs (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_id VARCHAR(50) NOT NULL,
    book_id VARCHAR(50) NOT NULL,
    session_date VARCHAR(20) NOT NULL,
    start_page INTEGER DEFAULT 0,
    end_page INTEGER DEFAULT 0,
    pages_read INTEGER NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    session_note TEXT,
    created_at VARCHAR(50),
    PRIMARY KEY (user_id, log_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_logs_user_date ON reading_logs(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_reading_logs_user_book ON reading_logs(user_id, book_id);

-- 4. Wishlist Table (Scoped to user_id)
CREATE TABLE IF NOT EXISTS wishlist (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wishlist_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    authors VARCHAR(500),
    isbn_13 VARCHAR(20),
    genre VARCHAR(100),
    expected_rp NUMERIC(10, 2),
    target_price NUMERIC(10, 2),
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    notes TEXT,
    created_at VARCHAR(50),
    PRIMARY KEY (user_id, wishlist_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

-- 5. Lending Table (Scoped to user_id)
CREATE TABLE IF NOT EXISTS lending (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lending_id VARCHAR(50) NOT NULL,
    book_id VARCHAR(50) NOT NULL,
    borrower_name VARCHAR(100) NOT NULL,
    borrower_contact VARCHAR(100),
    lent_date VARCHAR(20) NOT NULL,
    due_date VARCHAR(20),
    returned_date VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    notes TEXT,
    created_at VARCHAR(50),
    PRIMARY KEY (user_id, lending_id)
);

CREATE INDEX IF NOT EXISTS idx_lending_user_status ON lending(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lending_user_book ON lending(user_id, book_id);

-- 6. User Settings Table (Scoped to user_id)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_goal_pages INTEGER DEFAULT 15,
    active_book_id VARCHAR(50),
    theme VARCHAR(20) DEFAULT 'light',
    updated_at VARCHAR(50)
);

-- Default settings seed for owner
INSERT INTO user_settings (user_id, daily_goal_pages, theme)
VALUES ('owner', 15, 'light')
ON CONFLICT (user_id) DO NOTHING;
