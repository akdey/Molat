# Implementation Plan

Use this as a sequence of reviewable milestones. Do not implement every feature in one giant pass.

## Milestone 0 — Repository and design audit

Deliver:
- repository map and current state;
- dependency and build status;
- proposed route and component structure;
- semantic design tokens;
- backend/frontend boundary;
- threat model and Google Sheets connection plan;
- list of unknowns and setup requirements.

Acceptance:
- no code overwritten before inspection;
- no secret values requested in chat;
- architecture matches `PROJECT_BRIEF.md`.

## Milestone 1 — Secure skeleton

Deliver:
- frontend app shell and route structure;
- FastAPI app structure and configuration;
- authentication/session foundation;
- strict CORS;
- typed API client;
- non-sensitive health endpoint;
- environment example file with placeholder names only;
- README setup instructions.

Acceptance:
- unauthenticated requests cannot access private library endpoints;
- no secrets in frontend bundle;
- frontend and backend build/start locally;
- no fake production data.

## Milestone 2 — Google Sheets adapter and domain contract

Deliver:
- dedicated service-account integration or keyless identity if supported;
- spreadsheet header validation;
- stable ID handling;
- batched collection read;
- targeted create/update/delete operations;
- typed models and predictable error responses;
- safe timeout/retry handling;
- connection status endpoint.

Acceptance:
- only intended spreadsheet is accessed;
- no arbitrary range endpoint;
- sorting sheet rows does not misdirect updates;
- write failures are visible;
- tests cover schema mismatch and duplicate submissions.

## Milestone 3 — Collection UI and book detail

Deliver:
- Home/Overview;
- Collection cover grid;
- list view;
- search, filters, sort;
- book details and edit flow;
- missing cover fallback;
- loading, empty, no-results, stale-data, and error states.

Acceptance:
- collection fetched in one request;
- local filters do not call Sheets repeatedly;
- all controls work;
- mobile/tablet/desktop reviewed;
- keyboard access and focus visible.

## Milestone 4 — Add book and metadata

Deliver:
- manual add;
- title/author search;
- ISBN scanner;
- metadata provider adapters;
- candidate review and duplicate detection;
- confirmation before save.

Acceptance:
- manual entry works without camera;
- camera permission requested only after user action;
- camera frames are not uploaded for ordinary barcode scanning;
- uncertain edition is not silently accepted;
- metadata failure has recovery path.

## Milestone 5 — Wishlist, reading, maintenance, lending

Deliver:
- wishlist and conversion-to-owned flow;
- reading state and page progress;
- condition and shelf location;
- lending and return workflow;
- relevant filters.

Acceptance:
- ownership and reading status remain independent;
- price fields are not conflated;
- returned books preserve useful history/notes;
- mobile workflows are practical.

## Milestone 6 — Import/export, backup, insights

Deliver:
- CSV import preview;
- column mapping and validation report;
- correction suggestions and explicit confirmation;
- CSV export and documented backup format;
- restore instructions;
- data-backed insights.

Acceptance:
- original values visible before correction;
- no silent destructive bulk changes;
- formula injection handled on export;
- unknown values are not fabricated;
- restore procedure has been walked through on a copy.

## Milestone 7 — Quality and release

Deliver:
- accessibility review;
- responsive review;
- dependency audit;
- test/build results;
- deployment guide;
- secrets setup guide;
- backup/incident-response guide;
- known limitations.

Acceptance:
- production build passes;
- core tests pass;
- no secrets in repository/client bundle;
- all important UI states reviewed;
- no dead controls;
- no fake data or misleading metrics;
- owner can configure and operate the app without putting credentials into chat.
