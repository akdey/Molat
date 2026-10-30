---
name: personal-library-architect
description: Architectural principles, data contracts, and design boundaries for Ondorpata / Molat Personal Book Library.
---

# Personal Library Architect

## Architecture Overview
The application is a private single-owner digital library designed to manage physical books, track reading sessions/streaks, and curate wishlists.

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Zustand + `vite-plugin-pwa` deployed on Vercel.
- **Backend**: Python 3.11 + FastAPI + Pydantic v2 + `httpx` + `cachetools`, containerized for Hugging Face Spaces (port 7860, non-root user UID 1000).
- **Persistent Data Store**: Google Sheets ONLY. No relational DB, No MongoDB, No Supabase.
- **Bridge Protocol**: Container-bound Apps Script Web App (`Code.gs`) with `X-Bridge-Token` or Service Account adapter behind `GoogleSheetsRepository`.

## Core Entities & Worksheets
1. **`Books` (`A1:U1`)**: 21 columns (`book_id`, `title`, `subtitle`, `authors`, `isbn_10`, `isbn_13`, `publisher`, `publication_year`, `language`, `genre`, `cover_url`, `reading_status`, `condition`, `location`, `purchase_price`, `rp`, `purchase_date`, `rating`, `notes`, `created_at`, `updated_at`).
2. **`Reading_Logs` (`A1:I1`)**: 9 columns (`log_id`, `book_id`, `session_date`, `start_page`, `end_page`, `pages_read`, `duration_minutes`, `session_note`, `created_at`).
3. **`Wishlist` (`A1:J1`)**: 10 columns (`wishlist_id`, `title`, `authors`, `isbn_13`, `genre`, `expected_rp`, `target_price`, `priority`, `notes`, `created_at`).

## Invariant Rules
- Never compute row index as permanent ID. Always use stable IDs (`BOOK-XXX`, `LOG-XXX`, `WISH-XXX`).
- Backend implements 300s `TTLCache` with `asyncio.Lock()` to prevent race conditions during write mutations.
- Date calculations for streaks are normalized to `Asia/Kolkata` (IST).

