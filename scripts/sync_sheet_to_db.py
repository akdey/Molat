#!/usr/bin/env python3
"""
scripts/sync_sheet_to_db.py

Populates PostgreSQL database from Google Sheets Apps Script Bridge with:
  1. Standalone UUID primary keys for books, logs, lending, wishlist.
  2. 3NF normalized 'genres' table and 'book_genres' many-to-many junction table.
  3. Deletion of the redundant 'genre' column from the 'books' table.
  4. Direct foreign keys (e.g. reading_logs.book_id -> books.book_id).
  5. Seeding user_settings and user authentication record.

Usage:
    python scripts/sync_sheet_to_db.py --user-id usr_65af3d94e2c6 --delete-all
"""

import argparse
import asyncio
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from zoneinfo import ZoneInfo

# Setup import path to find backend modules
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent if SCRIPT_DIR.name == "scripts" else SCRIPT_DIR
BACKEND_DIR = REPO_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load .env file
for env_candidate in [BACKEND_DIR / ".env", REPO_ROOT / ".env"]:
    if env_candidate.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_candidate)
            break
        except ImportError:
            with open(env_candidate, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v
            break

import httpx
from sqlalchemy import text, select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.core.database import Base, db_manager
from app.features.auth.entity import UserEntity
from app.features.books.entity import BookEntity
from app.features.genres.entity import GenreEntity, BookGenreEntity
from app.features.reading.entity import ReadingLogEntity
from app.features.lending.entity import LendingEntity
from app.features.wishlist.entity import WishlistEntity
from app.features.settings.entity import UserSettingsEntity

IST = ZoneInfo("Asia/Kolkata")
UUID_NAMESPACE = uuid.NAMESPACE_DNS

DEFAULT_BRIDGE_URL = (
    os.getenv("GOOGLE_SHEETS_BRIDGE_URL")
    or "https://script.google.com/macros/s/AKfycbxCdmH4h2izNcqn_5FsHjmBDQYrPaU5goFHjxw9edalQp8_lywbEi41V-YK7qLbXjw/exec"
)
DEFAULT_BRIDGE_TOKEN = os.getenv("BRIDGE_TOKEN") or "molat-secret-token-3232"

DEFAULT_USER = {
    "id": "usr_65af3d94e2c6",
    "email": "amitkr.dey1998@gmail.com",
    "username": "akdey",
    "password_hash": "$2b$12$M1p/uVTQEJuXUFb2N8M6U.rj9ERxOQ298QnaATfjJwDrz3kVNT/J2",
    "role": "reader",
}


def to_uuid(user_id: str, prefix: str, raw_id: str) -> str:
    """Deterministically map a sheet identifier (e.g. BOOK-001) to a stable UUIDv5."""
    clean_id = (raw_id or "").strip()
    return str(uuid.uuid5(UUID_NAMESPACE, f"molat:{user_id}:{prefix}:{clean_id}"))


def genre_to_uuid(name: str) -> str:
    """Deterministically map a genre name to a stable UUIDv5."""
    clean_name = name.strip().lower()
    return str(uuid.uuid5(UUID_NAMESPACE, f"molat:genre:{clean_name}"))


def parse_float(val: Any) -> Optional[float]:
    """Parse float from string or number, stripping currency symbols (e.g. ₹)."""
    if val is None or val == "":
        return None
    try:
        if isinstance(val, (int, float)):
            return float(val)
        cleaned = re.sub(r"[^\d.-]", "", str(val).strip())
        if not cleaned or cleaned in ("-", ".", "-."):
            return None
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def parse_int(val: Any) -> Optional[int]:
    """Parse integer from string or number."""
    if val is None or val == "":
        return None
    try:
        if isinstance(val, int):
            return val
        if isinstance(val, float):
            return int(val)
        cleaned = re.sub(r"[^\d-]", "", str(val).strip())
        if not cleaned:
            return None
        return int(cleaned)
    except (ValueError, TypeError):
        return None


def sanitize_str(val: Any) -> Optional[str]:
    """Trim and clean string value, returning None if empty."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


async def fetch_sheet_table(client: httpx.AsyncClient, bridge_url: str, table_name: str, token: Optional[str]) -> List[Dict[str, Any]]:
    """Fetch rows from Google Apps Script bridge for a given sheet."""
    params = {"action": f"get{table_name}"}
    if token:
        params["token"] = token
    resp = await client.get(bridge_url, params=params, timeout=45.0)
    resp.raise_for_status()
    data = resp.json()
    return data.get("books") or data.get("rows") or []


async def sync_data(
    user_id: str,
    database_url: str,
    bridge_url: str,
    bridge_token: Optional[str],
    delete_all: bool = False,
    dry_run: bool = False,
):
    print("=" * 70)
    print("Molat Google Sheets -> PostgreSQL Relational Sync (UUIDs + 3NF Genres)")
    print(f"Target User ID   : {user_id}")
    print(f"Delete All Tables: {'YES' if delete_all else 'NO'}")
    print(f"Dry Run Mode     : {'YES' if dry_run else 'NO'}")
    print("=" * 70)

    if not bridge_url:
        print("[ERROR] GOOGLE_SHEETS_BRIDGE_URL is missing.")
        sys.exit(1)

    if not database_url:
        print("[ERROR] DATABASE_URL is missing.")
        sys.exit(1)

    # 1. Fetch data from Google Sheets Bridge
    print(f"\n[1/3] Fetching data from Google Sheets Bridge ({bridge_url[:45]}...)...")
    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        books_raw = await fetch_sheet_table(client, bridge_url, "Books", bridge_token)
        print(f"  -> Fetched {len(books_raw)} book records")

        reading_logs_raw = await fetch_sheet_table(client, bridge_url, "Reading_Logs", bridge_token)
        print(f"  -> Fetched {len(reading_logs_raw)} reading log records")

        wishlist_raw = await fetch_sheet_table(client, bridge_url, "Wishlist", bridge_token)
        print(f"  -> Fetched {len(wishlist_raw)} wishlist records")

        lending_raw = await fetch_sheet_table(client, bridge_url, "Lending", bridge_token)
        print(f"  -> Fetched {len(lending_raw)} lending records")

        settings_raw = await fetch_sheet_table(client, bridge_url, "Settings", bridge_token)
        print(f"  -> Fetched {len(settings_raw)} settings records")

    # 2. Connect to PostgreSQL via SQLAlchemy 2.0 AsyncEngine
    print("\n[2/3] Connecting to PostgreSQL database...")
    session_factory = await db_manager.init_engine(database_url)
    if not session_factory:
        print("[ERROR] Could not connect to PostgreSQL via SQLAlchemy engine.")
        sys.exit(1)

    if dry_run:
        print("\n[DRY RUN] Skipping database write operations.")
        print(f"Summary of items fetched from sheet:")
        print(f"  - Books: {len(books_raw)}")
        print(f"  - Reading Logs: {len(reading_logs_raw)}")
        print(f"  - Wishlist: {len(wishlist_raw)}")
        print(f"  - Lending: {len(lending_raw)}")
        await db_manager.close()
        return

    try:
        async with session_factory() as session:
            # Step A: Drop and Recreate Schema if delete_all requested
            if delete_all:
                print("  -> Dropping all tables (including legacy categories) and creating 3NF schema...")
                async with db_manager.engine.begin() as conn:
                    await conn.execute(text(
                        "DROP TABLE IF EXISTS book_categories, categories, book_genres, genres, "
                        "lending, reading_logs, wishlist, user_settings, books, users CASCADE"
                    ))
                    await conn.run_sync(Base.metadata.create_all)
                print("  -> Clean 3NF schema created with UUID primary keys and 'genres'/'book_genres' tables.")

            # Step B: Ensure target user exists in 'users' table
            user_stmt = select(UserEntity).where(UserEntity.id == user_id)
            user_ent = (await session.execute(user_stmt)).scalar_one_or_none()

            if not user_ent:
                print(f"  -> User '{user_id}' not found. Seeding user record...")
                new_user = UserEntity(
                    id=user_id,
                    email=DEFAULT_USER["email"] if user_id == DEFAULT_USER["id"] else f"{user_id}@molat.local",
                    username=DEFAULT_USER["username"] if user_id == DEFAULT_USER["id"] else user_id,
                    password_hash=DEFAULT_USER["password_hash"],
                    role=DEFAULT_USER["role"],
                )
                session.add(new_user)
                await session.commit()
                print(f"  -> User '{user_id}' ({new_user.username} <{new_user.email}>) seeded.")
            else:
                print(f"  -> Verified user '{user_id}': {user_ent.username} ({user_ent.email})")

            # Map from original sheet book_id (e.g. 'BOOK-001') to new book UUID
            sheet_to_uuid_map: Dict[str, str] = {}
            genres_map: Dict[str, str] = {}  # genre_name -> genre_id UUID
            book_genres_to_insert: Set[tuple] = set()

            # Step C: Migrate Books (NO genre column on books table!)
            print("\n[3/3] Migrating entities into PostgreSQL (UUIDs & 3NF Genres)...")
            books_count = 0

            for idx, r in enumerate(books_raw, start=1):
                raw_book_id = sanitize_str(r.get("book_id")) or f"BOOK-{idx:03d}"
                book_uuid = to_uuid(user_id, "book", raw_book_id)
                sheet_to_uuid_map[raw_book_id] = book_uuid

                title = sanitize_str(r.get("title")) or "Untitled"
                subtitle = sanitize_str(r.get("subtitle"))
                authors = sanitize_str(r.get("authors"))
                isbn_10 = sanitize_str(r.get("isbn_10"))
                isbn_13 = sanitize_str(r.get("isbn_13"))
                publisher = sanitize_str(r.get("publisher"))
                publication_year = parse_int(r.get("publication_year"))
                language = sanitize_str(r.get("language")) or "English"
                genre_raw = sanitize_str(r.get("genre"))
                cover_url = sanitize_str(r.get("cover_url"))

                raw_status = sanitize_str(r.get("reading_status"))
                reading_status = raw_status.upper() if raw_status and raw_status.upper() in (
                    "UNREAD", "READING", "COMPLETED", "PAUSED", "ABANDONED"
                ) else "UNREAD"

                raw_cond = sanitize_str(r.get("condition"))
                condition = raw_cond.title() if raw_cond and raw_cond.title() in (
                    "New", "Good", "Fair", "Damaged"
                ) else "Good"

                location = sanitize_str(r.get("location")) or "Home Shelf"
                purchase_price = parse_float(r.get("purchase_price")) or 0.0
                rp = parse_float(r.get("rp")) or 0.0
                purchase_date = sanitize_str(r.get("purchase_date"))
                rating = parse_int(r.get("rating"))
                notes = sanitize_str(r.get("notes"))
                created_at = sanitize_str(r.get("created_at")) or datetime.now(IST).strftime("%Y-%m-%d")
                updated_at = sanitize_str(r.get("updated_at")) or created_at

                # 3NF Normalization: extract distinct genres into genres_map & book_genres_to_insert
                if genre_raw:
                    for g_name in [c.strip() for c in genre_raw.split(",") if c.strip()]:
                        if g_name not in genres_map:
                            gid = genre_to_uuid(g_name)
                            genres_map[g_name] = gid
                        gid = genres_map[g_name]
                        book_genres_to_insert.add((book_uuid, gid))

                # Notice: genre column is NOT included here as it is normalized into genres/book_genres
                stmt = pg_insert(BookEntity).values(
                    book_id=book_uuid,
                    user_id=user_id,
                    title=title,
                    subtitle=subtitle,
                    authors=authors,
                    isbn_10=isbn_10,
                    isbn_13=isbn_13,
                    publisher=publisher,
                    publication_year=publication_year,
                    language=language,
                    cover_url=cover_url,
                    reading_status=reading_status,
                    condition=condition,
                    location=location,
                    purchase_price=purchase_price,
                    rp=rp,
                    purchase_date=purchase_date,
                    rating=rating,
                    notes=notes,
                    created_at=created_at,
                    updated_at=updated_at,
                ).on_conflict_do_update(
                    index_elements=["book_id"],
                    set_={
                        "title": title,
                        "subtitle": subtitle,
                        "authors": authors,
                        "isbn_10": isbn_10,
                        "isbn_13": isbn_13,
                        "publisher": publisher,
                        "publication_year": publication_year,
                        "language": language,
                        "cover_url": cover_url,
                        "reading_status": reading_status,
                        "condition": condition,
                        "location": location,
                        "purchase_price": purchase_price,
                        "rp": rp,
                        "purchase_date": purchase_date,
                        "rating": rating,
                        "notes": notes,
                        "created_at": created_at,
                        "updated_at": updated_at,
                    }
                )
                await session.execute(stmt)
                books_count += 1

            await session.commit()
            print(f"  -> Upserted {books_count} books into 'books' table (with UUID primary keys, no genre column)")

            # Step D: Insert Genres and BookGenres (3NF Normalization)
            for g_name, g_id in genres_map.items():
                g_stmt = pg_insert(GenreEntity).values(
                    id=g_id,
                    name=g_name,
                ).on_conflict_do_nothing(index_elements=["id"])
                await session.execute(g_stmt)

            await session.commit()
            print(f"  -> Upserted {len(genres_map)} distinct genres into 'genres' table")

            for b_id, g_id in book_genres_to_insert:
                bg_stmt = pg_insert(BookGenreEntity).values(
                    book_id=b_id,
                    genre_id=g_id,
                ).on_conflict_do_nothing(index_elements=["book_id", "genre_id"])
                await session.execute(bg_stmt)

            await session.commit()
            print(f"  -> Linked {len(book_genres_to_insert)} entries into 'book_genres' junction table")

            # Step E: Migrate Reading Logs with UUIDs and direct FK book_id -> books.book_id
            logs_count = 0
            for idx, r in enumerate(reading_logs_raw, start=1):
                raw_book_id = sanitize_str(r.get("book_id"))
                book_uuid = sheet_to_uuid_map.get(raw_book_id)
                if not book_uuid:
                    print(f"  [WARN] Skipping log {r.get('log_id')}: book_id '{raw_book_id}' not found in books!")
                    continue

                raw_log_id = sanitize_str(r.get("log_id")) or f"LOG-{idx:03d}"
                log_uuid = to_uuid(user_id, "reading_log", raw_log_id)

                session_date = sanitize_str(r.get("session_date")) or datetime.now(IST).strftime("%Y-%m-%d")
                pages_read = parse_int(r.get("pages_read")) or 0
                start_page = parse_int(r.get("start_page")) or 0
                end_page = parse_int(r.get("end_page")) or (start_page + pages_read if pages_read > 0 else 0)

                duration_minutes = parse_int(r.get("duration_minutes")) or 0
                session_note = sanitize_str(r.get("session_note")) or sanitize_str(r.get("notes"))
                created_at = sanitize_str(r.get("created_at")) or session_date

                stmt = pg_insert(ReadingLogEntity).values(
                    log_id=log_uuid,
                    user_id=user_id,
                    book_id=book_uuid,
                    session_date=session_date,
                    pages_read=pages_read,
                    start_page=start_page,
                    end_page=end_page,
                    duration_minutes=duration_minutes,
                    session_note=session_note,
                    created_at=created_at,
                ).on_conflict_do_update(
                    index_elements=["log_id"],
                    set_={
                        "user_id": user_id,
                        "book_id": book_uuid,
                        "session_date": session_date,
                        "pages_read": pages_read,
                        "start_page": start_page,
                        "end_page": end_page,
                        "duration_minutes": duration_minutes,
                        "session_note": session_note,
                        "created_at": created_at,
                    }
                )
                await session.execute(stmt)
                logs_count += 1

            await session.commit()
            print(f"  -> Upserted {logs_count} reading logs into 'reading_logs' table (direct FK -> books.book_id)")

            # Step F: Migrate Lending with UUIDs and direct FK book_id -> books.book_id
            lending_count = 0
            for idx, r in enumerate(lending_raw, start=1):
                raw_book_id = sanitize_str(r.get("book_id"))
                book_uuid = sheet_to_uuid_map.get(raw_book_id)
                borrower = sanitize_str(r.get("borrower_name"))
                if not book_uuid or not borrower:
                    continue

                raw_lend_id = sanitize_str(r.get("lending_id")) or f"LEND-{idx:03d}"
                lending_uuid = to_uuid(user_id, "lending", raw_lend_id)

                borrower_contact = sanitize_str(r.get("borrower_contact"))
                lent_date = sanitize_str(r.get("lent_date")) or datetime.now(IST).strftime("%Y-%m-%d")
                due_date = sanitize_str(r.get("due_date"))
                returned_date = sanitize_str(r.get("returned_date"))

                raw_status = sanitize_str(r.get("status")) or sanitize_str(r.get("reading_status"))
                if returned_date or (raw_status and raw_status.upper() == "RETURNED"):
                    status = "RETURNED"
                else:
                    status = "ACTIVE"

                notes = sanitize_str(r.get("notes"))
                created_at = sanitize_str(r.get("created_at")) or lent_date

                stmt = pg_insert(LendingEntity).values(
                    lending_id=lending_uuid,
                    user_id=user_id,
                    book_id=book_uuid,
                    borrower_name=borrower,
                    borrower_contact=borrower_contact,
                    lent_date=lent_date,
                    due_date=due_date,
                    returned_date=returned_date,
                    status=status,
                    notes=notes,
                    created_at=created_at,
                ).on_conflict_do_update(
                    index_elements=["lending_id"],
                    set_={
                        "user_id": user_id,
                        "book_id": book_uuid,
                        "borrower_name": borrower,
                        "borrower_contact": borrower_contact,
                        "lent_date": lent_date,
                        "due_date": due_date,
                        "returned_date": returned_date,
                        "status": status,
                        "notes": notes,
                        "created_at": created_at,
                    }
                )
                await session.execute(stmt)
                lending_count += 1

            await session.commit()
            print(f"  -> Upserted {lending_count} lending records into 'lending' table (direct FK -> books.book_id)")

            # Step G: Migrate Wishlist with UUIDs
            wishlist_count = 0
            for idx, r in enumerate(wishlist_raw, start=1):
                title = sanitize_str(r.get("title"))
                if not title:
                    continue

                raw_wish_id = sanitize_str(r.get("wishlist_id")) or f"WISH-{idx:03d}"
                wishlist_uuid = to_uuid(user_id, "wishlist", raw_wish_id)

                authors = sanitize_str(r.get("authors"))
                isbn_13 = sanitize_str(r.get("isbn_13"))
                genre = sanitize_str(r.get("genre"))
                expected_rp = parse_float(r.get("expected_rp"))
                target_price = parse_float(r.get("target_price"))
                raw_pri = sanitize_str(r.get("priority")) or "MEDIUM"
                priority = raw_pri.upper() if raw_pri.upper() in ("LOW", "MEDIUM", "HIGH", "NORMAL") else "MEDIUM"
                notes = sanitize_str(r.get("notes"))
                created_at = sanitize_str(r.get("created_at")) or datetime.now(IST).strftime("%Y-%m-%d")

                stmt = pg_insert(WishlistEntity).values(
                    wishlist_id=wishlist_uuid,
                    user_id=user_id,
                    title=title,
                    authors=authors,
                    isbn_13=isbn_13,
                    genre=genre,
                    expected_rp=expected_rp,
                    target_price=target_price,
                    priority=priority,
                    notes=notes,
                    created_at=created_at,
                ).on_conflict_do_update(
                    index_elements=["wishlist_id"],
                    set_={
                        "user_id": user_id,
                        "title": title,
                        "authors": authors,
                        "isbn_13": isbn_13,
                        "genre": genre,
                        "expected_rp": expected_rp,
                        "target_price": target_price,
                        "priority": priority,
                        "notes": notes,
                        "created_at": created_at,
                    }
                )
                await session.execute(stmt)
                wishlist_count += 1

            await session.commit()
            print(f"  -> Upserted {wishlist_count} wishlist items into 'wishlist' table (with UUID primary keys)")

            # Step H: User Settings
            settings_dict = {}
            for r in settings_raw:
                k = r.get("key")
                v = r.get("value")
                if k:
                    settings_dict[k] = str(v) if v is not None else ""

            daily_goal = parse_int(settings_dict.get("daily_goal_pages")) or 15
            raw_active_book = sanitize_str(settings_dict.get("active_book_id"))
            active_book_uuid = sheet_to_uuid_map.get(raw_active_book) if raw_active_book else None
            theme = sanitize_str(settings_dict.get("theme")) or "light"

            # Derive active_book_uuid from latest reading log if not set
            if not active_book_uuid:
                latest_log_stmt = (
                    select(ReadingLogEntity.book_id)
                    .where(ReadingLogEntity.user_id == user_id)
                    .order_by(ReadingLogEntity.session_date.desc(), ReadingLogEntity.created_at.desc())
                    .limit(1)
                )
                active_book_uuid = (await session.execute(latest_log_stmt)).scalar_one_or_none()

            now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
            settings_stmt = pg_insert(UserSettingsEntity).values(
                user_id=user_id,
                daily_goal_pages=daily_goal,
                active_book_id=active_book_uuid,
                theme=theme,
                updated_at=now_str,
            ).on_conflict_do_update(
                index_elements=["user_id"],
                set_={
                    "daily_goal_pages": daily_goal,
                    "active_book_id": active_book_uuid,
                    "theme": theme,
                    "updated_at": now_str,
                }
            )
            await session.execute(settings_stmt)
            await session.commit()
            print(f"  -> Upserted user_settings (daily_goal={daily_goal}, active_book={active_book_uuid}, theme='{theme}')")

            # Final Verification
            print("\n" + "=" * 70)
            print("MIGRATION COMPLETED! Verifying database counts:")
            b_cnt = (await session.execute(text("SELECT count(*) FROM books WHERE user_id = :u"), {"u": user_id})).scalar()
            g_cnt = (await session.execute(text("SELECT count(*) FROM genres"))).scalar()
            bg_cnt = (await session.execute(text("SELECT count(*) FROM book_genres"))).scalar()
            l_cnt = (await session.execute(text("SELECT count(*) FROM reading_logs WHERE user_id = :u"), {"u": user_id})).scalar()
            w_cnt = (await session.execute(text("SELECT count(*) FROM wishlist WHERE user_id = :u"), {"u": user_id})).scalar()
            len_cnt = (await session.execute(text("SELECT count(*) FROM lending WHERE user_id = :u"), {"u": user_id})).scalar()
            set_row = (await session.execute(text("SELECT * FROM user_settings WHERE user_id = :u"), {"u": user_id})).mappings().first()

            print(f"  Total Books in DB           : {b_cnt} (UUID PK, no genre column)")
            print(f"  Total Genres in DB          : {g_cnt} (UUID PK)")
            print(f"  Total Book-Genre Links      : {bg_cnt} (Junction PK)")
            print(f"  Total Reading Logs in DB    : {l_cnt} (UUID PK -> Book UUID FK)")
            print(f"  Total Wishlist in DB        : {w_cnt} (UUID PK)")
            print(f"  Total Lending in DB         : {len_cnt} (UUID PK -> Book UUID FK)")
            if set_row:
                print(f"  User Settings in DB         : daily_goal={set_row['daily_goal_pages']}, active_book={set_row['active_book_id']}")
            print("=" * 70 + "\n")

    finally:
        await db_manager.close()


def main():
    parser = argparse.ArgumentParser(description="Fill Molat PostgreSQL DB from Google Sheets with UUIDs & Normalized Genres")
    parser.add_argument("--user-id", default="usr_65af3d94e2c6", help="Target user ID (default: usr_65af3d94e2c6)")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL") or settings.DATABASE_URL, help="PostgreSQL DSN")
    parser.add_argument("--bridge-url", default=DEFAULT_BRIDGE_URL, help="Google Sheets Apps Script Bridge URL")
    parser.add_argument("--bridge-token", default=DEFAULT_BRIDGE_TOKEN, help="Google Sheets Apps Script Bridge Token")
    parser.add_argument("--delete-all", action="store_true", help="Drop and recreate all tables and seed from scratch")
    parser.add_argument("--dry-run", action="store_true", help="Fetch sheet data without writing to database")

    args = parser.parse_args()
    asyncio.run(sync_data(
        user_id=args.user_id,
        database_url=args.database_url,
        bridge_url=args.bridge_url,
        bridge_token=args.bridge_token,
        delete_all=args.delete_all,
        dry_run=args.dry_run,
    ))


if __name__ == "__main__":
    main()
