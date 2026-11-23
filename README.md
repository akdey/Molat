# Molat (মলাট) — Personal Library & Reading Streak PWA

[![Frontend Build](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat&logo=vercel)](https://molat-akdey.vercel.app)
[![Backend API](https://img.shields.io/badge/Hugging%20Face-Spaces-FFD21E?style=flat&logo=huggingface)](https://huggingface.co/spaces/a-k-dey/Molat)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat&logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets-34A853?style=flat&logo=googlesheets)](https://www.google.com/sheets/about/)
[![Zero Billing](https://img.shields.io/badge/Cloud%20Cost-%240.00%2Fmo-brightgreen?style=flat)](#-zero-billing-philosophy)

> **Engineered by [AMIT KUMAR DEY](https://portfolio.akdey.vercel.app/)**

---

## 📖 About Molat

**Molat (মলাট)** is a Bengali literary word meaning **the protective outer jacket or cover of a book**.

Most book tracking tools today are either bloated social networks, proprietary walled gardens with paid subscriptions, or clunky spreadsheet setups. Molat was created for readers and physical book collectors who want:

1. **A beautiful, tactile digital twin of their physical bookshelf** that feels like browsing a private library.
2. **Habit-forming reading accountability** inspired by Duolingo-style streaks and GitHub-style contribution heatmaps.
3. **Total ownership of their data** with **zero ongoing cloud costs**, using **Google Sheets as the database**.

Whether cataloguing a multi-hundred volume collection, scanning new arrivals at a bookshop with your phone's camera, or celebrating a 30-day continuous reading streak, Molat gives you a private, lightning-fast, and distraction-free home for your library.

---

## ✨ Features

### 🎙️ 100% On-Device AI Voice Assistant (Hold-to-Talk)
- **Hold-to-Talk Siri-Style Gesture**: Press and hold the elevated center `+` button from anywhere in the app to activate the ambient AI assistant with tactile haptic feedback.
- **Zero Cloud & Zero Cost (0ms Latency)**: Runs 100% locally on your device using the browser's hardware-accelerated Web Speech API and an in-memory fuzzy title matching engine. Zero audio or transcripts sent to external servers.
- **Natural Pause Processing**: Waits naturally until you finish speaking and pause before taking action, keeping the interface completely quiet and unobtrusive.
- **Hands-Free Reading Log Submissions**: Say *"Log reading for The Fourth Protocol from page 45 to 80"* or *"Read 35 pages of Atomic Habits"*—automatically matches the volume, calculates pages read, updates the Google Sheets ledger, and advances your streak.
- **Voice-Activated Focus Reading Launch**: Say *"Start focus timer"*, *"Start focus room"*, or *"Focus on Dune"*—the assistant automatically opens the Focus Reading Room for that volume with ambient soundscapes and battery-saving timers.
- **Physical Shelf Locator**: Say *"Where is Dune?"* to immediately locate the exact room and shelf rack without browsing menus.
- **Atmospheric Gradient Overlay**: Rises smoothly as an organic, borderless dark-to-fade veil with dancing equalizer bars, real-time transcript streaming, a *"What Molat Understood"* confirmation card, and interactive suggestion chips.
- **Native Spoken Audio Feedback**: Confirms actions aloud using your device's built-in text-to-speech engine (`speechSynthesis`).

### ⏱️ Ambient Reading Focus Room ("Focus Room")
- **Distraction-Free Reading Companion**: A serene, full-screen reading sanctuary with a minimalist stopwatch timer (`00:24:18`) designed for physical book reading sessions.
- **Concurrent Multi-Volume Reading & In-Modal Switcher**: Seamlessly juggle daytime non-fiction and evening literature. Switch between active reading volumes directly inside the Focus Room header or Home Dashboard with automatic start-page synchronization.
- **Zero Battery Drain by Default (Normal Sleep)**: Built with battery preservation as a first-class priority. Defaults to Normal Sleep so your phone can lock and sleep normally with **0% extra battery drain**—no active background CPU loops or wake-lock power waste.
- **Wall-Clock Epoch Arithmetic**: Solves the browser backgrounding drift problem. Calculates elapsed duration via wall-clock timestamps (`Date.now() - startTime - pausedMs`) re-synchronized on `visibilitychange` and window `focus`. Even if your phone is locked or asleep for an hour, the timer remains 100% accurate down to the exact second when unlocked.
- **Self-Cleaning Ephemeral Storage**: Active sessions are safely mirrored under a single constant key in `localStorage` (`molat_active_focus_session_v1`) to survive accidental browser tab restarts. Automatically self-purges sessions older than 24 hours to prevent stale storage accumulation, and deletes immediately upon logging or discarding.
- **Physical Bookmark Page Logging (No Guessing)**: Pre-fills your starting page with your latest bookmark + 1 from database logs, asks for your ending bookmark page upon finishing, and deterministically computes pages read, reading velocity ($\text{pgs/min}$), and pace ($\text{min/page}$) before saving directly to Google Sheets with a 4-second Undo buffer.
- **Timer-Synchronized Web Audio Soundscapes (8 Synthesizers)**: 100% offline, on-device ambient synthesizers including *Soft Rain on Glass*, *Cozy Fireplace Crackle*, *Warm Cafe Murmur*, *Rolling Ocean Waves*, *Forest Breeze & Soft Chirps*, *Summer Night Crickets*, and *Deep Brown Noise* (1/f² low-frequency focus waterfall). Pausing or resuming the reading timer cleanly freezes/thaws audio synthesis with 0% CPU overhead. Defaults to pure silence (mute).
- **Optional Desk Clock Mode (Screen Wake Lock)**: Toggleable Screen Wake Lock (`navigator.wakeLock`) keeps the display awake beside your book as an ambient desk clock when desired.

### 📖 Concurrent Multi-Volume Reading (Dual Active Reads)
- **Multi-Book Volume Switcher Tabs**: When juggling multiple books simultaneously (e.g. daytime technical study and bedtime mystery), the Home Dashboard renders dedicated tabs (`#1`, `#2`) with real-time active indicators, independent progress, and velocity tracking.
- **One-Tap Direct Actions**: Each active reading book features dedicated, one-tap `Focus` and `Log Pages` buttons right from the Home Dashboard without hunting through your library.
- **In-Modal Volume Switcher**: Switch the target book on the fly inside the Focus Reading Room or Quick Log Modal with automatic historical page synchronization and confirmation guards.
- **Smart Recency Defaulting**: Automatically remembers and prioritizes the volume you engaged with most recently for instant voice commands (*"Start focus timer"*), quick logs, and focus sessions.

### 🎲 "Pick My Next Read" (TBR Randomizer)
- **Zero Decision Fatigue**: Algorithmic selection tool that picks your next book from your unread shelf.
- **1-Click Reading Transition**: Start reading the chosen volume with a single click, transitioning its status to `READING` and opening today's progress ledger.
- **Multi-Point Access**: Available from the top navigation menu, the Bookshelf screen, or by asking the Voice Assistant (*"What should I read next?"*).

### 📱 Progressive Web App (PWA) with Offline Capabilities
- **Installable Native App Experience**: Install Molat directly to your iOS or Android home screen or desktop with a single tap.
- **Offline Caching**: Built with Workbox service workers to precache core assets and jacket images (`CacheFirst` for book jackets, `StaleWhileRevalidate` for library APIs).
- **Mobile Ergonomics**: Thumb-zone bottom navigation bar, haptic vibration feedback, pull-to-refresh, and smooth gesture transitions.

### 📷 Instant Camera ISBN Barcode Scanner
- **Live Optical Barcode Detection**: Point your device's camera at any standard book barcode (EAN-13 / ISBN-13 / UPC-A).
- **Multi-Source Metadata Auto-Fill**: Automatically queries Open Library, Google Books, and Apple Books to populate title, subtitle, author(s), genre, and high-resolution cover artwork.
- **Laser Viewfinder**: Real-time camera viewfinder targeting the rear environment autofocus lens with haptic feedback when a barcode is locked.

### 📚 Three Visual Shelf Browsing Modes
- **Cover Grid**: High-resolution dust jackets with subtle 3D spine depth, tactile tilt angles, and quick-access volume inspection drawers.
- **Physical Spine View**: An interactive virtual bookshelf rendering proportional book heights, spine widths, and embossed titles scaled dynamically according to page counts.
- **Financial Portfolio Ledger**: A detailed financial table calculating your total investment (`Cost Price`), retail market value (`MRP`), net savings in INR (₹), and volume discount percentages with multi-column sorting.

### 🔥 Duolingo-Style Reading Streak Tracker
- **Timezone-Aware Calculations**: Daily streak engine running in `Asia/Kolkata` time.
- **Active Reading Progress Card**: Displays current reading session progress, daily goal completion, and automated reading velocity (pages/day).
- **Customizable Daily Goal & In-UI Editor**: Easily tweak your daily reading target directly from the Home Dashboard Streak Banner (default reduced to an approachable 15 pages). Includes 1-tap quick presets (`10`, `15`, `20`, `25`, `30`, `50` pages) or custom input with direct cross-device Google Sheets database synchronization (`Settings` worksheet), dynamically recalculating completion percentages, reading velocity, and adaptive freeze thresholds across all your devices.
- **Cross-Device Reading Settings & Active Book Sync**: Personal settings (`daily_goal_pages`, `active_book_id`, `theme`) are saved directly in your Google Sheets database via the `/api/v1/settings` endpoint. Switching between phone, tablet, and desktop automatically loads your current active book and reading target without missing a beat.
- **Adaptive Grace Freeze Bridging**: Automatically cushions an accidental streak loss if life gets busy, provided you maintained momentum earlier in the week ($\ge 5 \times \text{daily\_goal}$ pages read in prior 7 days, min 20 pages; up to 1 freeze per 14-day rolling window). Tracks all historical and active `frozen_dates`.
- **Streak-At-Risk Alerts**: Visual ambient warnings when today's reading goal hasn't been logged yet.
- **365-Day Contribution Heatmap**: Interactive GitHub-style reading heatmap mapping page count intensity across every day of the calendar year.

### 🎯 Acquisitions Wishlist
- **Budget & Purchase Planning**: Track books you want to purchase, setting budget target prices alongside retail MRP.
- **1-Click Shelf Acquisition**: When you purchase a book from your wishlist, a single click moves it into your active library (`Books` tab), records the actual purchase price and condition, and archives the wishlist item.

### 🤝 Personal Book Lending & Borrower Ledger
- **Volume Loan Tracking**: Keep track of books lent to friends, colleagues, or family with borrower contact, loan notes, lent date, and expected due date.
- **Dynamic Overdue Computation**: Timezone-aware overdue tracking (`Asia/Kolkata`) with ambient overdue alert badges.
- **Automated Shelf Location Sync**: Lending a volume automatically synchronizes the book's physical location to `"Lent to {borrower_name}"` across the catalogue; marking it returned instantly restores its location to `"Home Shelf"`.
- **1-Click WhatsApp Follow-up**: Generates prefilled, friendly literary WhatsApp reminders (`https://wa.me/...`) directly from the loan card to ping the borrower.
- **Multi-Point Access**: Access via the dedicated **Lent Out** sub-tab in the Bookshelf, from the mobile center `+` action drawer, or straight from any book's details panel.

### 🖼️ Multi-Tier Automated Cover Enrichment
- **7-Tier Fallback Waterfall**:
  1. Google Books (ISBN-13 / ISBN-10)
  2. Google Books (Title + Author)
  3. Apple Books India (`country=IN`, high-res 600x600 artwork)
  4. Apple Books Global (`country=US` fallback)
  5. Open Library (ISBN `cover_i`)
  6. Open Library (Title + Author)
  7. Direct Open Library Jacket Endpoint
- **Quality Guard**: Automatically detects and rejects 1x1 transparent tracking pixels, blank placeholders, or broken URLs.

### 📊 Deep Library Analytics & Literary Insights
- **Title Anatomy & Recurring Thematic Motifs**: On-device NLP tokenization across all titles extracting subconscious literary keywords (`#Death`, `#Secret`, `#Protocol`, `#Shadow`, etc.) with recurring counts and average title word lengths without manual tagging.
- **Historical Publication Eras & Library Age**: Real-time analysis of publication years calculating the median age of your physical library, highlighting the oldest print volume vs. newest release, and mapping volumes across historical eras (Classics/Pre-2000, 2000s, 2010s, Contemporary 2020s).
- **Library Growth & Acquisition Waves**: Chronological histogram tracking when volumes entered your collection, pinpointing peak acquisition epochs alongside your total physical portfolio replacement worth and lifetime savings.
- **Category Donut & Tsundoku Backlog**: Visual breakdown of literary genres and reading lifecycle states (Completed, Reading, Unread).

### 🎨 Anti-Vibe Editorial Design
- **Literary Palette**: Oxford Navy (`#1E3A8A`), warm ivory surfaces (`#FBF9F5`), muted borders, and quiet typography avoiding generic AI aesthetics.
- **Dark Mode Support**: Seamless toggle between warm paper daylight and low-contrast midnight obsidian themes.

### 🔒 Privacy & Passkey Protection
- **Passkey-Guarded Admin Actions**: Public visitors can browse your library and stats in read-only mode; book creation, edits, log submissions, and wishlist mutations require your secret `X-Library-Key`.
- **Sanitized Formula Injections**: All cell writes neutralize formula injection attacks (leading `=`, `+`, `-`, `@`).
- **Zero Telemetry**: No third-party trackers, analytics, or cookies.

---

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph Client["Mobile & Desktop Browser (PWA)"]
        UI["React 18 + Vite + Tailwind CSS"]
        Scanner["Camera Barcode Scanner (Html5Qrcode)"]
        SW["Service Worker (Workbox Offline Cache)"]
    end

    subgraph CloudAPI["Backend Services (Hugging Face Spaces)"]
        API["FastAPI 0.115+ (Python 3.11)"]
        Cache["TTLCache (300s Invalidation Engine)"]
        Enricher["Multi-Tier Cover Enricher"]
        Streak["Streak & Ledger Engine (Asia/Kolkata)"]
    end

    subgraph Metadata["External Metadata Providers"]
        GB["Google Books API"]
        AB["Apple Books (IN + US)"]
        OL["Open Library API"]
    end

    subgraph Storage["Zero-Billing Storage"]
        Bridge["Google Apps Script Web App Bridge"]
        Sheets[("Google Sheets Spreadsheet\n• Books (21 cols)\n• Reading_Logs (9 cols)\n• Wishlist (10 cols)\n• Lending (10 cols)")]
    end

    UI <-->|REST API + Bearer Auth| API
    Scanner -.->|Auto-Lookup Metadata| GB & OL & AB
    API <-->|In-Memory Cache| Cache
    API -->|Async Enrichment Waterfall| Enricher
    Enricher -.->|Query Covers| GB & AB & OL
    API --> Streak
    API <-->|Signed HTTPS Post/Get| Bridge
    Bridge <-->|SpreadsheetApp API| Sheets
```

---

## 📊 Live Google Sheets Database Contract

Molat connects to a single Google Spreadsheet containing four dedicated tabs:

### 1. `Books` Tab (21 Columns)
The catalog of all physical volumes owned in your personal library.

| Col | Header | Type | Description |
|:---:|:---|:---:|:---|
| **A** | `book_id` | string | Unique primary key (`BOOK-001`, `BOOK-002`, ...) |
| **B** | `title` | string | Main title of the volume |
| **C** | `subtitle` | string | Subtitle or volume name (optional) |
| **D** | `authors` | string | Primary and contributing authors |
| **E** | `isbn_10` | string | 10-digit ISBN (stored as text with leading zeros) |
| **F** | `isbn_13` | string | 13-digit standard EAN barcode |
| **G** | `publisher` | string | Publisher imprint or press |
| **H** | `publication_year`| int | Year of publication |
| **I** | `language` | string | Language (e.g., `English`, `Bengali`) |
| **J** | `genre` | string | Primary genre classification |
| **K** | `cover_url` | string | Direct URL to front dust jacket image |
| **L** | `reading_status` | enum | `UNREAD` \| `READING` \| `COMPLETED` \| `PAUSED` \| `ABANDONED` |
| **M** | `condition` | enum | `New` \| `Good` \| `Fair` \| `Damaged` |
| **N** | `location` | string | Physical shelf placement (e.g., `Home Shelf`, `Lent to John`) |
| **O** | `purchase_price`| float | Actual cost paid in INR (`CP`) |
| **P** | `rp` | float | Retail printed MRP in INR (`RP`) |
| **Q** | `purchase_date` | string | Date acquired (`YYYY-MM-DD`) |
| **R** | `rating` | int | Reader score from `1` to `5` |
| **S** | `notes` | string | Personal notes, acquisition stories, or edition details |
| **T** | `created_at` | string | Creation timestamp |
| **U** | `updated_at` | string | Last modification timestamp |

### 2. `Reading_Logs` Tab (9 Columns)
An append-only log recording every reading session to power the streak engine:
`log_id` · `book_id` · `session_date` · `start_page` · `end_page` · `pages_read` · `duration_minutes` · `session_note` · `created_at`

### 3. `Wishlist` Tab (10 Columns)
Future acquisitions and budget planning:
`wishlist_id` · `title` · `authors` · `isbn_13` · `genre` · `expected_rp` · `target_price` · `priority` · `notes` · `created_at`

### 4. `Lending` Tab (10 Columns)
Borrower contracts, due date calculations, and loan history:
`lending_id` · `book_id` · `borrower_name` · `borrower_contact` · `lent_date` · `due_date` · `returned_date` · `status` · `notes` · `created_at`

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+** with `uv` or `pip`
- **Node.js 18+** with `npm`
- A Google account (for Google Sheets & Apps Script)

---

### 1. Google Sheets & Apps Script Setup

1. Create a new Google Spreadsheet in Google Drive (e.g. named `Molat Library`).
2. Rename the first sheet tab to `Books`.
3. Open **Extensions** $\to$ **Apps Script**.
4. Paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs) into the editor.
5. *(Optional)* Go to **Project Settings** $\to$ **Script Properties** and add `BRIDGE_TOKEN` with a secret passphrase.
6. Click **Deploy** $\to$ **New Deployment** $\to$ Select type: **Web App**:
   - **Execute as**: *Me*
   - **Who has access**: *Anyone*
7. Copy the generated Web App URL (`https://script.google.com/macros/s/.../exec`).

---

### 2. Backend Setup (FastAPI)

```bash
# Clone the repository
git clone https://github.com/akdey/Molat.git
cd Molat/backend

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate
uv pip install -e .

# Configure environment variables
cp .env.example .env  # edit with your values
```

#### `.env` Configuration:
```env
GOOGLE_SHEETS_BRIDGE_URL=https://script.google.com/macros/s/YOUR_BRIDGE_ID/exec
BRIDGE_TOKEN=your-optional-bridge-token
LIBRARY_KEY=your-admin-passkey-here
PORT=7860
CACHE_TTL_SECONDS=300
CORS_ORIGINS=["http://localhost:5173","https://molat-akdey.vercel.app"]
```

#### Run Backend Server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 7860 --reload
```
API Documentation will be available at `http://localhost:7860/docs`.

#### Run Backend Test Suite:
```bash
pytest -v
# 33 passed in 0.44s
```

---

### 3. Frontend Setup (React PWA)

```bash
cd ../frontend

# Install dependencies
npm install

# Start local Vite development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

#### Build for Production:
```bash
npm run build
```

---

## 📱 Progressive Web App (PWA) Installation

Molat is packaged with a custom web manifest and Workbox service worker:
- **On iOS (Safari)**: Tap the Share button $\to$ tap **Add to Home Screen**.
- **On Android (Chrome)**: Tap the three-dot menu $\to$ tap **Install Molat**.
- **On Desktop (Chrome/Edge)**: Click the Install icon in the browser address bar.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, TypeScript 5.5, Tailwind CSS 3, Zustand, Motion (Framer), Lucide Icons |
| **Voice & Audio** | Native Web Speech API (`webkitSpeechRecognition`), Web SpeechSynthesis, Web Audio API Soundscape Synthesizer, Screen Wake Lock API, Local Fuzzy NLP |
| **PWA & Camera** | `vite-plugin-pwa`, Workbox, `html5-qrcode` (rear environment camera) |
| **Backend API** | FastAPI, Pydantic v2, Python 3.11, `httpx`, `cachetools`, `anyio` |
| **Database** | Google Sheets via Google Apps Script (Serverless JSON Web App) |
| **Hosting** | Vercel (Frontend SPA/PWA), Hugging Face Spaces (Docker runtime) |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX TestClient |

---

## 👨‍💻 Author & Engineering

Designed & engineered with precision by **[AMIT KUMAR DEY](https://portfolio.akdey.vercel.app/)**.

---

## 📄 Copyright & License

Copyright &copy; 2026 **[AMIT KUMAR DEY](https://portfolio.akdey.vercel.app/)**. All rights reserved.

Crafted with care for bibliophiles and personal book collectors.
