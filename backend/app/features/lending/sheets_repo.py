# backend/app/features/lending/sheets_repo.py
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
import httpx
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn, LendingStatus, LENDING_COLUMNS
from app.features.lending.repository import LendingRepository

logger = logging.getLogger("molat.lending.sheets")
IST = ZoneInfo("Asia/Kolkata")


def _sanitize(val: Any) -> Any:
    if val is None:
        return ""
    s = str(val)
    if s.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + s
    return val


def _from_sheet_row(r: Dict[str, Any], user_id: str = "owner") -> LendingRecord:
    lent_date = str(r.get("lent_date") or "")
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
            d_d = datetime.strptime(str(due_date), "%Y-%m-%d").date()
            is_overdue = today > d_d
        except Exception:
            pass

    return LendingRecord(
        lending_id=str(r.get("lending_id") or ""),
        book_id=str(r.get("book_id") or ""),
        user_id=user_id,
        borrower_name=str(r.get("borrower_name") or ""),
        borrower_contact=r.get("borrower_contact") or None,
        lent_date=lent_date,
        due_date=str(due_date) if due_date else None,
        returned_date=str(r.get("returned_date")) if r.get("returned_date") else None,
        status=LendingStatus(status_val) if status_val in LendingStatus._value2member_map_ else LendingStatus.ACTIVE,
        notes=r.get("notes") or None,
        days_lent=days_lent,
        is_overdue=is_overdue,
        created_at=str(r.get("created_at") or ""),
    )


class SheetsLendingRepository(LendingRepository):
    def __init__(self, bridge_url: str, bridge_token: Optional[str] = None, book_repo=None):
        self.bridge_url = bridge_url
        self.bridge_token = bridge_token
        self.book_repo = book_repo

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=15.0, follow_redirects=True)

    async def list(self, status: Optional[str] = None, user_id: str = "owner", force_refresh: bool = False) -> List[LendingRecord]:
        params = {"table": "Lending"}
        if self.bridge_token:
            params["token"] = self.bridge_token
        try:
            async with self._client() as client:
                resp = await client.get(self.bridge_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                raw_rows = data.get("rows") or []
                records = []
                for idx, r in enumerate(raw_rows, start=1):
                    if not r.get("lending_id"):
                        r["lending_id"] = f"LEND-{idx:03d}"
                    if r.get("book_id"):
                        try:
                            records.append(_from_sheet_row(r, user_id=user_id))
                        except Exception as e:
                            logger.warning(f"Error parsing sheet lending row: {e}")

                if self.book_repo:
                    books = await self.book_repo.list(user_id=user_id)
                    book_map = {b.book_id: b for b in books}
                    for rec in records:
                        matched = book_map.get(rec.book_id)
                        if matched:
                            rec.book_title = matched.title
                            rec.book_authors = matched.authors
                            rec.book_cover_url = matched.cover_url

                if status:
                    t = status.upper().strip()
                    records = [r for r in records if r.status.value == t]
                return sorted(records, key=lambda x: (0 if x.status == LendingStatus.ACTIVE else 1, x.lent_date or ""), reverse=False)
        except Exception as e:
            logger.error(f"Failed to fetch lending records from sheets: {e}")
            return []

    async def get_active_for_book(self, book_id: str, user_id: str = "owner") -> Optional[LendingRecord]:
        records = await self.list(status="ACTIVE", user_id=user_id)
        for r in records:
            if r.book_id == book_id and r.status == LendingStatus.ACTIVE:
                return r
        return None

    async def create(self, payload: LendingRecordCreate, user_id: str = "owner") -> LendingRecord:
        existing = await self.list(user_id=user_id)
        max_num = 0
        for l in existing:
            if l.lending_id.startswith("LEND-"):
                try:
                    num = int(l.lending_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        new_id = f"LEND-{max_num + 1:03d}"
        lent_date = payload.lent_date or datetime.now(IST).strftime("%Y-%m-%d")
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

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
            created_at=today_str,
        )

        sheet_row = [
            record.lending_id,
            record.book_id,
            record.borrower_name,
            record.borrower_contact or "",
            record.lent_date,
            record.due_date or "",
            "",
            record.status.value,
            record.notes or "",
            record.created_at,
        ]

        payload_append = {
            "token": self.bridge_token or "",
            "action": "append",
            "table": "Lending",
            "record": dict(zip(LENDING_COLUMNS, [_sanitize(v) for v in sheet_row])),
        }
        async with self._client() as client:
            await client.post(self.bridge_url, json=payload_append)

        if self.book_repo:
            new_location = f"Lent to {payload.borrower_name}"
            await self.book_repo.update(payload.book_id, updates={"location": new_location}, user_id=user_id)
            matched = await self.book_repo.get(payload.book_id, user_id=user_id)
            if matched:
                record.book_title = matched.title
                record.book_authors = matched.authors
                record.book_cover_url = matched.cover_url

        return record

    async def return_book(self, lending_id: str, return_data: LendingRecordReturn, user_id: str = "owner") -> Optional[LendingRecord]:
        existing = await self.list(user_id=user_id)
        target = next((r for r in existing if r.lending_id == lending_id), None)
        if not target:
            return None

        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        notes = target.notes
        if return_data.notes:
            notes = (notes + "\n" if notes else "") + f"Return note: {return_data.notes}"

        target.status = LendingStatus.RETURNED
        target.returned_date = today_str
        target.notes = notes

        record_payload = {
            "lending_id": lending_id,
            "book_id": target.book_id,
            "borrower_name": target.borrower_name,
            "borrower_contact": target.borrower_contact or "",
            "lent_date": target.lent_date,
            "due_date": target.due_date or "",
            "returned_date": today_str,
            "status": "RETURNED",
            "notes": notes or "",
            "created_at": target.created_at or "",
        }

        payload_update = {
            "token": self.bridge_token or "",
            "action": "update",
            "table": "Lending",
            "keyField": "lending_id",
            "keyValue": lending_id,
            "record": dict(zip(LENDING_COLUMNS, [_sanitize(v) for v in record_payload.values()])),
        }
        async with self._client() as client:
            await client.post(self.bridge_url, json=payload_update)

        if self.book_repo:
            ret_location = return_data.return_location or "Home Shelf"
            await self.book_repo.update(target.book_id, updates={"location": ret_location}, user_id=user_id)

        return target
