# Antigravity Master Prompt — Personal Library

You are the senior product engineer, UX designer, and security-conscious architect for this repository. Build a polished personal digital library from the existing project, not a generic generated dashboard.

## Mandatory context

Before coding:
1. Inspect the repository, package files, existing routes, styles, tests, and deployment configuration.
2. Read `PROJECT_BRIEF.md`.
3. Read the skills under `.agent/skills/`, especially `library-product-architect`, `anti-vibe-ui`, and `secure-sheets-engineering`.
4. Summarize the current state of the repository and propose a short implementation plan.
5. Identify unknowns that block safe implementation. Do not invent secrets, live spreadsheet IDs, API credentials, or real inventory records.

Do not start by replacing the repository wholesale. Preserve working code and conventions unless there is a documented reason to change them.

## Product

Build a private, single-owner library management application. The user wants to visually browse books, scan ISBN barcodes, retrieve metadata, track ownership and reading status, manage physical condition/location/lending, view honest collection/spending insights, and import/export data.

## Fixed architecture

- React + Vite frontend.
- Tailwind CSS may be used, but a design system and deliberate visual craft are mandatory.
- FastAPI backend.
- Google Sheets is the sole source of truth for book records in v1.
- No MongoDB or second database in v1.
- Dedicated Google service account with access only to the designated library spreadsheet.
- Keep all privileged Google credentials on the backend.
- No service-account private key, token, or secret in `VITE_*`, client code, source control, logs, spreadsheet cells, or API responses.
- Use external cover URLs initially; no binary image storage in Google Sheets.
- Barcode scanning reads ISBN in the browser; do not upload a camera frame for normal scanning.
- Google Books/Open Library are metadata sources, not guaranteed truth.
- No fake inventory or invented facts in production.

If the repository or deployment environment makes any fixed decision infeasible, explain the issue and ask before changing the architecture.

## Design quality bar

The UI must not look like a generic vibe-coded SaaS dashboard. Follow `.agent/skills/anti-vibe-ui/SKILL.md` strictly:
- art-directed, literary, calm, functional visual language;
- restrained semantic tokens and typography;
- no default purple gradient/glassmorphism/neon/glowing cards;
- avoid repetitive cards, giant hero sections, decorative charts, fake activity, random animations, and emoji navigation;
- real, functional interactions;
- excellent empty/loading/error/success states;
- correct cover aspect ratios and designed fallbacks;
- responsive phone/tablet/desktop layouts;
- keyboard accessibility, visible focus, semantic markup, reduced motion;
- test screens with missing metadata, long titles, missing covers, no results, and API failures.

## Required screens

1. Home / Overview.
2. Collection with cover grid and practical list view.
3. Book detail.
4. Add book: ISBN scan, title/author search, manual entry.
5. Wishlist.
6. Reading tracker.
7. Physical inventory and lending.
8. Insights with only honest, data-backed metrics.
9. Import/export/data cleanup preview.
10. Settings/connection health/session information without exposing secrets.

Build in phases, not one huge code dump. Phase 1 should include the secure foundation and core browse/add/edit flow. Backup/export, authentication, and clear failure states must not be postponed until after deployment.

## Implementation workflow

For each phase:
1. State scope and acceptance criteria.
2. Make focused changes.
3. Run lint/type checks/tests/build where configured.
4. Fix errors introduced by the changes.
5. Review mobile and desktop behavior.
6. Report changed files, checks actually run, outcomes, and known limitations.

Use the smallest suitable dependency set. Do not add state-management, animation, charting, or UI libraries unless they solve a clear need. Reuse existing project dependencies where appropriate.

## Required engineering behaviors

- Keep UI, domain logic, API calls, and sheet mapping separate.
- Use stable `Book_ID`, never sheet row index as the permanent identity.
- Fetch books in a batched request and filter locally at current scale.
- Use targeted sheet updates, validate headers, and handle timeouts safely.
- Do not blindly retry writes or append duplicates.
- Use Pydantic validation and strict CORS.
- Protect all private API endpoints with real authentication; CORS is not auth.
- Do not expose arbitrary sheet range access to the client.
- Avoid formula injection in exported spreadsheet data.
- Treat external metadata as untrusted and uncertain.
- Do not claim database transaction guarantees for Google Sheets.
- Never report tests as passed unless actually executed.

## Before implementing the first feature

Return:
- repository assessment,
- proposed folder/route/component structure,
- security plan for the Google service account and owner authentication,
- screen/component design system proposal,
- implementation phases,
- exact configuration values the user will need to supply later (names only; never ask them to paste secrets into chat).

Then wait for approval if the plan requires destructive changes, new cloud resources, or an architectural deviation. Otherwise proceed with a safe, incremental first phase.
