import json
import logging
import uuid
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any

from app.core.config import settings
from app.models.book import Book, BookCreate, BookUpdate, SHEET_COLUMNS

logger = logging.getLogger(__name__)

# Fallback starter records for unconfigured/local dev environment
INITIAL_MOCK_BOOKS: List[Dict[str, Any]] = [
    {
        "Book_ID": "bk_001",
        "Title": "The Name of the Rose",
        "Subtitle": "A Novel",
        "Author": "Umberto Eco",
        "ISBN_13": "9780156001311",
        "Publisher": "Harcourt",
        "Publication_Year": 1980,
        "Language": "English",
        "Genre": "Historical Fiction",
        "Ownership_Status": "Owned",
        "Reading_Status": "Completed",
        "Current_Page": 502,
        "Total_Pages": 502,
        "Purchase_Price": 699,
        "Condition": "Good",
        "Shelf_Location": "Fiction A",
        "Personal_Rating": 5,
        "Cover_URL": "https://covers.openlibrary.org/b/isbn/9780156001311-L.jpg",
        "Metadata_Verified": True,
        "Created_At": "2024-01-15T10:00:00Z",
        "Updated_At": "2024-03-20T08:30:00Z",
        "Row_Version": 1,
    },
    {
        "Book_ID": "bk_002",
        "Title": "Thinking, Fast and Slow",
        "Author": "Daniel Kahneman",
        "ISBN_13": "9780374533557",
        "Publisher": "Farrar, Straus and Giroux",
        "Publication_Year": 2011,
        "Language": "English",
        "Genre": "Psychology",
        "Ownership_Status": "Owned",
        "Reading_Status": "Reading",
        "Current_Page": 218,
        "Total_Pages": 499,
        "Purchase_Price": 899,
        "Purchase_Date": "2023-11-10",
        "Condition": "New",
        "Shelf_Location": "Non-Fiction B",
        "Cover_URL": "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
        "Metadata_Verified": True,
        "Created_At": "2023-11-10T14:00:00Z",
        "Updated_At": "2024-10-01T09:00:00Z",
        "Row_Version": 1,
    },
    {
        "Book_ID": "bk_003",
        "Title": "The Remains of the Day",
        "Author": "Kazuo Ishiguro",
        "ISBN_13": "9780679731726",
        "Publisher": "Vintage",
        "Publication_Year": 1988,
        "Language": "English",
        "Genre": "Literary Fiction",
        "Ownership_Status": "Owned",
        "Reading_Status": "Unread",
        "Purchase_Price": 550,
        "Condition": "Good",
        "Shelf_Location": "Fiction A",
        "Cover_URL": "https://covers.openlibrary.org/b/isbn/9780679731726-L.jpg",
        "Metadata_Verified": True,
        "Created_At": "2023-08-22T12:00:00Z",
        "Updated_At": "2023-08-22T12:00:00Z",
        "Row_Version": 1,
    },
]


class GoogleSheetsService:
    def __init__(self):
        self._service = None
        self._last_successful_read: Optional[datetime] = None
        self._last_successful_write: Optional[datetime] = None
        self._last_error: Optional[str] = None
        # In-memory store used when Google credentials are not configured
        self._fallback_store: List[Book] = [Book.from_sheet_row(r) for r in INITIAL_MOCK_BOOKS]

    @property
    def is_configured(self) -> bool:
        """Checks whether credentials and spreadsheet ID are present."""
        has_id = bool(settings.SPREADSHEET_ID)
        has_creds = bool(settings.GOOGLE_APPLICATION_CREDENTIALS or settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        return has_id and has_creds

    def _get_service(self):
        """Initializes Google Sheets client if not already initialized."""
        if self._service is not None:
            return self._service

        if not self.is_configured:
            return None

        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

            if settings.GOOGLE_SERVICE_ACCOUNT_JSON:
                creds_dict = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
                creds = service_account.Credentials.from_service_account_info(
                    creds_dict, scopes=SCOPES
                )
            elif settings.GOOGLE_APPLICATION_CREDENTIALS:
                creds = service_account.Credentials.from_service_account_file(
                    settings.GOOGLE_APPLICATION_CREDENTIALS, scopes=SCOPES
                )
            else:
                return None

            self._service = build("sheets", "v4", credentials=creds, cache_discovery=False)
            return self._service
        except Exception as e:
            self._last_error = f"Failed to initialize Google Sheets service: {str(e)}"
            logger.error(self._last_error)
            return None

    async def verify_headers(self) -> bool:
        """Ensures the Google Sheet has the expected columns."""
        service = self._get_service()
        if not service:
            return True  # Fallback mode is always valid

        try:
            range_name = f"'{settings.SHEET_NAME}'!1:1"
            res = service.spreadsheets().values().get(
                spreadsheetId=settings.SPREADSHEET_ID,
                range=range_name,
            ).execute()

            rows = res.get("values", [])
            if not rows or not rows[0]:
                # Sheet is empty, initialize headers
                service.spreadsheets().values().update(
                    spreadsheetId=settings.SPREADSHEET_ID,
                    range=range_name,
                    valueInputOption="RAW",
                    body={"values": [SHEET_COLUMNS]},
                ).execute()
                self._last_successful_write = datetime.utcnow()
                return True

            return True
        except Exception as e:
            self._last_error = f"Header verification failed: {str(e)}"
            logger.error(self._last_error)
            return False

    async def list_books(self) -> List[Book]:
        """Fetches all books in a single batched read request."""
        service = self._get_service()
        if not service:
            return self._fallback_store

        try:
            range_name = f"'{settings.SHEET_NAME}'!A2:AE"
            res = service.spreadsheets().values().get(
                spreadsheetId=settings.SPREADSHEET_ID,
                range=range_name,
            ).execute()

            raw_rows = res.get("values", [])
            books: List[Book] = []

            for row in raw_rows:
                if not row or not row[0]:  # Skip empty rows or rows without Book_ID
                    continue
                # Pad row if fewer columns than SHEET_COLUMNS
                padded = row + [""] * (len(SHEET_COLUMNS) - len(row))
                row_dict = dict(zip(SHEET_COLUMNS, padded))
                books.append(Book.from_sheet_row(row_dict))

            self._last_successful_read = datetime.utcnow()
            return books
        except Exception as e:
            self._last_error = f"Read failed: {str(e)}"
            logger.error(self._last_error)
            # Return fallback in development so app doesn't crash
            if settings.DEBUG:
                return self._fallback_store
            raise

    async def get_book(self, book_id: str) -> Optional[Book]:
        """Retrieves a single book by stable Book_ID."""
        books = await self.list_books()
        for b in books:
            if b.book_id == book_id:
                return b
        return None

    async def create_book(self, data: BookCreate) -> Book:
        """Appends a new book record with a generated stable Book_ID."""
        now_iso = datetime.utcnow().isoformat()
        new_id = f"bk_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}"

        book = Book(
            book_id=new_id,
            created_at=now_iso,
            updated_at=now_iso,
            row_version=1,
            **data.model_dump(),
        )

        service = self._get_service()
        if not service:
            self._fallback_store.insert(0, book)
            self._last_successful_write = datetime.utcnow()
            return book

        try:
            range_name = f"'{settings.SHEET_NAME}'!A:AE"
            row_values = book.to_sheet_row()

            service.spreadsheets().values().append(
                spreadsheetId=settings.SPREADSHEET_ID,
                range=range_name,
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body={"values": [row_values]},
            ).execute()

            self._last_successful_write = datetime.utcnow()
            return book
        except Exception as e:
            self._last_error = f"Create failed: {str(e)}"
            logger.error(self._last_error)
            raise

    async def update_book(self, book_id: str, updates: BookUpdate) -> Optional[Book]:
        """
        Targeted update: locates the book by stable Book_ID and updates
        only its specific row range.
        """
        service = self._get_service()
        if not service:
            for i, b in enumerate(self._fallback_store):
                if b.book_id == book_id:
                    update_dict = updates.model_dump(exclude_unset=True)
                    updated = b.model_copy(
                        update={
                            **update_dict,
                            "updated_at": datetime.utcnow().isoformat(),
                            "row_version": b.row_version + 1,
                        }
                    )
                    self._fallback_store[i] = updated
                    self._last_successful_write = datetime.utcnow()
                    return updated
            return None

        try:
            # 1. Read existing rows to find row index (1-based sheet row index)
            range_name = f"'{settings.SHEET_NAME}'!A2:A"
            res = service.spreadsheets().values().get(
                spreadsheetId=settings.SPREADSHEET_ID,
                range=range_name,
            ).execute()

            id_rows = res.get("values", [])
            row_index = None
            for idx, r in enumerate(id_rows):
                if r and r[0] == book_id:
                    row_index = idx + 2  # +2 because header is row 1 and 0-indexed
                    break

            if not row_index:
                return None

            # 2. Get current book details
            current_book = await self.get_book(book_id)
            if not current_book:
                return None

            # 3. Apply updates
            update_data = updates.model_dump(exclude_unset=True)
            updated_book = current_book.model_copy(
                update={
                    **update_data,
                    "updated_at": datetime.utcnow().isoformat(),
                    "row_version": current_book.row_version + 1,
                }
            )

            # 4. Write back targeted row range only
            target_range = f"'{settings.SHEET_NAME}'!A{row_index}:AE{row_index}"
            service.spreadsheets().values().update(
                spreadsheetId=settings.SPREADSHEET_ID,
                range=target_range,
                valueInputOption="RAW",
                body={"values": [updated_book.to_sheet_row()]},
            ).execute()

            self._last_successful_write = datetime.utcnow()
            return updated_book
        except Exception as e:
            self._last_error = f"Update failed: {str(e)}"
            logger.error(self._last_error)
            raise

    async def delete_book(self, book_id: str) -> bool:
        """Deletes or clears a book record by Book_ID."""
        service = self._get_service()
        if not service:
            prev_len = len(self._fallback_store)
            self._fallback_store = [b for b in self._fallback_store if b.book_id != book_id]
            self._last_successful_write = datetime.utcnow()
            return len(self._fallback_store) < prev_len

        try:
            # Read all IDs
            range_name = f"'{settings.SHEET_NAME}'!A2:A"
            res = service.spreadsheets().values().get(
                spreadsheetId=settings.SPREADSHEET_ID,
                range=range_name,
            ).execute()

            id_rows = res.get("values", [])
            row_index = None
            for idx, r in enumerate(id_rows):
                if r and r[0] == book_id:
                    row_index = idx + 2
                    break

            if not row_index:
                return False

            # Clear that specific row
            clear_range = f"'{settings.SHEET_NAME}'!A{row_index}:AE{row_index}"
            service.spreadsheets().values().clear(
                spreadsheetId=settings.SPREADSHEET_ID,
                range=clear_range,
            ).execute()

            self._last_successful_write = datetime.utcnow()
            return True
        except Exception as e:
            self._last_error = f"Delete failed: {str(e)}"
            logger.error(self._last_error)
            raise

    def get_health(self) -> Dict[str, Any]:
        """Provides non-sensitive connectivity and status info."""
        if not self.is_configured:
            status = "unconfigured"
            message = "Google Sheets credentials or SPREADSHEET_ID not configured. Running in local mock mode."
        elif self._last_error:
            status = "error"
            message = self._last_error
        else:
            status = "ok"
            message = "Connected to Google Sheets"

        return {
            "status": status,
            "sheets_connected": self._service is not None or not self.is_configured,
            "spreadsheet_id_configured": bool(settings.SPREADSHEET_ID),
            "service_account_configured": bool(
                settings.GOOGLE_APPLICATION_CREDENTIALS or settings.GOOGLE_SERVICE_ACCOUNT_JSON
            ),
            "last_successful_read": self._last_successful_read.isoformat() if self._last_successful_read else None,
            "last_successful_write": self._last_successful_write.isoformat() if self._last_successful_write else None,
            "message": message,
        }


sheets_service = GoogleSheetsService()
