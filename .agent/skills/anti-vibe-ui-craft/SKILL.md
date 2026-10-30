---
name: anti-vibe-ui-craft
description: Design system, UI craftsmanship, PWA ergonomics, and mobile-first responsive engineering standards for literary and library applications. Use when designing, styling, or reviewing web frontends to avoid generic AI aesthetics and ensure mobile-first responsiveness across 6 viewports.
---

# Anti-Vibe UI Craft (Mobile-First PWA Edition)
Design system principles, PWA engineering rules, and responsive standards engineered to prevent generic "AI vibe-coded" interfaces, prioritizing tactile literary character and thumb-zone mobile ergonomics on Vercel.

## 1. Aesthetic Constraints (Strictly Prohibited)
- **No Generic AI Palettes**: Eliminate neon purple/blue gradients (`from-indigo-500 to-purple-600`), glowing cyan borders, and indiscriminate glassmorphism (`backdrop-blur` on every card).
- **No Floating Visual Clutter**: Avoid oversized blurred drop shadows, floating decorative blobs, and synthetic activity feeds.
- **No Empty Space Wastage**: Never push the book collection or streak action below the fold with giant marketing hero headers.
- **No Non-Functional Facades**: Every filter chip, sort dropdown, streak logger, and edit drawer must be wired to real Zustand / FastAPI state.

## 2. Literary Art Direction ("Ondorpata / Molat" Editorial Identity)
### Warm Archival Color Tokens
- **Background Primary (Warm Ivory Paper)**: `#FBF9F5` (Dark mode: `#121316` Deep Charcoal Ink)
- **Surface / Card Base (Archival Cream)**: `#F4EFE6` (Dark mode: `#1A1D24`)
- **Border / Hairline Divider**: `#E2D9C8` (Dark mode: `#2A2F3A`)
- **Text Primary (Deep Ink Slate)**: `#1E293B` (Dark mode: `#F1F5F9`)
- **Text Secondary (Muted Graphite)**: `#475569` (Dark mode: `#94A3B8`)
- **Primary Accent (Terracotta Bookcloth)**: `#C2410C` / `#D97706`
- **Streak / Reading Active Accent (Forest Binding Green)**: `#15803D`

### Typography Scale
- **Headings & Book Titles**: Refined editorial serif (`Newsreader`, `Playfair Display`, `Lora`, or `Georgia`).
- **UI Controls, Metadata & Financial Figures**: Clean humanist sans-serif (`Inter` or `Plus Jakarta Sans`) with `tabular-nums` for ₹ price and page streak counters.

### Physical Book Proportions & Typographic Fallbacks
- Lock all book cover containers strictly to `aspect-[2/3]` (1:1.5) so layout shift (CLS) is `0.00` while covers stream.
- Guard against 1x1 transparent pixel responses (`img.naturalWidth <= 1`).
- For Indian paperback titles lacking external cover URLs, render an intentional **Editorial Typographic Cover** (bound left spine border `border-l-4 border-[#C2410C]`, serif title, subtle divider rule, uppercase author footer) rather than a generic gray "No Image" icon.

## 3. PWA & Mobile-First Engineering (Vercel Deployment)
### Installable PWA (`vite-plugin-pwa`)
- Configure `manifest.webmanifest` with `display: "standalone"`, `orientation: "portrait"`, `theme_color: "#FBF9F5"`, `background_color: "#FBF9F5"`, and app icons (`192x192`, `512x512`, maskable).
- Configure Workbox runtime caching:
  - `StaleWhileRevalidate` for `/api/v1/books` and `/api/v1/reading/streak-summary` (instant offline shelf & streak browsing).
  - `CacheFirst` (30-day expiration, max 200 entries) for `covers.openlibrary.org`, `books.google.com`, and `mzstatic.com` book jackets.

### Thumb-Zone Mobile Ergonomics
- **Sticky bottom navigation bar** (`h-16`, `pb-[env(safe-area-inset-bottom)]`) on mobile viewports (`<768px`) with 5 core destinations: Home, Shelf, + Scan/Log (Center Action), Streak, Maintenance.
- **Minimum touch target size of 44x44px** on all interactive buttons, filter pills, and page-increment steppers.
- **Bottom-sheet drawers** for Quick Reading Session Logging (`+5p`, `+10p`, `+25p` one-tap presets or End Page slider) and ISBN Camera Scanning so mobile keyboards never obscure inputs.

## 4. Six Mandatory Responsive Viewports
Every screen must be verified across these 6 viewports without horizontal overflow or clipped controls:
1. **Small Mobile (320x720)**: 2-column compact cover grid (`gap-2.5`), bottom nav, collapsible search bar.
2. **Typical Mobile (390x844)**: 2-column cover grid (`gap-3`), 1-tap streak banner, bottom sheet modals.
3. **Tablet Portrait (768x1024)**: 4-column cover grid, left rail navigation, slide-over book detail drawer.
4. **Small Laptop / Tablet Landscape (1024x768)**: 5-column cover grid, persistent filter bar, split detail view.
5. **Laptop (1366x768)**: 6-column cover grid or wooden spine shelf view, persistent sidebar + financial summary strip.
6. **Wide Desktop (1600x900)**: Max-width container (`max-w-7xl mx-auto`), 7-column grid, side-by-side inspection panel.

## 5. Reading Streak & Tracking UI Components
- **Compact Streak Header Pill**: Displays active streak count (🔥 4 Days), today's progress (18 / 20 pages), and a pulsing amber dot when `streak_at_risk == true` (not yet logged today in IST).
- **Quick-Log Bottom Sheet**: Opens in <150ms from any screen; defaults to the currently active READING book (*The Fourth Protocol*), shows last logged page, and offers one-tap `+10` pages, `+20` pages, or exact `current_page` input.
- **365-Day Reading Heatmap**: 52-week x 7-day responsive grid using 5 archival green/amber intensity steps (0 pages, 1-10p, 11-25p, 26-50p, 50+p) with touch tooltips.
