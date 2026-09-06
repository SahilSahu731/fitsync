from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.modules.auth import service
from app.modules.auth.google import GoogleIdentity


@pytest.fixture
def google():
    return GoogleIdentity(
        subject="google-subject",
        email="user@example.com",
        email_verified=True,
        email_authoritative=False,
        display_name=None,
        avatar_url=None,
    )


async def test_duplicate_email_requires_verification(monkeypatch, google):
    monkeypatch.setattr(service.auth_repository, "get_identity", AsyncMock(return_value=None))
    monkeypatch.setattr(
        service.user_repository,
        "get_user_by_email",
        AsyncMock(side_effect=[None, {"_id": ObjectId()}]),
    )
    monkeypatch.setattr(
        service.user_repository,
        "insert_user",
        AsyncMock(side_effect=DuplicateKeyError("duplicate email")),
    )
    create_session = AsyncMock()
    monkeypatch.setattr(service, "create_auth_session", create_session)

    with pytest.raises(HTTPException) as caught:
        await service.authenticate_with_google(
            None, google=google, device_name=None, platform="web", user_agent=None
        )

    assert caught.value.status_code == 409
    assert caught.value.detail["code"] == "GOOGLE_LINK_REQUIRES_EMAIL_VERIFICATION"
    assert caught.value.__cause__ is None
    assert caught.value.__suppress_context__ is True
    create_session.assert_not_awaited()


async def test_duplicate_identity_with_missing_user_preserves_cause(monkeypatch, google):
    duplicate = DuplicateKeyError("duplicate identity")
    monkeypatch.setattr(
        service.auth_repository,
        "get_identity",
        AsyncMock(side_effect=[None, {"user_id": ObjectId()}]),
    )
    monkeypatch.setattr(service.user_repository, "get_user_by_email", AsyncMock(return_value=None))
    monkeypatch.setattr(service.user_repository, "insert_user", AsyncMock())
    monkeypatch.setattr(
        service.auth_repository, "insert_identity", AsyncMock(side_effect=duplicate)
    )
    monkeypatch.setattr(service.user_repository, "get_user_by_id", AsyncMock(return_value=None))
    create_session = AsyncMock()
    monkeypatch.setattr(service, "create_auth_session", create_session)

    with pytest.raises(
        RuntimeError, match="Google identity references a missing FitSync user"
    ) as caught:
        await service.authenticate_with_google(
            None, google=google, device_name=None, platform="web", user_agent=None
        )

    assert caught.value.__cause__ is duplicate
    create_session.assert_not_awaited()
