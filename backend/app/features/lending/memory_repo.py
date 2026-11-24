# backend/app/features/lending/memory_repo.py
import logging
from collections import defaultdict
from datetime import datetime
from typing import List, Optional, Dict
from zoneinfo import ZoneInfo
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn, LendingStatus
from app.features.lending.repository import LendingRepository

logger = logging.getLogger("molat.lending.memory")
IST = ZoneInfo("Asia/Kolkata")


class MemoryLendingRepository(LendingRepository):
    def __init__(self, book_repo=None):
        self._store: Dict[str, List[LendingRecord]] = defaultdict(list)
        self.book_repo = book_repo

    def _generate_next_lending_id(self, user_id: str) -> str:
        max_num = 0
        for l in self._store[user_id]:
            if l.lending_id.startswith("LEND-"):
                try:
                    num = int(l.lending_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"LEND-{max_num + 1:03d}"

    async def list(self, status: Optional[str] = None, user_id: str = "owner", force_refresh: bool = False) -> List[LendingRecord]:
        records = list(self._store[user_id])
        if self.book_repo and hasattr(self.book_repo, "_store"):
            book_map = {b.book_id: b for b in self.book_repo._store[user_id]}
            for r in records:
                matched = book_map.get(r.book_id)
                if matched:
                    r.book_title = matched.title
                    r.book_authors = matched.authors
                    r.book_cover_url = matched.cover_url

        if status:
            target = status.upper().strip()
            records = [r for r in records if r.status.value == target]
        return sorted(records, key=lambda x: (0 if x.status == LendingStatus.ACTIVE else 1, x.lent_date or ""), reverse=False)

    async def get_active_for_book(self, book_id: str, user_id: str = "owner") -> Optional[LendingRecord]:
        records = await self.list(status="ACTIVE", user_id=user_id)
        for r in records:
            if r.book_id == book_id and r.status == LendingStatus.ACTIVE:
                return r
        return None

    async def create(self, payload: LendingRecordCreate, user_id: str = "owner") -> LendingRecord:
        new_id = self._generate_next_lending_id(user_id)
        lent_date = payload.lent_date or datetime.now(IST).strftime("%Y-%m-%d")
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        new_location = f"Lent to {payload.borrower_name}"

        today = datetime.now(IST).date()
        days_lent = 0
        if lent_date:
            try:
                l_d = datetime.strptime(lent_date, "%Y-%m-%d").date()
                days_lent = max(0, (today - l_d).days)
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not parse lent_date '{lent_date}': {e}")

        is_overdue = False
        if payload.due_date:
            try:
                d_d = datetime.strptime(payload.due_date, "%Y-%m-%d").date()
                is_overdue = today > d_d
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not parse due_date '{payload.due_date}': {e}")

        book_title, book_authors, book_cover = None, None, None
        if self.book_repo and hasattr(self.book_repo, "_store"):
            for idx, b in enumerate(self.book_repo._store[user_id]):
                if b.book_id == payload.book_id:
                    book_title = b.title
                    book_authors = b.authors
                    book_cover = b.cover_url
                    self.book_repo._store[user_id][idx] = b.model_copy(
                        update={"location": new_location, "updated_at": today_str}
                    )
                    break

        record = LendingRecord(
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
            book_title=book_title,
            book_authors=book_authors,
            book_cover_url=book_cover,
        )
        self._store[user_id].insert(0, record)
        return record

    async def return_book(self, lending_id: str, return_data: LendingRecordReturn, user_id: str = "owner") -> Optional[LendingRecord]:
        for idx, r in enumerate(self._store[user_id]):
            if r.lending_id == lending_id:
                today_str = datetime.now(IST).strftime("%Y-%m-%d")
                notes = r.notes
                if return_data.notes:
                    notes = (notes + "\n" if notes else "") + f"Return note: {return_data.notes}"

                updated = r.model_copy(
                    update={
                        "status": LendingStatus.RETURNED,
                        "returned_date": today_str,
                        "notes": notes,
                        "is_overdue": False,
                    }
                )
                self._store[user_id][idx] = updated

                # Restore location in book repo
                ret_location = return_data.return_location or "Home Shelf"
                if self.book_repo and hasattr(self.book_repo, "_store"):
                    for idx_b, b in enumerate(self.book_repo._store[user_id]):
                        if b.book_id == r.book_id:
                            self.book_repo._store[user_id][idx_b] = b.model_copy(
                                update={"location": ret_location, "updated_at": today_str}
                            )
                            updated.book_title = b.title
                            updated.book_authors = b.authors
                            updated.book_cover_url = b.cover_url
                            break
                return updated
        return None
