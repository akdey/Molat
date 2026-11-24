# backend/app/features/lending/postgres_repo.py
from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo
import asyncpg
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn, LendingStatus
from app.features.lending.repository import LendingRepository

IST = ZoneInfo("Asia/Kolkata")


def _to_lending(r: asyncpg.Record) -> LendingRecord:
    lent_date = r["lent_date"]
    today = datetime.now(IST).date()
    days_lent = 0
    try:
        l_d = datetime.strptime(lent_date, "%Y-%m-%d").date()
        days_lent = max(0, (today - l_d).days)
    except Exception:
        pass

    is_overdue = False
    due_date = r.get("due_date")
    status_val = r.get("status")
    if due_date and (status_val == "ACTIVE" or status_val == LendingStatus.ACTIVE):
        try:
            d_d = datetime.strptime(due_date, "%Y-%m-%d").date()
            is_overdue = today > d_d
        except Exception:
            pass

    return LendingRecord(
        lending_id=r["lending_id"],
        book_id=r["book_id"],
        user_id=r["user_id"],
        borrower_name=r["borrower_name"],
        borrower_contact=r.get("borrower_contact"),
        lent_date=lent_date,
        due_date=due_date,
        returned_date=r.get("returned_date"),
        status=LendingStatus(status_val) if status_val else LendingStatus.ACTIVE,
        notes=r.get("notes"),
        days_lent=days_lent,
        is_overdue=is_overdue,
        book_title=r.get("book_title"),
        book_authors=r.get("book_authors"),
        book_cover_url=r.get("book_cover_url"),
        created_at=r.get("created_at") or "",
    )


class PostgresLendingRepository(LendingRepository):
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def list(self, status: Optional[str] = None, user_id: str = "owner", force_refresh: bool = False) -> List[LendingRecord]:
        query = """
            SELECT l.user_id, l.lending_id, l.book_id, l.borrower_name, l.borrower_contact,
                   l.lent_date, l.due_date, l.returned_date, l.status, l.notes, l.created_at,
                   b.title as book_title, b.authors as book_authors, b.cover_url as book_cover_url
            FROM lending l
            LEFT JOIN books b ON l.user_id = b.user_id AND l.book_id = b.book_id
            WHERE l.user_id = $1
            ORDER BY (CASE WHEN l.status = 'ACTIVE' THEN 0 ELSE 1 END), l.lent_date DESC
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, user_id)
            records = [_to_lending(r) for r in rows]
            if status:
                target_status = status.upper().strip()
                records = [r for r in records if r.status.value == target_status]
            return records

    async def get_active_for_book(self, book_id: str, user_id: str = "owner") -> Optional[LendingRecord]:
        records = await self.list(status="ACTIVE", user_id=user_id)
        for r in records:
            if r.book_id == book_id and r.status == LendingStatus.ACTIVE:
                return r
        return None

    async def _generate_next_lending_id(self, user_id: str) -> str:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT lending_id FROM lending WHERE user_id = $1", user_id)
            max_num = 0
            for r in rows:
                lid = r["lending_id"]
                if lid.startswith("LEND-"):
                    try:
                        num = int(lid.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except (IndexError, ValueError):
                        pass
            return f"LEND-{max_num + 1:03d}"

    async def create(self, payload: LendingRecordCreate, user_id: str = "owner") -> LendingRecord:
        new_id = await self._generate_next_lending_id(user_id)
        lent_date = payload.lent_date or datetime.now(IST).strftime("%Y-%m-%d")
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        new_location = f"Lent to {payload.borrower_name}"

        today = datetime.now(IST).date()
        days_lent = 0
        try:
            l_d = datetime.strptime(lent_date, "%Y-%m-%d").date()
            days_lent = max(0, (today - l_d).days)
        except Exception:
            pass

        is_overdue = False
        if payload.due_date:
            try:
                d_d = datetime.strptime(payload.due_date, "%Y-%m-%d").date()
                is_overdue = today > d_d
            except Exception:
                pass

        async with self.pool.acquire() as conn:
            async with conn.transaction():
                # 1. Fetch book metadata for joined view
                book_row = await conn.fetchrow(
                    "SELECT title, authors, cover_url FROM books WHERE user_id = $1 AND book_id = $2",
                    user_id,
                    payload.book_id,
                )
                # 2. Insert lending record
                await conn.execute(
                    """
                    INSERT INTO lending (
                        user_id, lending_id, book_id, borrower_name, borrower_contact,
                        lent_date, due_date, returned_date, status, notes, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    """,
                    user_id,
                    new_id,
                    payload.book_id,
                    payload.borrower_name,
                    payload.borrower_contact,
                    lent_date,
                    payload.due_date,
                    None,
                    "ACTIVE",
                    payload.notes,
                    today_str,
                )
                # 3. Update book location
                await conn.execute(
                    "UPDATE books SET location = $1, updated_at = $2 WHERE user_id = $3 AND book_id = $4",
                    new_location,
                    today_str,
                    user_id,
                    payload.book_id,
                )

        return LendingRecord(
            lending_id=new_id,
            book_id=payload.book_id,
            user_id=user_id,
            borrower_name=payload.borrower_name,
            borrower_contact=payload.borrower_contact,
            lent_date=lent_date,
            due_date=payload.due_date,
            status=LendingStatus.ACTIVE,
            notes=payload.notes,
            days_lent=days_lent,
            is_overdue=is_overdue,
            created_at=today_str,
            book_title=book_row["title"] if book_row else None,
            book_authors=book_row["authors"] if book_row else None,
            book_cover_url=book_row["cover_url"] if book_row else None,
        )

    async def return_book(self, lending_id: str, return_data: LendingRecordReturn, user_id: str = "owner") -> Optional[LendingRecord]:
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        ret_location = return_data.return_location or "Home Shelf"

        async with self.pool.acquire() as conn:
            async with conn.transaction():
                target = await conn.fetchrow(
                    "SELECT book_id, notes, lent_date FROM lending WHERE user_id = $1 AND lending_id = $2",
                    user_id,
                    lending_id,
                )
                if not target:
                    return None

                notes = target["notes"]
                if return_data.notes:
                    notes = (notes + "\n" if notes else "") + f"Return note: {return_data.notes}"

                # Update lending
                await conn.execute(
                    "UPDATE lending SET status = 'RETURNED', returned_date = $1, notes = $2 WHERE user_id = $3 AND lending_id = $4",
                    today_str,
                    notes,
                    user_id,
                    lending_id,
                )
                # Restore book location
                await conn.execute(
                    "UPDATE books SET location = $1, updated_at = $2 WHERE user_id = $3 AND book_id = $4",
                    ret_location,
                    today_str,
                    user_id,
                    target["book_id"],
                )

        records = await self.list(user_id=user_id)
        for r in records:
            if r.lending_id == lending_id:
                return r
        return None
