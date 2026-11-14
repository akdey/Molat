# PROJECT BRIEF: Ondorpata / Molat Personal Book Library PWA

## 1. Product Vision & Non-Negotiable Stack
A mobile-first, installable Progressive Web App (PWA) for cataloguing, visually browsing, maintaining, lending, and tracking reading streaks across a personal physical book library with on-device AI voice and focus soundscapes.

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Zustand + `vite-plugin-pwa` + `html5-qrcode` + Web Audio API + Web Speech API, deployed on **Vercel**.
- **Backend**: Python 3.11 + FastAPI + Pydantic v2 + `httpx` + `cachetools`, deployed on **Hugging Face Spaces (Docker runtime, port 7860)**.
- **Database**: **Google Sheets ONLY** (Strictly NO MongoDB, NO Supabase, NO paid cloud database).
- **Zero Cloud Audio / Privacy**: 100% on-device speech recognition, client-side NLP fuzzy parsing, and procedural Web Audio ambient sound synthesis (Rain, Library, Cafe, Fireplace, Binaural Beats).

## 2. Live Google Sheets Schema (4 Tabs)

### Tab 1: `Books` (21 Columns `A1:U1`)
| Col | Header | Type | Notes |
| :--- | :--- | :--- | :--- |
| A | `book_id` | string | Primary key (`BOOK-001`, `BOOK-002`, ...) |
| B | `title` | string | Book title |
| C | `subtitle` | string | Optional subtitle |
| D | `authors` | string | Author name(s) |
| E | `isbn_10` | string | Plain text preserving leading zeros |
| F | `isbn_13` | string | 13-digit standard EAN barcode |
| G | `publisher` | string | Publisher imprint |
| H | `publication_year` | int | Year of publication |
| I | `language` | string | e.g., `English`, `Bengali` |
| J | `genre` | string | Genre classification |
| K | `cover_url` | string | Front dust jacket image URL |
| L | `reading_status` | enum | `UNREAD`, `READING`, `COMPLETED`, `PAUSED`, `ABANDONED` |
| M | `condition` | enum | `New`, `Good`, `Fair`, `Damaged` |
| N | `location` | string | Physical placement (e.g. `Home Shelf`, `Lent to John`) |
| O | `purchase_price` | float | Actual Cost Price (`CP`) paid in INR |
| P | `rp` | float | Verified Retail Price / MRP in INR (`RP`) |
| Q | `purchase_date` | string | `YYYY-MM-DD` or blank |
| R | `rating` | int | Reader rating `1` to `5` |
| S | `notes` | string | Edition notes and personal thoughts |
| T | `created_at` | string | Creation timestamp |
| U | `updated_at` | string | Last modification timestamp |

### Tab 2: `Reading_Logs` (9 Columns `A1:I1` — Append-Only Streak Ledger)
`log_id` | `book_id` | `session_date` | `start_page` | `end_page` | `pages_read` | `duration_minutes` | `session_note` | `created_at`

### Tab 3: `Wishlist` (10 Columns `A1:J1` — Future Acquisitions)
`wishlist_id` | `title` | `authors` | `isbn_13` | `genre` | `expected_rp` | `target_price` | `priority` | `notes` | `created_at`

### Tab 4: `Lending` (10 Columns `A1:J1` — Borrower & Loan History)
`lending_id` | `book_id` | `borrower_name` | `borrower_contact` | `lent_date` | `due_date` | `returned_date` | `status` | `notes` | `created_at`

## 3. Core API Endpoints (FastAPI on Port 7860)
- `GET /api/v1/health`: Returns container status, cache age, and Google Sheet connectivity.
- `GET /api/v1/books`: Returns all books from 300s TTL cache + portfolio financial summary (`total_cp`, `total_rp`, `total_saved`, `discount_pct`).
- `POST /api/v1/books`: Validates ISBN/title, checks duplicates, appends new `BOOK-XXX` to `Books` sheet, invalidates cache.
- `PATCH /api/v1/books/{book_id}`: Updates status, condition, location, rating, or notes by `book_id`.
- `POST /api/v1/books/enrich-covers`: Server-side background job that resolves missing `cover_url` cells via Google Books API -> Apple Books India -> Open Library `cover_i`.
- `GET /api/v1/reading/streak-summary`: Computes `current_streak_days`, `longest_streak_days`, `streak_at_risk`, `today_pages`, `daily_goal_pages`, `reading_velocity`, and `heatmap_365` in `Asia/Kolkata` timezone.
- `POST /api/v1/reading/logs`: Appends a reading session to `Reading_Logs` and auto-transitions `Books.reading_status` (`UNREAD` -> `READING`, or `COMPLETED` if finished).
- `GET /api/v1/wishlist` & `POST /api/v1/wishlist/{wishlist_id}/acquire`: Manages wishlist and one-click migration into `Books`.
- `GET /api/v1/lending`: Returns active and past loans, overdue calculations, and borrower contacts.
- `POST /api/v1/lending`: Appends a new loan record and automatically synchronizes `Books.location` to `"Lent to {borrower_name}"`.
- `PATCH /api/v1/lending/{lending_id}/return`: Marks loan as `RETURNED`, records `returned_date`, and restores `Books.location` to `"Home Shelf"`.
