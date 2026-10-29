from typing import List
from fastapi import APIRouter, HTTPException, Query, status
from app.models.metadata import MetadataCandidate
from app.models.responses import ApiResponse
from app.services.metadata_service import metadata_service

router = APIRouter(prefix="/metadata", tags=["Metadata"])


@router.get("/isbn/{isbn}", response_model=MetadataCandidate)
async def lookup_isbn(isbn: str):
    """Looks up bibliographic details by ISBN from Open Library / Google Books."""
    candidate = await metadata_service.lookup_isbn(isbn)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No metadata found for ISBN '{isbn}'",
        )
    return candidate


@router.get("/search", response_model=ApiResponse[List[MetadataCandidate]])
async def search_metadata(
    q: str = Query(..., min_length=2, description="Search by title, author, or keyword")
):
    """Searches external providers for candidate books."""
    candidates = await metadata_service.search(q)
    return ApiResponse(data=candidates, meta={"total": len(candidates)})

