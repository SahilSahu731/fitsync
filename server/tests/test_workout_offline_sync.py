from unittest.mock import AsyncMock

from bson import ObjectId

from app.modules.workouts import service
from app.modules.workouts.schemas import (
    StartWorkoutRequest,
)


async def test_start_workout_reuses_client_workout_id(
    monkeypatch,
):
    user_id = ObjectId()

    existing = {
        "_id": ObjectId(),
        "user_id": user_id,
        "client_workout_id": "client-123",
        "template_id": None,
        "name": "Offline workout",
        "status": "IN_PROGRESS",
        "started_at": service.utc_now(),
        "completed_at": None,
        "cancelled_at": None,
        "duration_seconds": None,
        "notes": None,
        "exercises": [],
        "created_at": service.utc_now(),
        "updated_at": service.utc_now(),
        "revision": 1,
    }

    monkeypatch.setattr(
        service.repository,
        "get_session_by_client_workout_id",
        AsyncMock(return_value=existing),
    )

    result = await service.start_workout(
        None,
        user={
            "_id": user_id,
            "weight_unit": "KG",
        },
        payload=StartWorkoutRequest(
            client_workout_id="client-123",
            name="Offline workout",
            started_at=existing["started_at"],
        ),
    )

    assert result.client_workout_id == "client-123"

    assert result.id == str(existing["_id"])
