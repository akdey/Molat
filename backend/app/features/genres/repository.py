# backend/app/features/genres/repository.py
import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.genres.entity import GenreEntity
from app.features.genres.models import Genre, GenreCreate


class GenreRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self) -> List[Genre]:
        stmt = select(GenreEntity).order_by(GenreEntity.name.asc())
        res = await self.session.execute(stmt)
        rows = res.scalars().all()
        return [Genre(id=r.id, name=r.name, color=r.color, created_at=r.created_at) for r in rows]

    async def get_or_create(self, name: str, color: Optional[str] = None) -> GenreEntity:
        clean_name = name.strip()
        stmt = select(GenreEntity).where(GenreEntity.name == clean_name)
        res = await self.session.execute(stmt)
        genre = res.scalar_one_or_none()
        if not genre:
            genre = GenreEntity(id=str(uuid.uuid4()), name=clean_name, color=color)
            self.session.add(genre)
            await self.session.flush()
        return genre
