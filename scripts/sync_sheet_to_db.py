#!/usr/bin/env python3
"""
Sync Script: Migrates all data from Google Sheets (via Apps Script bridge)
into PostgreSQL database using SQLAlchemy 2.0 entities with strict relational
and composite foreign key constraints.

Supports:
  - Deleting/resetting all database tables or user records
  - Recreating the schema via SQLAlchemy Base.metadata.create_all
  - Preserving/seeding the target user (usr_65af3d94e2c6)
  - Bulk upserting Books, Reading Logs, Lending records, Wishlist, and Settings
  - Enforcing composite foreign keys: (user_id, book_id) -> books(user_id, book_id)

Usage:
    python scripts/sync_sheet_to_db.py [--user-id usr_65af3d94e2c6] [--delete-all] [--recreate-schema] [--dry-run]
"""

import argparse
import asyncio
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
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
from app.features.reading.entity import ReadingLogEntity
from app.features.lending.entity import LendingEntity
from app.features.wishlist.entity import WishlistEntity
from app.features.settings.entity import UserSettingsEntity

IST = ZoneInfo("Asia/Kolkata")

DEFAULT_BRIDGE_URL = (
    os.getenv("GOOGLE_SHEETS_BRIDGE_URL")
    or "https://script.google.com/macros/s/AKfycbxCdmH4h2izNcqn_5FsHjmBDQYrPaU5goFHjxw9edalQp8_lywbEi41V-YK7qLbXjw/exec"
)
DEFAULT_BRIDGE_TOKEN = os.getenv("BRIDGE_TOKEN") or "molat-secret-token-3232"

# Default owner / user seed details
DEFAULT_USER = {
    "id": "usr_65af3d94e2c6",
    "email": "amitkr.dey1998@gmail.com",
    "username": "akdey",
    "password_hash": "$2b$12$M1p/uVTQEJuXUFb2N8M6U.rj9ERxOQ298QnaATfjJwDrz3kVNT/J2",
    "role": "reader",
}


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
        cleaned = re.sub(r"[^\d.-]", "", str(val).strip())
        if not cleaned or cleaned in ("-", ".", "-."):
            return None
        return int(float(cleaned))
    except (ValueError, TypeError):
        return None


def sanitize_str(val: Any) -> Optional[str]:
    """Convert value to string, stripping formula quotes and whitespace."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    if s.startswith("'"):
        s = s[1:]
    return s.strip() if s.strip() else None


async def fetch_sheet_table(client: httpx.AsyncClient, bridge_url: str, table_name: str, token: Optional[str]) -> List[Dict[str, Any]]:
    """Fetch raw JSON rows for a given table from the Google Sheets Apps Script bridge."""
    params = {"table": table_name}
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
    recreate_schema: bool = False,
    dry_run: bool = False,
):
    print("=" * 70)
    print("Molat Google Sheets -> PostgreSQL Relational Sync")
    print(f"Target User ID   : {user_id}")
    print(f"Delete Everything: {'YES' if delete_all else 'NO'}")
    print(f"Recreate Schema  : {'YES' if recreate_schema else 'NO'}")
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

    # 2. Connect to PostgreSQL using SQLAlchemy 2.0 AsyncEngine
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
            # Step A: Drop & Recreate schema or Truncate all tables if requested
            if delete_all or recreate_schema:
                print("  -> Deleting all tables and recreating clean relational schema...")
                async with db_manager.engine.begin() as conn:
                    await conn.run_sync(Base.metadata.drop_all)
                    await conn.run_sync(Base.metadata.create_all)
                print("  -> Schema recreated successfully with all constraints and relations.")

            # Step B: Ensure target user exists in 'users' table
            user_stmt = select(UserEntity).where(UserEntity.id == user_id)
            user_ent = (await session.execute(user_stmt)).scalar_one_or_none()

            if not user_ent:
                print(f"  -> User '{user_id}' not found in 'users' table. Seeding user...")
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

            # Step C: Migrate Books (Parent table for composite relations)
            print("\n[3/3] Migrating entities into PostgreSQL with relational integrity...")
            valid_book_ids = set()
            books_count = 0

            for idx, r in enumerate(books_raw, start=1):
                book_id = sanitize_str(r.get("book_id")) or f"BOOK-{idx:03d}"
                title = sanitize_str(r.get("title")) or "Untitled"
                subtitle = sanitize_str(r.get("subtitle"))
                authors = sanitize_str(r.get("authors"))
                isbn_10 = sanitize_str(r.get("isbn_10"))
                isbn_13 = sanitize_str(r.get("isbn_13"))
                publisher = sanitize_str(r.get("publisher"))
                publication_year = parse_int(r.get("publication_year"))
                language = sanitize_str(r.get("language")) or "English"
                genre = sanitize_str(r.get("genre"))
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

                # Upsert into books table
                stmt = pg_insert(BookEntity).values(
                    user_id=user_id,
                    book_id=book_id,
                    title=title,
                    subtitle=subtitle,
                    authors=authors,
                    isbn_10=isbn_10,
                    isbn_13=isbn_13,
                    publisher=publisher,
                    publication_year=publication_year,
                    language=language,
                    genre=genre,
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
                    index_elements=["user_id", "book_id"],
                    set_={
                        "title": title,
                        "subtitle": subtitle,
                        "authors": authors,
                        "isbn_10": isbn_10,
                        "isbn_13": isbn_13,
                        "publisher": publisher,
                        "publication_year": publication_year,
                        "language": language,
                        "genre": genre,
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
                valid_book_ids.add(book_id)
                books_count += 1

            await session.commit()
            print(f"  -> Upserted {books_count} books into 'books' table")

            # Step D: Migrate Reading Logs with composite foreign key (user_id, book_id)
            logs_count = 0
            for idx, r in enumerate(reading_logs_raw, start=1):
                book_id = sanitize_str(r.get("book_id"))
                if not book_id:
                    continue
                if book_id not in valid_book_ids:
                    print(f"  [WARN] Skipping reading log {r.get('log_id')}: book_id '{book_id}' does not exist in 'books'!")
                    continue

                log_id = sanitize_str(r.get("log_id")) or f"LOG-{idx:03d}"
                session_date = sanitize_str(r.get("session_date")) or datetime.now(IST).strftime("%Y-%m-%d")
                start_page = parse_int(r.get("start_page")) or 0
                end_page = parse_int(r.get("end_page")) or 0
                raw_pages = parse_int(r.get("pages_read"))
                calc_pages = (end_page - start_page + 1) if (end_page >= start_page and start_page >= 1) else max(0, end_page - start_page)
                pages_read = raw_pages if raw_pages is not None else calc_pages
                duration_minutes = parse_int(r.get("duration_minutes")) or 0
                session_note = sanitize_str(r.get("session_note"))
                created_at = sanitize_str(r.get("created_at")) or session_date

                stmt = pg_insert(ReadingLogEntity).values(
                    log_id=log_id,
                    user_id=user_id,
                    book_id=book_id,
                    session_date=session_date,
                    start_page=start_page,
                    end_page=end_page,
                    pages_read=pages_read,
                    duration_minutes=duration_minutes,
                    session_note=session_note,
                    created_at=created_at,
                ).on_conflict_do_update(
                    index_elements=["log_id"],
                    set_={
                        "user_id": user_id,
                        "book_id": book_id,
                        "session_date": session_date,
                        "start_page": start_page,
                        "end_page": end_page,
                        "pages_read": pages_read,
                        "duration_minutes": duration_minutes,
                        "session_note": session_note,
                        "created_at": created_at,
                    }
                )
                await session.execute(stmt)
                logs_count += 1

            await session.commit()
            print(f"  -> Upserted {logs_count} reading logs into 'reading_logs' table (composite FK satisfied)")

            # Step E: Migrate Lending Records with composite foreign key (user_id, book_id)
            lending_count = 0
            for idx, r in enumerate(lending_raw, start=1):
                book_id = sanitize_str(r.get("book_id"))
                borrower = sanitize_str(r.get("borrower_name"))
                if not book_id or not borrower:
                    continue
                if book_id not in valid_book_ids:
                    print(f"  [WARN] Skipping lending record {r.get('lending_id')}: book_id '{book_id}' does not exist in 'books'!")
                    continue

                lending_id = sanitize_str(r.get("lending_id")) or f"LEND-{idx:03d}"
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
                    lending_id=lending_id,
                    user_id=user_id,
                    book_id=book_id,
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
                        "book_id": book_id,
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
            print(f"  -> Upserted {lending_count} lending records into 'lending' table (composite FK satisfied)")

            # Step F: Migrate Wishlist
            wishlist_count = 0
            for idx, r in enumerate(wishlist_raw, start=1):
                title = sanitize_str(r.get("title"))
                if not title:
                    continue
                wishlist_id = sanitize_str(r.get("wishlist_id")) or f"WISH-{idx:03d}"
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
                    wishlist_id=wishlist_id,
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
            print(f"  -> Upserted {wishlist_count} wishlist items into 'wishlist' table")

            # Step G: User Settings
            settings_dict = {}
            for r in settings_raw:
                k = r.get("key")
                v = r.get("value")
                if k:
                    settings_dict[k] = str(v) if v is not None else ""

            daily_goal = parse_int(settings_dict.get("daily_goal_pages")) or 15
            active_book = sanitize_str(settings_dict.get("active_book_id"))
            theme = sanitize_str(settings_dict.get("theme")) or "light"

            # Derive active_book if not specified in Settings
            if not active_book or active_book not in valid_book_ids:
                # 1. From latest reading log
                latest_log_stmt = (
                    select(ReadingLogEntity.book_id)
                    .where(ReadingLogEntity.user_id == user_id)
                    .order_by(ReadingLogEntity.session_date.desc(), ReadingLogEntity.created_at.desc())
                    .limit(1)
                )
                active_book = (await session.execute(latest_log_stmt)).scalar_one_or_none()

            if not active_book or active_book not in valid_book_ids:
                # 2. From first READING book
                reading_book_stmt = (
                    select(BookEntity.book_id)
                    .where(BookEntity.user_id == user_id, BookEntity.reading_status == "READING")
                    .limit(1)
                )
                active_book = (await session.execute(reading_book_stmt)).scalar_one_or_none()

            now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
            settings_stmt = pg_insert(UserSettingsEntity).values(
                user_id=user_id,
                daily_goal_pages=daily_goal,
                active_book_id=active_book,
                theme=theme,
                updated_at=now_str,
            ).on_conflict_do_update(
                index_elements=["user_id"],
                set_={
                    "daily_goal_pages": daily_goal,
                    "active_book_id": active_book,
                    "theme": theme,
                    "updated_at": now_str,
                }
            )
            await session.execute(settings_stmt)
            await session.commit()
            print(f"  -> Upserted user_settings (daily_goal={daily_goal}, active_book={active_book}, theme='{theme}')")

            # Step H: Final verification query
            print("\n" + "=" * 70)
            print("MIGRATION COMPLETED! Verifying database counts:")
            b_cnt = (await session.execute(text("SELECT count(*) FROM books WHERE user_id = :u"), {"u": user_id})).scalar()
            l_cnt = (await session.execute(text("SELECT count(*) FROM reading_logs WHERE user_id = :u"), {"u": user_id})).scalar()
            w_cnt = (await session.execute(text("SELECT count(*) FROM wishlist WHERE user_id = :u"), {"u": user_id})).scalar()
            len_cnt = (await session.execute(text("SELECT count(*) FROM lending WHERE user_id = :u"), {"u": user_id})).scalar()
            set_row = (await session.execute(text("SELECT * FROM user_settings WHERE user_id = :u"), {"u": user_id})).mappings().first()

            print(f"  Total Books in DB        : {b_cnt}")
            print(f"  Total Reading Logs in DB : {l_cnt}")
            print(f"  Total Wishlist in DB     : {w_cnt}")
            print(f"  Total Lending in DB      : {len_cnt}")
            if set_row:
                print(f"  User Settings in DB      : daily_goal={set_row['daily_goal_pages']}, active_book={set_row['active_book_id']}, theme={set_row['theme']}")
            print("=" * 70 + "\n")

    finally:
        await db_manager.close()


def main():
    parser = argparse.ArgumentParser(description="Fill Molat PostgreSQL DB from Google Sheets bridge for a user")
    parser.add_argument("--user-id", default="usr_65af3d94e2c6", help="Target user ID (default: usr_65af3d94e2c6)")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL") or settings.DATABASE_URL, help="PostgreSQL DSN")
    parser.add_argument("--bridge-url", default=DEFAULT_BRIDGE_URL, help="Google Sheets Apps Script Bridge URL")
    parser.add_argument("--bridge-token", default=DEFAULT_BRIDGE_TOKEN, help="Google Sheets Apps Script Bridge Token")
    parser.add_argument("--delete-all", action="store_true", help="Delete all domain table records before filling")
    parser.add_argument("--recreate-schema", action="store_true", help="Drop and recreate all tables and constraints")
    parser.add_argument("--dry-run", action="store_true", help="Fetch sheet data without writing to database")

    args = parser.parse_args()
    asyncio.run(sync_data(
        user_id=args.user_id,
        database_url=args.database_url,
        bridge_url=args.bridge_url,
        bridge_token=args.bridge_token,
        delete_all=args.delete_all,
        recreate_schema=args.recreate_schema,
        dry_run=args.dry_run,
    ))


if __name__ == "__main__":
    main()
