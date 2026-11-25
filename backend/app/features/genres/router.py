# backend/app/features/genres/router.py
from typing import List
from fastapi import APIRouter, Depends
from app.features.genres.models import Genre
from app.features.genres.repository import GenreRepository
from app.features.genres.dependencies import get_genre_repo

router = APIRouter(prefix="/genres", tags=["genres"])


@router.get("", response_model=List[Genre])
async def list_genres(
    repo: GenreRepository = Depends(get_genre_repo),
):
    return await repo.list()
