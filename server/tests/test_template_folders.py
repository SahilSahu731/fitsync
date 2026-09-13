from unittest.mock import AsyncMock

from bson import ObjectId

from app.modules.workouts import service
from app.modules.workouts.schemas import TemplateFolderCreateRequest, TemplateFolderUpdateRequest


async def test_create_folder_is_idempotent(monkeypatch):
    now = service.utc_now()
    folder = {
        "_id": ObjectId(),
        "user_id": ObjectId(),
        "client_folder_id": "client-folder-123",
        "name": "PPL",
        "position": 0,
        "revision": 1,
        "created_at": now,
        "updated_at": now,
        "archived_at": None,
    }
    monkeypatch.setattr(
        service.repository,
        "get_template_folder_by_client_id",
        AsyncMock(return_value=folder),
    )
    result = await service.create_template_folder(
        None,
        user_id=folder["user_id"],
        payload=TemplateFolderCreateRequest(
            client_folder_id="client-folder-123",
            name="PPL",
        ),
    )
    assert result.id == str(folder["_id"])


async def test_archiving_folder_unlinks_templates(monkeypatch):
    now = service.utc_now()
    folder = {
        "_id": ObjectId(),
        "user_id": ObjectId(),
        "client_folder_id": "client-folder-123",
        "name": "PPL",
        "position": 0,
        "revision": 2,
        "created_at": now,
        "updated_at": now,
        "archived_at": now,
    }
    update = AsyncMock(return_value=folder)
    unlink = AsyncMock()
    monkeypatch.setattr(service.repository, "update_template_folder_with_revision", update)
    monkeypatch.setattr(service.repository, "unset_folder_from_templates", unlink)
    await service.update_template_folder(
        None,
        user_id=folder["user_id"],
        folder_id=str(folder["_id"]),
        payload=TemplateFolderUpdateRequest(
            revision=1,
            name="PPL",
            position=0,
            archived=True,
        ),
    )
    unlink.assert_awaited_once()
