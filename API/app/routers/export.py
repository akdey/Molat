from fastapi import APIRouter, Depends, Response
from app.core.security import get_current_owner
from app.services.sheets_service import sheets_service
from app.services.export_service import export_books_to_csv, export_books_to_json

router = APIRouter(prefix="/export", tags=["Export & Backup"])


@router.get("/csv")
async def export_csv(_: bool = Depends(get_current_owner)):
    """Exports all library records as sanitized CSV."""
    books = await sheets_service.list_books()
    csv_data = export_books_to_csv(books)

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="molat_library_export.csv"'},
    )


@router.get("/json")
async def export_json(_: bool = Depends(get_current_owner)):
    """Exports a full JSON backup including schema version and timestamp."""
    books = await sheets_service.list_books()
    return export_books_to_json(books)

