# IMPLEMENTATION PLAN (7 Milestones)

## Milestone 1: Monorepo & Google Sheets Bridge Setup
- Scaffold `backend/` (FastAPI, Python 3.11, `Dockerfile` on port 7860) and `frontend/` (React + Vite + TS + Tailwind + `vite-plugin-pwa`).
- Finalize `apps-script/Code.gs` container-bound bridge supporting `Books` (`A1:U1`), `Reading_Logs` (`A1:I1`), and `Wishlist` (`A1:J1`) with `X-Bridge-Token` authentication.

## Milestone 2: FastAPI Repository, Caching & Cover Enrichment
- Implement `GoogleSheetsRepository` with 300s `TTLCache`, `asyncio.Lock()` write serialization, formula-injection sanitization, and `X-Library-Key` middleware.
- Implement `POST /api/v1/books/enrich-covers` using Google Books API -> Apple Books India -> Open Library `cover_i` fallback to populate missing `cover_url` cells from HF Spaces.

## Milestone 3: Reading Streak & Session Analytics Engine
- Implement `POST /api/v1/reading/logs` and `GET /api/v1/reading/streak-summary` with `Asia/Kolkata` date normalization, current/longest streak calculation, 1-day grace freeze, 365-day heatmap dictionary, and reading velocity ETA.

## Milestone 4: Anti-Vibe Literary Design System & Visual Bookshelf
- Build the archival theme (`#FBF9F5` / `#121316`), `<BookCover />` component with `aspect-[2/3]`, `1x1` pixel guard, and typographic cover fallback.
- Build the Collection screen with instant local search, multi-facet filters, Grid / Spine Shelf / Financial Table views, and Book Detail slide-over drawer.

## Milestone 5: Mobile-First Streak UI & Quick-Log Bottom Sheet
- Build the Home Dashboard with the Streak Banner, Active Reading Card (*The Fourth Protocol*), Portfolio Savings KPI strip (`CP` vs `RP`), Quick-Log Bottom Sheet (`+5p`, `+10p`, `+25p`), and 365-Day Reading Heatmap screen.

## Milestone 6: Camera ISBN Scanner, Wishlist & Maintenance Audit
- Integrate `html5-qrcode` barcode scanner modal with `/api/v1/metadata/lookup`, duplicate ISBN detection, Wishlist "Mark as Purchased" migration, and Maintenance filter view.

## Milestone 7: PWA Offline Caching, Viewport Audit & Deployment Configs
- Configure `vite-plugin-pwa` (`manifest.webmanifest`, Workbox runtime caching), `vercel.json` SPA rewrites, and Hugging Face Spaces `Dockerfile` + `README.md` YAML header.
