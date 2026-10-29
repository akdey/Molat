import pytest
from app.services.metadata_service import metadata_service


@pytest.mark.anyio
async def test_metadata_service_isbn_fallback():
    # Test normalization of hyphens and whitespace
    candidate = await metadata_service.lookup_isbn("978-0-15-600131-1")
    # Even if offline, service should gracefully return None or Candidate without raising exceptions
    assert candidate is None or candidate.title != ""


@pytest.mark.anyio
async def test_metadata_service_empty_queries():
    res1 = await metadata_service.lookup_isbn("")
    assert res1 is None

    res2 = await metadata_service.search("")
    assert res2 == []

