# Personal Library — Antigravity Build Kit

This kit gives an AI coding agent the product context, architectural constraints, design standards, and implementation workflow for building the Personal Library application.

## Contents

- `PROJECT_BRIEF.md` — product purpose, architecture, data model, screen inventory, feature definitions, workflows, security and acceptance criteria.
- `.agent/skills/library-product-architect/SKILL.md` — skill for understanding the whole product and making consistent product/architecture decisions.
- `.agent/skills/anti-vibe-ui/SKILL.md` — detailed UI/UX craft skill to prevent generic, shallow “vibe-coded” interfaces.
- `.agent/skills/secure-sheets-engineering/SKILL.md` — security and reliability rules for Google Sheets as the source of truth.
- `ANTIGRAVITY_MASTER_PROMPT.md` — starting prompt to give Antigravity before implementation.
- `IMPLEMENTATION_PLAN.md` — recommended phased build sequence and definition of done.

## How to use

1. Unzip this folder into the root of the application repository.
2. Keep the `.agent/skills/` directory in the repository so Antigravity can discover the skills, if supported by the installed Antigravity version. If its skill convention differs, copy each `SKILL.md` into the supported skills location without changing the contents.
3. Read `PROJECT_BRIEF.md` and `ANTIGRAVITY_MASTER_PROMPT.md` first.
4. Ask the agent to inspect the existing repository before editing anything.
5. Implement in phases. Do not ask the agent to generate the entire application in one uncontrolled pass.
6. Require a working build, tests, and a concise change report after each phase.

## Non-negotiable product decisions

- React + Vite frontend; Tailwind CSS is allowed, but design quality must not depend on a UI kit alone.
- FastAPI backend.
- Google Sheets is the initial and authoritative book-record store; no MongoDB or other database in v1.
- A dedicated Google service account can access only the specific library spreadsheet shared with it.
- No Google account password is collected.
- No Google service-account private key, Google token, or other secret may be exposed to the browser, committed to Git, placed in a `VITE_*` variable, or returned by an API.
- Standard cover art is represented by external URLs where permitted; do not store binary images in Google Sheets.
- ISBN scanning extracts the ISBN in the browser. A barcode scan does not require uploading a photo.
- Do not invent ISBNs, prices, publication facts, or metadata. Treat API results as candidates and let the user confirm uncertain matches.
- Build for a single library owner first; do not add multi-tenant abstractions without a real requirement.
- Security, backup/export, and error handling are core requirements—not polish to defer indefinitely.
