import pytest
from app.features.books.sheets_repo import _from_sheet_row as _book_from_row, _parse_float, _parse_int
from app.features.wishlist.sheets_repo import _from_sheet_row as _wishlist_from_row


def test_parse_float_currency_symbols():
    assert _parse_float("₹87") == 87.0
    assert _parse_float("₹ 87.50") == 87.5
    assert _parse_float("₹1,250.00") == 1250.0
    assert _parse_float("$15.99") == 15.99
    assert _parse_float("87") == 87.0
    assert _parse_float(87) == 87.0
    assert _parse_float(87.5) == 87.5
    assert _parse_float(None) is None
    assert _parse_float("") is None
    assert _parse_float("-") is None
    assert _parse_float("N/A") is None


def test_parse_int_variations():
    assert _parse_int("2021") == 2021
    assert _parse_int("2021.0") == 2021
    assert _parse_int("₹87") == 87
    assert _parse_int(2021) == 2021
    assert _parse_int(None) is None
    assert _parse_int("") is None


def test_book_from_sheet_row_with_currency_strings():
    row = {
        "book_id": "BOOK-001",
        "title": "The Fourth Protocol",
        "purchase_price": "₹87",
        "rp": "₹ 150.00",
        "publication_year": "1984.0",
        "rating": "5",
    }
    book = _book_from_row(row)
    assert book.book_id == "BOOK-001"
    assert book.purchase_price == 87.0
    assert book.rp == 150.0
    assert book.publication_year == 1984
    assert book.rating == 5


def test_wishlist_from_sheet_row_with_currency_strings():
    row = {
        "wishlist_id": "WISH-001",
        "title": "Dune Messiah",
        "expected_rp": "₹499.00",
        "target_price": "₹350",
    }
    item = _wishlist_from_row(row)
    assert item.wishlist_id == "WISH-001"
    assert item.expected_rp == 499.0
    assert item.target_price == 350.0
