# backend/tests/fakes.py
"""
Test fakes and in-memory doubles for offline pytest test suite execution.
Strictly isolated to backend/tests/ and NOT imported by production application code.
"""
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo

from app.storage.base import StorageFactory
from app.features.auth.repository import UserRepository, UserRecord
from app.features.books.models import Book, BookCreate, BookUpdate, BookCondition, ReadingStatus
from app.features.books.repository import BookRepository
from app.features.reading.models import ReadingLog, ReadingLogCreate
from app.features.reading.repository import ReadingRepository
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn, LendingStatus
from app.features.lending.repository import LendingRepository
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.features.wishlist.repository import WishlistRepository
from app.features.settings.models import UserSettings, UserSettingsUpdate
from app.features.settings.repository import SettingsRepository

IST = ZoneInfo("Asia/Kolkata")


class FakeUserRepository(UserRepository):
    def __init__(self):
        self._users_by_id: Dict[str, UserRecord] = {}

    async def get_by_id(self, user_id: str) -> Optional[UserRecord]:
        return self._users_by_id.get(user_id)

    async def get_by_identifier(self, identifier: str) -> Optional[UserRecord]:
        clean = identifier.strip().lower()
        for u in self._users_by_id.values():
            if u.email.lower() == clean or u.username.lower() == clean:
                return u
        return None

    async def get_by_email_or_username(self, email: str, username: str) -> Optional[UserRecord]:
        clean_email = email.strip().lower()
        clean_user = username.strip().lower()
        for u in self._users_by_id.values():
            if u.email.lower() == clean_email or u.username.lower() == clean_user:
                return u
        return None

    async def create(
        self, user_id: str, email: str, username: str, password_hash: str, role: str = "reader"
    ) -> UserRecord:
        record = UserRecord(
            id=user_id,
            email=email.strip().lower(),
            username=username.strip().lower(),
            password_hash=password_hash,
            role=role,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self._users_by_id[user_id] = record
        return record


class FakeBookRepository(BookRepository):
    def __init__(self):
        self._store: Dict[str, List[Book]] = defaultdict(list)

    def _generate_next_book_id(self, user_id: str) -> str:
        max_num = 0
        for b in self._store[user_id]:
            if b.book_id.startswith("BOOK-"):
                try:
                    num = int(b.book_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"BOOK-{max_num + 1:03d}"

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[Book]:
        return list(self._store[user_id])

    async def get(self, book_id: str, user_id: str = "owner") -> Optional[Book]:
        for b in self._store[user_id]:
            if b.book_id.strip() == book_id.strip():
                return b
        return None

    async def create(self, data: BookCreate, user_id: str = "owner") -> Book:
        new_id = self._generate_next_book_id(user_id)
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        book = Book(
            book_id=new_id,
            user_id=user_id,
            created_at=today_str,
            updated_at=today_str,
            **data.model_dump(),
        )
        self._store[user_id].insert(0, book)
        return book

    async def update(self, book_id: str, updates: BookUpdate, user_id: str = "owner") -> Optional[Book]:
        for idx, b in enumerate(self._store[user_id]):
            if b.book_id == book_id:
                today_str = datetime.now(IST).strftime("%Y-%m-%d")
                updated_book = b.model_copy(
                    update={**updates.model_dump(exclude_unset=True), "updated_at": today_str}
                )
                self._store[user_id][idx] = updated_book
                return updated_book
        return None

    async def delete(self, book_id: str, user_id: str = "owner") -> bool:
        before = len(self._store[user_id])
        self._store[user_id] = [b for b in self._store[user_id] if b.book_id != book_id]
        return len(self._store[user_id]) < before

    async def batch_update_covers(self, items: List[Dict[str, str]], user_id: str = "owner") -> int:
        cover_map = {item["book_id"]: item["cover_url"] for item in items if item.get("book_id") and item.get("cover_url")}
        count = 0
        for idx, b in enumerate(self._store[user_id]):
            if b.book_id in cover_map:
                self._store[user_id][idx] = b.model_copy(update={"cover_url": cover_map[b.book_id]})
                count += 1
        return count


class FakeReadingRepository(ReadingRepository):
    def __init__(self, book_repo=None):
        self._store: Dict[str, List[ReadingLog]] = defaultdict(list)
        self.book_repo = book_repo

    def _generate_next_log_id(self, user_id: str) -> str:
        max_num = 0
        for l in self._store[user_id]:
            if l.log_id.startswith("LOG-"):
                try:
                    num = int(l.log_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"LOG-{max_num + 1:03d}"

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[ReadingLog]:
        return list(self._store[user_id])

    async def create(self, data: ReadingLogCreate, user_id: str = "owner") -> ReadingLog:
        new_id = self._generate_next_log_id(user_id)
        clean_date = data.session_date or datetime.now(IST).strftime("%Y-%m-%d")
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        log = ReadingLog(
            log_id=new_id,
            book_id=data.book_id,
            user_id=user_id,
            session_date=clean_date,
            start_page=data.start_page or 0,
            end_page=data.end_page or 0,
            pages_read=data.pages_read or 0,
            duration_minutes=data.duration_minutes or 0,
            session_note=data.session_note,
            created_at=today_str,
        )
        self._store[user_id].insert(0, log)

        if self.book_repo and hasattr(self.book_repo, "_store"):
            for idx, b in enumerate(self.book_repo._store[user_id]):
                if b.book_id == data.book_id:
                    if data.finished_book:
                        self.book_repo._store[user_id][idx] = b.model_copy(
                            update={
                                "reading_status": ReadingStatus.COMPLETED,
                                "rating": data.rating if data.rating is not None else b.rating,
                                "updated_at": today_str,
                            }
                        )
                    elif b.reading_status == ReadingStatus.UNREAD:
                        self.book_repo._store[user_id][idx] = b.model_copy(
                            update={
                                "reading_status": ReadingStatus.READING,
                                "updated_at": today_str,
                            }
                        )
                    break

        return log


class FakeLendingRepository(LendingRepository):
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
            except (ValueError, TypeError):
                pass

        is_overdue = False
        if payload.due_date:
            try:
                d_d = datetime.strptime(payload.due_date, "%Y-%m-%d").date()
                is_overdue = today > d_d
            except (ValueError, TypeError):
                pass

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


class FakeWishlistRepository(WishlistRepository):
    def __init__(self, book_repo=None):
        self._store: Dict[str, List[WishlistItem]] = defaultdict(list)
        self.book_repo = book_repo

    def _generate_next_wishlist_id(self, user_id: str) -> str:
        max_num = 0
        for w in self._store[user_id]:
            if w.wishlist_id.startswith("WISH-"):
                try:
                    num = int(w.wishlist_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"WISH-{max_num + 1:03d}"

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[WishlistItem]:
        return list(self._store[user_id])

    async def create(self, data: WishlistItemCreate, user_id: str = "owner") -> WishlistItem:
        new_id = self._generate_next_wishlist_id(user_id)
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        item = WishlistItem(
            wishlist_id=new_id,
            user_id=user_id,
            created_at=today_str,
            **data.model_dump(),
        )
        self._store[user_id].insert(0, item)
        return item

    async def acquire(self, wishlist_id: str, acquire_data: WishlistAcquireRequest, user_id: str = "owner") -> Optional[Book]:
        target = next((w for w in self._store[user_id] if w.wishlist_id == wishlist_id), None)
        if not target:
            return None

        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        price = acquire_data.purchase_price if acquire_data.purchase_price is not None else target.target_price

        next_book_id = "BOOK-001"
        if self.book_repo and hasattr(self.book_repo, "_store"):
            max_num = 0
            for b in self.book_repo._store[user_id]:
                if b.book_id.startswith("BOOK-"):
                    try:
                        num = int(b.book_id.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except (IndexError, ValueError):
                        pass
            next_book_id = f"BOOK-{max_num + 1:03d}"

        new_book = Book(
            book_id=next_book_id,
            user_id=user_id,
            title=target.title,
            authors=target.authors,
            isbn_13=target.isbn_13,
            genre=target.genre,
            reading_status=ReadingStatus.UNREAD,
            condition=acquire_data.condition or BookCondition.GOOD,
            location=acquire_data.location or "Home Shelf",
            purchase_price=price,
            rp=target.expected_rp,
            purchase_date=today_str,
            notes=target.notes,
            created_at=today_str,
            updated_at=today_str,
        )

        if self.book_repo and hasattr(self.book_repo, "_store"):
            self.book_repo._store[user_id].insert(0, new_book)

        self._store[user_id] = [w for w in self._store[user_id] if w.wishlist_id != wishlist_id]
        return new_book


class FakeSettingsRepository(SettingsRepository):
    def __init__(self, reading_repo=None, book_repo=None):
        self._store: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"daily_goal_pages": 15, "active_book_id": None, "theme": "light", "updated_at": None}
        )
        self.reading_repo = reading_repo
        self.book_repo = book_repo

    async def get(self, user_id: str = "owner", force_refresh: bool = False) -> UserSettings:
        d = dict(self._store[user_id])
        active_book = d.get("active_book_id")

        if not active_book:
            if self.reading_repo:
                logs = await self.reading_repo.list(user_id=user_id)
                if logs:
                    active_book = logs[0].book_id
            if not active_book and self.book_repo:
                books = await self.book_repo.list(user_id=user_id)
                current = next((b for b in books if b.reading_status.value == "READING"), None)
                if current:
                    active_book = current.book_id

        return UserSettings(
            user_id=user_id,
            daily_goal_pages=d.get("daily_goal_pages", 15),
            active_book_id=active_book,
            theme=d.get("theme", "light"),
            updated_at=d.get("updated_at"),
        )

    async def update(self, updates: UserSettingsUpdate, user_id: str = "owner") -> UserSettings:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        if updates.daily_goal_pages is not None:
            self._store[user_id]["daily_goal_pages"] = max(1, min(500, updates.daily_goal_pages))
        if updates.active_book_id is not None:
            self._store[user_id]["active_book_id"] = updates.active_book_id
        if updates.theme is not None:
            self._store[user_id]["theme"] = "dark" if updates.theme == "dark" else "light"
        self._store[user_id]["updated_at"] = now_str

        return await self.get(user_id=user_id, force_refresh=True)


class FakeStorageFactory(StorageFactory):
    """Isolated In-Memory Storage Factory for Unit Testing only."""

    def __init__(self):
        self._users = FakeUserRepository()
        self._books = FakeBookRepository()
        self._reading = FakeReadingRepository(book_repo=self._books)
        self._lending = FakeLendingRepository(book_repo=self._books)
        self._wishlist = FakeWishlistRepository(book_repo=self._books)
        self._settings = FakeSettingsRepository(reading_repo=self._reading, book_repo=self._books)

    @property
    def users(self) -> Optional[FakeUserRepository]:
        return self._users

    @property
    def books(self) -> FakeBookRepository:
        return self._books

    @property
    def reading(self) -> FakeReadingRepository:
        return self._reading

    @property
    def lending(self) -> FakeLendingRepository:
        return self._lending

    @property
    def wishlist(self) -> FakeWishlistRepository:
        return self._wishlist

    @property
    def settings(self) -> FakeSettingsRepository:
        return self._settings

    async def close(self) -> None:
        pass
