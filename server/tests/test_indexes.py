from unittest.mock import AsyncMock, MagicMock

import pytest
from pymongo.errors import OperationFailure

from app.db.indexes import ensure_indexes


@pytest.mark.parametrize("conflict_code", [None, 85, 86])
@pytest.mark.parametrize("equivalent", [True, False])
async def test_username_index_name_conflict(conflict_code, equivalent):
    users = MagicMock()
    conflict = OperationFailure("Index conflict", code=conflict_code or 85)
    users.create_index = AsyncMock(side_effect=[None, conflict if conflict_code else None])
    users.index_information = AsyncMock(
        return_value={
            "uq_users_username_string_migration": {
                "key": [("username", 1)],
                "unique": equivalent,
                "partialFilterExpression": {"username": {"$type": "string"}},
            }
        }
    )
    other = MagicMock()
    other.create_index = AsyncMock()
    database = MagicMock()
    database.__getitem__.side_effect = lambda name: users if name == "users" else other

    if conflict_code and (conflict_code != 85 or not equivalent):
        with pytest.raises(OperationFailure) as caught:
            await ensure_indexes(database)
        assert caught.value is conflict
    else:
        await ensure_indexes(database)
        assert other.create_index.await_count > 0

    users.drop_index.assert_not_called()


async def test_all_startup_indexes_accept_equivalent_legacy_names():
    from pymongo import IndexModel

    class LegacyCollection:
        def __init__(self):
            self.index = None
            self.checked = 0
            self.requested_names = set()

        async def create_index(self, keys, **options):
            self.requested_names.add(options["name"])
            self.index = dict(IndexModel(keys, **options).document)
            self.index["name"] = "legacy_name"
            self.index["v"] = 2
            raise OperationFailure("Different name", code=85)

        async def index_information(self):
            self.checked += 1
            return {"legacy_name": self.index}

    collections = {}
    database = MagicMock()
    database.__getitem__.side_effect = lambda name: collections.setdefault(name, LegacyCollection())
    await ensure_indexes(database)
    assert "workout_sessions" in collections
    assert collections["workout_sessions"].requested_names == {
        "idx_workout_previous_exercise",
        "idx_workout_session_active",
        "idx_workout_history",
    }
    assert all(collection.checked > 0 for collection in collections.values())


@pytest.mark.parametrize(
    "changed",
    [
        {"expireAfterSeconds": 3600},
        {"expireAfterSeconds": None},
        {"key": [("other_field", 1)]},
        {"partialFilterExpression": {"active": True}},
        {"unique": True},
        {"collation": {"locale": "en"}},
    ],
)
async def test_rejects_incompatible_ttl_index(changed):
    from app.db.indexes import ensure_index

    existing = {"key": [("expires_at", 1)], "expireAfterSeconds": 0, **changed}
    collection = MagicMock()
    collection.create_index = AsyncMock(side_effect=OperationFailure("Conflict", code=85))
    collection.index_information = AsyncMock(return_value={"ttl_sessions_expires_at": existing})
    with pytest.raises(OperationFailure):
        await ensure_index(
            collection, "expires_at", expireAfterSeconds=0, name="ttl_sessions_expiry"
        )
    collection.drop_index.assert_not_called()
