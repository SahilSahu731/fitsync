from unittest.mock import (
    AsyncMock,
    MagicMock,
)

from bson import ObjectId

from app.modules.users import (
    repository,
    service,
)


async def test_delete_user_data_removes_all_owned_records():
    collections: dict[
        str,
        MagicMock,
    ] = {}

    def get_collection(
        name: str,
    ):
        if name not in collections:
            collection = MagicMock()

            collection.delete_many = AsyncMock()

            collection.delete_one = AsyncMock()

            collections[name] = collection

        return collections[name]

    database = MagicMock()

    database.__getitem__.side_effect = get_collection

    user_id = ObjectId()

    email = "test@example.com"

    await repository.delete_user_data(
        database,
        user_id=user_id,
        email=email,
    )

    collections["personal_records"].delete_many.assert_awaited_once_with(
        {
            "user_id": user_id,
        }
    )

    collections["workout_sessions"].delete_many.assert_awaited_once_with(
        {
            "user_id": user_id,
        }
    )

    collections["workout_templates"].delete_many.assert_awaited_once_with(
        {
            "user_id": user_id,
        }
    )

    collections["exercises"].delete_many.assert_awaited_once_with(
        {
            "source": "CUSTOM",
            "owner_user_id": user_id,
        }
    )

    collections["refresh_tokens"].delete_many.assert_awaited_once_with(
        {
            "user_id": user_id,
        }
    )

    collections["sessions"].delete_many.assert_awaited_once_with(
        {
            "user_id": user_id,
        }
    )

    collections["auth_identities"].delete_many.assert_awaited_once_with(
        {
            "user_id": user_id,
        }
    )

    collections["auth_challenges"].delete_many.assert_awaited_once_with(
        {
            "email": email,
        }
    )

    collections["users"].delete_one.assert_awaited_once_with(
        {
            "_id": user_id,
        }
    )


async def test_cloudinary_failure_does_not_restore_deleted_account(
    monkeypatch,
):
    user_id = ObjectId()

    user = {
        "_id": user_id,
        "email": "test@example.com",
    }

    list_media = AsyncMock(
        return_value=[
            (
                (f"fitsync/users/{user_id}/exercise-media/bench"),
                "IMAGE",
            ),
        ]
    )

    delete_data = AsyncMock()

    delete_assets = AsyncMock(side_effect=RuntimeError("Cloudinary unavailable"))

    monkeypatch.setattr(
        service.repository,
        "list_owned_exercise_media",
        list_media,
    )

    monkeypatch.setattr(
        service.repository,
        "delete_user_data",
        delete_data,
    )

    monkeypatch.setattr(
        service.media_service,
        "delete_owned_assets",
        delete_assets,
    )

    await service.delete_user_account(
        None,
        user=user,
    )

    delete_data.assert_awaited_once()

    delete_assets.assert_awaited_once()
