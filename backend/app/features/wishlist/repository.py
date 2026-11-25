# backend/app/features/wishlist/repository.py
from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.wishlist.entity import WishlistEntity
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.features.books.entity import BookEntity
from app.features.books.models import Book, BookCondition, ReadingStatus
from app.features.books.repository import _to_book

IST = ZoneInfo("Asia/Kolkata")


def _to_wishlist(e: WishlistEntity) -> WishlistItem:
    return WishlistItem(
        wishlist_id=e.wishlist_id,
        user_id=e.user_id,
        title=e.title,
        authors=e.authors,
        isbn_13=e.isbn_13,
        genre=e.genre,
        expected_rp=float(e.expected_rp) if e.expected_rp is not None else None,
        target_price=float(e.target_price) if e.target_price is not None else None,
        priority=e.priority or "MEDIUM",
        notes=e.notes,
        created_at=e.created_at or "",
    )


class WishlistRepository:
    """SQLAlchemy 2.0 async repository for Wishlist management."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[WishlistItem]:
        stmt = (
            select(WishlistEntity)
            .where(WishlistEntity.user_id == user_id)
            .order_by(WishlistEntity.wishlist_id.asc())
        )
        result = await self.session.execute(stmt)
        entities = result.scalars().all()
        return [_to_wishlist(e) for e in entities]

    async def _generate_next_wishlist_id(self, user_id: str) -> str:
        stmt = select(WishlistEntity.wishlist_id).where(WishlistEntity.user_id == user_id)
        result = await self.session.execute(stmt)
        wishlist_ids = result.scalars().all()
        max_num = 0
        for wid in wishlist_ids:
            if wid.startswith("WISH-"):
                try:
                    num = int(wid.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"WISH-{max_num + 1:03d}"

    async def _generate_next_book_id(self, user_id: str) -> str:
        stmt = select(BookEntity.book_id).where(BookEntity.user_id == user_id)
        result = await self.session.execute(stmt)
        book_ids = result.scalars().all()
        max_num = 0
        for bid in book_ids:
            if bid.startswith("BOOK-"):
                try:
                    num = int(bid.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"BOOK-{max_num + 1:03d}"

    async def create(self, data: WishlistItemCreate, user_id: str = "owner") -> WishlistItem:
        new_id = await self._generate_next_wishlist_id(user_id)
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        entity = WishlistEntity(
            wishlist_id=new_id,
            user_id=user_id,
            title=data.title,
            authors=data.authors,
            isbn_13=data.isbn_13,
            genre=data.genre,
            expected_rp=data.expected_rp,
            target_price=data.target_price,
            priority=data.priority or "MEDIUM",
            notes=data.notes,
            created_at=now_str,
        )
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return _to_wishlist(entity)

    async def delete(self, wishlist_id: str, user_id: str = "owner") -> bool:
        stmt = delete(WishlistEntity).where(WishlistEntity.user_id == user_id, WishlistEntity.wishlist_id == wishlist_id)
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0

    async def acquire(self, wishlist_id: str, req: WishlistAcquireRequest, user_id: str = "owner") -> Optional[Book]:
        stmt = select(WishlistEntity).where(WishlistEntity.user_id == user_id, WishlistEntity.wishlist_id == wishlist_id)
        result = await self.session.execute(stmt)
        w_item = result.scalar_one_or_none()
        if not w_item:
            return None

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        purchase_date = datetime.now(IST).strftime("%Y-%m-%d")
        new_book_id = await self._generate_next_book_id(user_id)

        book_entity = BookEntity(
            user_id=user_id,
            book_id=new_book_id,
            title=w_item.title,
            authors=w_item.authors,
            isbn_13=w_item.isbn_13,
            genre=w_item.genre,
            reading_status="UNREAD",
            condition=req.condition.value if hasattr(req.condition, "value") else str(req.condition or "Good"),
            location=req.location or "Home Shelf",
            purchase_price=req.purchase_price if req.purchase_price is not None else (float(w_item.target_price) if w_item.target_price else 0.0),
            rp=float(w_item.expected_rp) if w_item.expected_rp else (req.purchase_price or 0.0),
            purchase_date=purchase_date,
            notes=f"Acquired from Wishlist ({wishlist_id}). {w_item.notes or ''}".strip(),
            created_at=now_str,
            updated_at=now_str,
        )
        self.session.add(book_entity)
        await self.session.delete(w_item)
        await self.session.commit()
        await self.session.refresh(book_entity)
        return _to_book(book_entity)
