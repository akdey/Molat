---
name: secure-sheets-engineering
description: Security, concurrency, and reliability rules for Google Sheets as database.
---

# Secure Sheets Engineering

## Invariant Rules
1. **Formula Injection Sanitization**: Any text value beginning with `=, +, -, @, \t, \r` must be prefixed with a single quote (`'`) before writing to Google Sheets or CSV export.
2. **Write Serialization**: Use an `asyncio.Lock()` on all write operations in the FastAPI service to prevent concurrent sheet corruption.
3. **Cache Invalidation**: On write (`append`, `update`, `delete`, `batch_update_covers`), immediately clear or invalidate the 300s TTL cache.
4. **Zero Client Secret Exposure**: `BRIDGE_TOKEN`, Google Service Account keys, and `LIBRARY_KEY` must never be exposed to the frontend bundle.
5. **ISBN Preservation**: Force leading zeros preservation in ISBN-10 / ISBN-13 cells by writing them as text or single-quoted strings.
