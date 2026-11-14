---
name: doc-updater
description: Instructs the agent to check and synchronize README.md and all project documentation whenever a feature, architecture, model, API, data schema, or configuration is added, modified, or removed in Molat.
---

# Documentation & README Updater Sync Rule (Molat)

Whenever any feature, capability, architecture, AI/voice pipeline, API endpoint, database schema, or environment configuration is introduced, modified, or deprecated in the Molat (মলাট) codebase, you **MUST** update `README.md` and relevant documentation files (`docs/PROJECT_BRIEF.md`, architecture skills) to reflect those changes before concluding the task.

---

## 1. Trigger Conditions

Run this documentation check whenever:
- **New Feature Added**: A new user-facing or backend capability (e.g. On-Device Voice Assistant, Focus Reading Room, Pick My Next Read, Barcode Scanner, Spine View, Financial Ledger, Reading Streak / Heatmap, Lending Ledger, Wishlist, Passkey auth, etc.).
- **Voice & AI Pipeline Changed**: Any update to the on-device Web Speech API engine, local fuzzy title NLP matching (`voiceAssistantEngine.ts`, `voiceLogParser.ts`), Chrome Built-in AI (`builtinAi.ts`), speech synthesis, or Web Audio ambient soundscapes (`ambientSound.ts`).
- **Architecture / Flow Changed**: Modifications to the Google Apps Script bridge (`apps-script/Code.gs`), Google Sheets repository (`backend/app/repositories/sheets_repository.py`), in-memory TTLCache engine, or multi-tier cover enrichment waterfall (`backend/app/services/cover_enrichment.py`).
- **Database Schema / Sheets Contract Changed**: Any addition, alteration, or reordering of columns in Google Sheets tabs (`Books` [21 cols], `Reading_Logs` [9 cols], `Wishlist` [10 cols], `Lending` [10 cols]) or backend Pydantic models in `backend/app/models/`.
- **Config / Environment Variables Changed**: Any new or updated setting in `backend/app/config.py`, `backend/.env.example`, `frontend/vercel.json`, or Docker configuration.
- **Tech Stack / Dependencies Changed**: Added/removed dependencies in `backend/pyproject.toml`, `backend/requirements.txt`, `backend/Dockerfile`, or `frontend/package.json`.

---

## 2. Documentation Targets to Audit & Synchronize

When updating documentation, audit and synchronize the relevant files and sections:

### A. Root `README.md`
- **Feature Highlights (`## ✨ Features`)**: Update feature descriptions, bullet points, and real-world interactions. Highlight zero-billing / local-first privacy and mobile-first ergonomics.
- **Architecture Diagram (`## 🏗️ Architecture`)**: Keep Mermaid diagrams (`flowchart LR`) up to date with actual client components, backend services, external APIs, and storage bridges.
- **Live Google Sheets Database Contract (`## 📊 Live Google Sheets Database Contract`)**: Maintain exact column counts, letter coordinates (`Col A`–`U`), header names, types, and descriptions for all 4 worksheets (`Books`, `Reading_Logs`, `Wishlist`, `Lending`).
- **Technology Stack (`## 🛠️ Tech Stack`)**: Keep frontend, voice/audio, PWA, backend, database, and hosting rows matching actual imports and runtime dependencies.
- **Getting Started & Environment Variables (`## 🚀 Getting Started`)**: Keep `.env` configuration examples and setup instructions complete.

### B. Project Brief (`docs/PROJECT_BRIEF.md`)
- Keep schemas (4 worksheets), core FastAPI endpoints (including `/api/v1/lending`), and product capabilities in sync.

### C. Architecture & Engineering Skills (`.agent/skills/`)
- Ensure [.agent/skills/personal-library-architect/SKILL.md](file:///Users/amitkumardey/Workspace/Projects/Molat/.agent/skills/personal-library-architect/SKILL.md) and [.agent/skills/secure-sheets-engineering/SKILL.md](file:///Users/amitkumardey/Workspace/Projects/Molat/.agent/skills/secure-sheets-engineering/SKILL.md) accurately describe entity contracts, stable ID rules (`BOOK-XXX`, `LOG-XXX`, `WISH-XXX`, `LEND-XXX`), and security invariants.

---

## 3. Strict Rules & Anti-Patterns

1. **Verify Against Source Code**: Never guess or write speculative features. Always inspect the actual source code (`backend/app/config.py`, `backend/app/models/`, `backend/app/routers/`, `frontend/src/`, `apps-script/Code.gs`) before updating docs.
2. **Preserve High-Value Copy & Editorial Tone**: Do not wipe out existing literary descriptions, author attribution, badges, or architecture details. Make surgical, additive, or targeted updates.
3. **Keep Database Table Specs Exact**: Google Sheets columns are 1-indexed / letter-coordinated; always ensure letter columns (`A` through `U`, etc.) and column counts match backend schemas.
4. **Markdown Formatting**: Maintain consistent header hierarchy, table formatting, and Mermaid diagram syntax.
