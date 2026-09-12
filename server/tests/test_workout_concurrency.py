from unittest.mock import (
    AsyncMock,
)

import pytest
from bson import ObjectId
from fastapi import (
    HTTPException,
)
from pymongo.errors import (
    DuplicateKeyError,
)

from app.modules.workouts import (
    service,
)
from app.modules.workouts.schemas import (
    StartWorkoutRequest,
    WorkoutSessionUpdateRequest,
)


def active_session(
    *,
    revision: int = 1,
):
    session_id = ObjectId()

    user_id = ObjectId()

    now = service.utc_now()

    return {
        "_id": session_id,
        "user_id": user_id,
        "template_id": None,
        "name": "Workout",
        "status": "IN_PROGRESS",
        "started_at": now,
        "completed_at": None,
        "cancelled_at": None,
        "duration_seconds": None,
        "notes": None,
        "exercises": [],
        "created_at": now,
        "updated_at": now,
        "revision": revision,
    }


async def test_update_rejects_stale_revision(
    monkeypatch,
):
    original = active_session(revision=3)

    current = {
        **original,
        "revision": 4,
    }

    monkeypatch.setattr(
        service.repository,
        "get_session",
        AsyncMock(
            side_effect=[
                original,
                current,
            ]
        ),
    )

    monkeypatch.setattr(
        service.repository,
        "replace_active_session_fields",
        AsyncMock(return_value=False),
    )

    payload = WorkoutSessionUpdateRequest(
        revision=3,
        name="Workout",
        notes=None,
        exercises=[],
    )

    with pytest.raises(HTTPException) as caught:
        await service.update_workout(
            None,
            user={
                "_id": original["user_id"],
            },
            session_id=str(original["_id"]),
            payload=payload,
        )

    assert caught.value.status_code == 409

    assert caught.value.detail["code"] == "WORKOUT_REVISION_CONFLICT"

    assert caught.value.detail["current_revision"] == 4


async def test_start_race_returns_existing_workout(
    monkeypatch,
):
    existing = active_session(revision=1)

    user = {
        "_id": existing["user_id"],
        "weight_unit": "KG",
    }

    monkeypatch.setattr(
        service.repository,
        "get_active_session",
        AsyncMock(
            side_effect=[
                None,
                existing,
            ]
        ),
    )

    monkeypatch.setattr(
        service.repository,
        "insert_session",
        AsyncMock(side_effect=DuplicateKeyError("duplicate active workout")),
    )

    with pytest.raises(HTTPException) as caught:
        await service.start_workout(
            None,
            user=user,
            payload=StartWorkoutRequest(name="Workout"),
        )

    assert caught.value.status_code == 409

    assert caught.value.detail["code"] == "ACTIVE_WORKOUT_EXISTS"

    assert caught.value.detail["workout_id"] == str(existing["_id"])
