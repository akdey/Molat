---
name: personal-library-architect
description: Architectural principles, data contracts, and design boundaries for Ondorpata / Molat Personal Book Library.
---

# Personal Library Architect

## Architecture Overview
The application is a private single-owner digital library designed to manage physical books, track reading sessions/streaks, curate wishlists, manage book lending, and provide focused ambient reading environments.

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Zustand + `vite-plugin-pwa` deployed on Vercel.
- **Backend**: Python 3.11 + FastAPI + Pydantic v2 + `httpx` + `cachetools`, containerized for Hugging Face Spaces (port 7860, non-root user UID 1000).
- **Persistent Data Store**: Google Sheets ONLY. No relational DB, No MongoDB, No Supabase.
- **Bridge Protocol**: Container-bound Apps Script Web App (`Code.gs`) with `X-Bridge-Token` or Service Account adapter behind `GoogleSheetsRepository`.
- **On-Device Voice Engine**: Hardware-accelerated browser Web Speech API (`webkitSpeechRecognition`), in-memory fuzzy title matcher, and native `speechSynthesis`. Zero audio or transcripts sent to external servers.
- **Focus Reading Room**: Web Audio API ambient soundscape synthesis (zero bandwidth audio generator for Rain, Library, Cafe, Fireplace, Binaural Beats) with Screen Wake Lock toggle and local session persistence.

## Core Entities & Worksheets
1. **`Books` (`A1:U1`)**: 21 columns (`book_id`, `title`, `subtitle`, `authors`, `isbn_10`, `isbn_13`, `publisher`, `publication_year`, `language`, `genre`, `cover_url`, `reading_status`, `condition`, `location`, `purchase_price`, `rp`, `purchase_date`, `rating`, `notes`, `created_at`, `updated_at`).
2. **`Reading_Logs` (`A1:I1`)**: 9 columns (`log_id`, `book_id`, `session_date`, `start_page`, `end_page`, `pages_read`, `duration_minutes`, `session_note`, `created_at`).
3. **`Wishlist` (`A1:J1`)**: 10 columns (`wishlist_id`, `title`, `authors`, `isbn_13`, `genre`, `expected_rp`, `target_price`, `priority`, `notes`, `created_at`).
4. **`Lending` (`A1:J1`)**: 10 columns (`lending_id`, `book_id`, `borrower_name`, `borrower_contact`, `lent_date`, `due_date`, `returned_date`, `status`, `notes`, `created_at`).

## Invariant Rules
- **Stable IDs**: Never compute row index as permanent ID. Always use stable generated IDs (`BOOK-XXX`, `LOG-XXX`, `WISH-XXX`, `LEND-XXX`).
- **Location Sync on Lending**: Creating a loan automatically updates `Books.location` to `"Lent to {borrower_name}"`. Marking a volume returned automatically restores `Books.location` to `"Home Shelf"`.
- **Cache & Concurrency**: Backend implements 300s `TTLCache` with `asyncio.Lock()` to prevent race conditions during write mutations. Cache is immediately invalidated upon write.
- **Timezone Normalization**: Date calculations for reading streaks and lending overdue computations are normalized to `Asia/Kolkata` (IST).
- **Sanitized Formula Injections**: All cell writes neutralize formula injection attacks (leading `=`, `+`, `-`, `@`).
