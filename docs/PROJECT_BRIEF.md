# Product Brief — Personal Library

## 1. Product purpose

Build a private, responsive personal library application that turns a basic Google Sheet book inventory into a usable, visual catalogue. The product should make it easy to discover what is owned, decide what to read next, scan new books into the collection, maintain physical copies, track lending, understand spending, and safely preserve the inventory.

This is a personal tool, not a social network, marketplace, bookstore, or generic admin dashboard. It should feel like a thoughtfully designed digital extension of a real home library.

### Primary outcomes

1. See and search the collection quickly.
2. Add books with minimal typing by scanning an ISBN or searching metadata.
3. Keep ownership, reading progress, purchase details, condition, shelf location, and lending information accurate.
4. Maintain the existing spreadsheet as the authoritative source of truth.
5. Protect the owner's Google account and unrelated Drive files.
6. Keep operating costs and infrastructure complexity low.

### Current scale and assumptions

- Small, single-owner collection; the current inventory is approximately 55 owned books and 10 wishlist books, but the system must not hard-code those numbers.
- Initial usage is expected on phone and laptop.
- The collection is small enough to fetch in a single API request and filter client-side.
- Currency default: INR. It must be configurable rather than hard-coded into calculations.
- Language and publication data may be incomplete or ambiguous.
- Book cover URLs may be unavailable, blocked, or stale.

## 2. Product principles

- **Trust over automation:** never silently replace uncertain metadata or invent missing facts.
- **Fast paths:** common tasks such as search, scan, mark read, and update location should take very few steps.
- **Visual but useful:** covers and bookshelf presentation support discovery; they must not make the interface slow or obscure data.
- **Respect physical ownership:** distinguish a bibliographic title/edition from an individual physical copy where necessary.
- **Portable data:** provide CSV/Excel export and a recoverable backup workflow.
- **Privacy by default:** no social features, analytics, third-party tracking, or broad Google Drive access unless explicitly required and justified.
- **Accessible by default:** keyboard navigation, visible focus, semantic markup, readable contrast, reduced-motion support, and usable mobile controls.
- **No false certainty:** metadata, retail price, and estimated value are different things; unknown values stay unknown.

## 3. Initial architecture

```text
Phone / Laptop browser
        |
        | HTTPS
        v
React + Vite + Tailwind
- visual library UI
- ISBN barcode scanning
- local filtering and sorting
- transient client state
        |
        | HTTPS; authenticated application requests
        v
FastAPI backend
- app authentication/session validation
- request validation
- Google Sheets access
- metadata provider adapters
- duplicate detection and conflict handling
- safe import/export and health status
        |
        +--------------------------+
        |                          |
        v                          v
Google Sheets API            Book metadata providers
- authoritative book data    - Google Books, if available
- controlled access          - Open Library, if appropriate
- only the selected sheet    - respect quotas and terms
```

### Architecture constraints

- No MongoDB or second database in version one.
- Google Sheets is the authoritative store for book records.
- Do not treat the spreadsheet as a secrets vault.
- Use a dedicated service account shared only with the library spreadsheet. Do not grant broad Drive access or unnecessary Google Cloud IAM permissions.
- Store the service-account credential only in the backend host's secret store. Prefer workload identity federation/keyless authentication if supported by the hosting environment; otherwise use a restricted, rotatable key.
- Do not expose service-account credentials, OAuth tokens, API keys, internal stack traces, or spreadsheet identifiers unnecessarily to the client.
- The frontend must not call the Google Sheets API directly using service-account credentials.
- Never put secrets in `VITE_*` variables: Vite exposes these to the client bundle.
- Use a backend API adapter for Sheets so that UI components do not know spreadsheet range details.
- Batch spreadsheet reads. Fetch collection data in one request where practical.
- Use stable `Book_ID` values, not sheet row numbers, as record identifiers.
- Use targeted updates and validate a record's identity before writing. Do not rewrite the whole sheet for an ordinary edit.
- Handle stale data and concurrent updates defensively. The first version is single-owner, but browser tabs and retries can still overlap.
- Do not promise true database transactions or strong concurrency guarantees from Google Sheets.
- Use short-lived client-side state/cache only as a performance aid, not as the authoritative record.
- Define API timeouts, clear errors, retries only where safe, and a visible stale/offline state.
- Do not build background polling that repeatedly consumes quotas.

## 4. Data model

Use a stable schema in code and a documented header mapping in the spreadsheet. Preserve unknown/unmapped columns during imports when feasible; do not silently discard user data.

### Recommended `Books` columns

| Field | Meaning | Rules |
|---|---|---|
| `Book_ID` | Stable unique ID for this collection entry | Required; generated once; never derived from row number |
| `Title` | Display title | Required for a normal saved record |
| `Subtitle` | Subtitle, if any | Optional |
| `Author` | Author or authors | Optional if unknown; preserve source formatting |
| `ISBN_13` | ISBN-13 when verified | Text, not numeric; preserve leading zeros |
| `ISBN_10` | ISBN-10 when available | Text |
| `Publisher` | Publisher | Optional |
| `Publication_Year` | Edition publication year | Optional; validate range but do not guess |
| `Language` | Language | Optional |
| `Genre` | Controlled or user-defined category | Optional |
| `Ownership_Status` | `Owned`, `Wishlist`, `Borrowed` | Do not conflate ownership with reading state |
| `Reading_Status` | `Unread`, `Reading`, `Completed`, `Abandoned` | Separate from ownership |
| `Current_Page` | Current page | Non-negative integer |
| `Total_Pages` | Total pages | Positive integer when known |
| `Purchase_Price` | Actual amount paid | Numeric; may be blank |
| `Retail_Price` | Reference retail price | Numeric; source/date should be recorded if used |
| `Purchase_Date` | Date acquired | Optional |
| `Purchase_Source` | Store/source | Optional |
| `Condition` | `New`, `Good`, `Fair`, `Damaged`, `Unknown` | Default `Unknown` |
| `Shelf_Location` | Physical location | Free text or structured path |
| `Loaned_To` | Borrower name/nickname | Optional; avoid unnecessary personal data |
| `Loan_Date` | Date lent | Optional |
| `Expected_Return_Date` | Expected return date | Optional |
| `Personal_Rating` | Owner rating | Optional, defined scale |
| `Notes` | Personal notes | Treat as private |
| `Cover_URL` | External cover URL | Validate protocol/host; handle failure |
| `Cover_Source` | Provider/source | Optional |
| `Metadata_Verified` | Whether user confirmed metadata | Boolean/status |
| `Created_At` | Creation timestamp | ISO 8601 |
| `Updated_At` | Last modification timestamp | ISO 8601 |
| `Row_Version` | Lightweight version/change marker | Optional; helps detect stale updates |

### Additional tabs

- `Settings`: controlled genres, conditions, reading statuses, locations, app settings where useful. Do not put secrets here.
- `Change_Log` (optional): limited audit entries for important app writes, avoiding sensitive notes or secrets. A separate tab is not a security boundary.
- Avoid one tab per genre or reading status. Keep a normalized, stable `Books` tab.

### Important data distinctions

- Purchase price = what the owner paid.
- Retail price = a reference/list price, ideally with source and checked date.
- Current value = a separate optional estimate and must not be inferred from retail price.
- `Ownership_Status` and `Reading_Status` are independent.
- A wishlist item has no purchase price unless it has actually been purchased.
- A duplicate title is not necessarily a duplicate physical copy. Prefer ISBN/edition matching plus user confirmation.
- If the user owns multiple copies of the same edition, v1 may represent each copy as a separate record with a unique `Book_ID`; document this behavior.

## 5. Screen inventory and behavior

### 5.1 Home / Overview

Purpose: provide a quick, calm overview and shortcuts.

Content:
- Owned count, currently reading, completed, wishlist count.
- Total known purchase expenditure (exclude blank prices; clearly label it as known spend).
- Continue reading, recently added, recently viewed if useful.
- Compact visual shelf/collection preview.
- Quick actions: Scan ISBN, Add manually, Search books.
- Connection freshness indicator: last successful refresh or a subtle stale-data warning when relevant.

Behavior:
- Clicking a statistic applies a filter to the collection.
- Do not show fake sample statistics in production.
- Empty state should explain how to add the first book.
- Do not make every statistic a large decorative card.

### 5.2 Collection / My Books

Purpose: browse and manage all records.

Views:
- Cover grid (default candidate).
- Bookshelf/spine view (optional visual mode, not the only way to browse).
- Dense list/table for maintenance and bulk editing.

Controls:
- Search title, author, ISBN, publisher, genre, notes where safe and appropriate.
- Filters: ownership, reading status, genre, condition, location, loan status, missing metadata, missing cover.
- Sort: title, author, date added, purchase date, price, reading progress.
- Clear filters and visible result count.
- Empty results state that preserves the user's search/filter context.

Behavior:
- Client-side filtering after one collection fetch.
- Use stable keys, memoization only when profiling justifies it, and no unnecessary state duplication.
- Bulk actions must show selected count and confirm destructive or broad changes.
- Avoid pagination for a tiny collection unless it materially improves the layout; keep architecture scalable.

### 5.3 Book detail

Purpose: a complete record for one book.

Sections:
- Cover and bibliographic metadata.
- Ownership and purchase details.
- Reading progress, rating, notes.
- Physical condition and location.
- Lending details when applicable.
- Metadata source/verification status.

Actions:
- Edit, update progress, mark completed, change location/condition, lend/return, export record, delete.
- Confirm delete; never delete merely by opening a menu.
- Display unknown data as “Not recorded”, not fabricated placeholders that look real.
- If the external cover fails, show a designed fallback.

### 5.4 Add / Scan

Entry paths:
- Scan ISBN with browser camera.
- Search by title/author.
- Manual entry.

Flow:
1. Ask for camera permission only after user activates scanning.
2. Read barcode in the browser; do not upload the camera frame for ordinary ISBN scanning.
3. Validate and normalize ISBN.
4. Search metadata providers through backend adapters.
5. Present candidate result(s), edition clues, and cover.
6. Check duplicates against the current collection.
7. Let the user review/edit details.
8. Collect personal fields such as purchase price, date, condition, and location.
9. Save only after explicit confirmation.

Edge cases:
- Permission denied, camera unavailable, barcode not recognized, ISBN not found, multiple matches, bad provider data, network/provider quota errors, duplicate, cancellation.
- Provide manual entry at every appropriate failure point.
- Do not treat a title match alone as proof that the edition is correct.
- No camera permission should be required for manual search or data entry.

### 5.5 Wishlist

Purpose: manage intended purchases.

Fields/actions:
- Title, author, ISBN if known, cover, genre, priority, expected budget, notes, date added.
- Sort by priority, expected budget, title, date added.
- Move to owned/purchased flow with purchase date and actual price.
- Avoid automatically treating expected budget or retail price as purchase price.

### 5.6 Reading tracker

Purpose: track reading state and progress without becoming a social reading network.

Features:
- Currently reading, unread queue, completed, abandoned.
- Current page and total pages.
- Start/completion dates.
- Personal rating and notes.
- Basic annual completed-book and page counts, only where source data supports the calculation.
- Progress controls accessible on mobile and keyboard.
- Avoid elaborate streak mechanics or gamification unless the owner requests them.

### 5.7 Physical inventory and lending

Purpose: manage the physical books, not just bibliographic records.

Features:
- Shelf/location, condition, maintenance notes.
- Loaned-to, loan date, expected return.
- Filter damaged, on loan, overdue, missing location, unknown condition.
- Record a return without losing historical notes.
- Optional physical photographs later; not required for v1.
- Do not require cloud image storage for ordinary covers.

### 5.8 Insights

Purpose: answer useful questions about the collection.

Metrics:
- Owned books, wishlist count, reading statuses.
- Known purchase expenditure (sum only of known purchase prices).
- Genre distribution and reading progress.
- Purchases by time when dates exist.
- Optional purchase price vs verified retail price only when both values and sources exist.

Rules:
- Label incomplete-data metrics clearly.
- Avoid misleading charts with fabricated or inferred values.
- Charts must be accessible, responsive, and useful; no chart for decoration alone.
- Avoid excessive dashboard cards.

### 5.9 Import / data cleanup / export

Features:
- CSV/XLSX import preview.
- Column mapping and validation report.
- Duplicate candidates, missing ISBN, missing fields, possible spelling inconsistencies.
- Suggest corrections with original and proposed values side by side.
- User confirms before applying bulk changes.
- Export CSV and a documented backup format.
- Never invent prices or silently overwrite the original source.
- If XLSX parsing is not in v1, state this clearly and support CSV reliably.
- For a full backup, include schema/version and export timestamp if using JSON; CSV remains available for portability.

### 5.10 Settings / connection status

Features:
- Theme and display preferences.
- Currency and date format.
- Google Sheets connection test and last successful read/write status.
- Import/export/backup shortcuts.
- Sign out and session status.
- Non-sensitive error diagnostics.

Rules:
- Never display or return a private key, token, or full secret.
- Do not make connection status expose the spreadsheet to unauthenticated users.
- Do not offer a “show secret” feature.
- A Google service-account key is configured by an operator in the backend secret store, not uploaded by the end user through a public UI.

## 6. Non-functional requirements

### Security
- HTTPS in deployment.
- Authentication protects all private API routes.
- Secure, HttpOnly session cookie where practical; appropriate SameSite and CSRF protections for cookie-authenticated mutations.
- Strict CORS allowlist; CORS is not authentication.
- Validate every request with Pydantic.
- Rate-limit authentication and sensitive endpoints.
- Keep secrets out of source control, frontend builds, logs, error messages, and API responses.
- Do not expose arbitrary spreadsheet range read/write endpoints to the client.
- Restrict the service account to the intended spreadsheet; no broad Drive scope or unnecessary cloud roles.
- Use safe, allowlisted metadata provider URLs and timeouts.
- Do not accept arbitrary remote URLs and fetch them server-side without protections against SSRF.
- Do not store private user notes in telemetry.
- Avoid third-party analytics/tracking.

### Reliability
- Clear loading, empty, success, partial success, and failure states.
- Idempotency/duplicate guard for repeated scan submissions where feasible.
- Safe retry behavior: retry reads cautiously; avoid blind repeated writes.
- Stable IDs and targeted row updates.
- Detect stale data before overwrite where practical.
- User-visible write errors and a retry path.
- Backup/export and documented restore process.
- Do not claim transactional guarantees that Sheets cannot provide.

### Performance
- One batched collection read rather than one request per row.
- Client-side search/filter/sort for this collection size.
- Lazy-load cover images.
- Explicit image dimensions/aspect ratio to avoid layout shift.
- Use skeletons only where useful; no fake progress percentages.
- Avoid unnecessary API polling and repeated metadata requests.
- Set API timeouts and provide graceful fallbacks.

### Accessibility and responsive design
- Semantic HTML and proper heading hierarchy.
- Keyboard-accessible menus, dialogs, scanner controls, filters, and forms.
- Visible focus states.
- Accessible names for icon-only controls.
- Labels and error messages associated with inputs.
- Sufficient contrast and non-color-only status indicators.
- Reduced-motion support.
- Touch targets suitable for mobile.
- Test narrow phone widths, tablet, laptop, and large desktop.

## 7. Out of scope for v1

- Social network, friend feeds, reviews from other users.
- Marketplace or purchasing integration.
- Multi-tenant user management.
- AI vision/OCR identification as a mandatory flow.
- Mandatory photo uploads.
- Binary image storage in Sheets.
- Full offline-first conflict resolution.
- Complex recommendation engine.
- Automated “current value” claims without a trustworthy source.
- Microservices, event bus, or unnecessary infrastructure.

## 8. Definition of done

The product is not done merely because screens render.

- A user can sign in and only authorized requests can access library data.
- The frontend contains no secrets.
- FastAPI reads/writes the intended sheet through a dedicated, least-privilege identity.
- Collection is fetched in a batched request and can be searched/filtered without extra Sheets calls.
- Book creation/edit/delete have validation, clear errors, and safe confirmation.
- ISBN scan has manual fallback and a confirmation step before saving.
- Duplicate candidates are shown without falsely blocking legitimate multiple copies.
- Missing covers and broken URLs render a polished fallback.
- Import/export is tested; bulk changes require preview/confirmation.
- A backup can be exported and a restore procedure is documented.
- Responsive and keyboard checks pass.
- Production build succeeds and tests pass.
- README explains local setup, secrets, Google Cloud setup, deployment, backup, and recovery.
