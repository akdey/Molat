# ANTIGRAVITY MASTER PROMPT

Read `.agent/skills/personal-library-architect/SKILL.md`, `.agent/skills/anti-vibe-ui-craft/SKILL.md`, `.agent/skills/secure-sheets-engineering/SKILL.md`, `PROJECT_BRIEF.md`, and `IMPLEMENTATION_PLAN.md` in full before writing or modifying any code.

## Non-Negotiable Architectural Rules
1. **No MongoDB / No Paid Databases**: Google Sheets is the sole persistent data store. Do NOT add `pymongo`, `motor`, `supabase`, or `SQLAlchemy`.
2. **Exact 21-Column `Books` Schema (`A1:U1`)**: Must match the live Google Sheet exactly (`book_id`, `title`, `subtitle`, `authors`, `isbn_10`, `isbn_13`, `publisher`, `publication_year`, `language`, `genre`, `cover_url`, `reading_status`, `condition`, `location`, `purchase_price`, `rp`, `purchase_date`, `rating`, `notes`, `created_at`, `updated_at`).
3. **Reading Streak & Session Engine (`Reading_Logs` Tab)**: Implement the append-only `Reading_Logs` worksheet (`log_id`, `book_id`, `session_date`, `start_page`, `end_page`, `pages_read`, `duration_minutes`, `session_note`, `created_at`) and dynamic IST (`Asia/Kolkata`) streak calculation with 1-day grace freeze, 365-day heatmap, reading velocity, and automatic `UNREAD -> READING -> COMPLETED` book status transitions.
4. **Hugging Face Spaces Backend (`backend/`)**: FastAPI + Uvicorn running inside a non-root (`uid 1000`) `Dockerfile` bound to `0.0.0.0:7860`, with `TTLCache(ttl=300)`, `asyncio.Lock()` on writes, `X-Library-Key` mutation auth, and a `/api/v1/books/enrich-covers` endpoint to fill the remaining 24 missing book covers from dedicated HF egress IPs.
5. **Mobile-First PWA Frontend (`frontend/`)**: React + Vite + TypeScript + Tailwind CSS + `vite-plugin-pwa` deployed on Vercel. Must follow the warm archival literary aesthetic (`#FBF9F5` paper, `#1E293B` ink, `#C2410C` terracotta, serif book typography, `2:3` aspect-ratio cover cards with editorial typographic fallbacks for missing covers, and thumb-zone bottom navigation + bottom-sheet quick-log drawer).

## Execution Protocol
- First, inspect the workspace and present a concise Milestone 1 Architecture & File Tree Plan.
- Execute sequentially from Milestone 1 through Milestone 7 in `IMPLEMENTATION_PLAN.md`.
- After each milestone, run build/typecheck/tests and verify responsive rendering across the 6 mandatory viewports (`320x720`, `390x844`, `768x1024`, `1024x768`, `1366x768`, `1600x900`).
