import pytest
from app.core.security import verify_owner_token
from app.core.config import settings


def test_verify_owner_token_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "OWNER_AUTH_TOKEN", "supersecret123")
    assert verify_owner_token("supersecret123") is True
    assert verify_owner_token("wrongtoken") is False
    assert verify_owner_token("") is False


def test_verify_owner_token_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "OWNER_AUTH_TOKEN", None)
    assert verify_owner_token("anything") is True

