from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.modules.workouts import service
from app.modules.workouts.schemas import (
    TemplateExerciseInput,
    TemplateSetInput,
    WorkoutTemplateCreateRequest,
    WorkoutTemplateUpdateRequest,
)


def template_document(*, revision: int = 1):
    now = service.utc_now()
    return {
        "_id": ObjectId(),
        "user_id": ObjectId(),
        "client_template_id": "client-template-123",
        "name": "Push",
        "description": None,
        "folder_id": None,
        "is_favorite": False,
        "position": 0,
        "exercises": [],
        "revision": revision,
        "created_at": now,
        "updated_at": now,
        "archived_at": None,
    }


def create_payload():
    return WorkoutTemplateCreateRequest(
        client_template_id="client-template-123",
        name="Push",
        exercises=[
            TemplateExerciseInput(
                exercise_id=str(ObjectId()),
                planned_sets=[TemplateSetInput()],
            )
        ],
    )


async def test_repeated_client_template_id_returns_existing(monkeypatch):
    existing = template_document()
    monkeypatch.setattr(
        service.repository,
        "get_template_by_client_id",
        AsyncMock(return_value=existing),
    )
    monkeypatch.setattr(service.repository, "template_usage", AsyncMock(return_value={}))
    first = await service.create_template(
        None,
        user_id=existing["user_id"],
        payload=create_payload(),
    )
    second = await service.create_template(
        None,
        user_id=existing["user_id"],
        payload=create_payload(),
    )
    assert first.id == second.id == str(existing["_id"])


async def test_stale_template_revision_is_rejected(monkeypatch):
    original = template_document(revision=1)
    latest = {**original, "revision": 2}
    exercise_id = ObjectId()
    monkeypatch.setattr(
        service.repository,
        "get_template",
        AsyncMock(side_effect=[original, latest]),
    )
    monkeypatch.setattr(
        service,
        "resolve_exercises",
        AsyncMock(
            return_value={
                str(exercise_id): {
                    "_id": exercise_id,
                    "name": "Bench Press",
                    "media": [],
                    "primary_muscles": ["CHEST"],
                    "tracking_type": "WEIGHT_REPS",
                    "laterality": "BILATERAL",
                    "load_mode": "TOTAL",
                }
            }
        ),
    )
    monkeypatch.setattr(service, "resolve_template_folder", AsyncMock(return_value=None))
    monkeypatch.setattr(
        service.repository,
        "update_template_with_revision",
        AsyncMock(return_value=None),
    )
    payload = WorkoutTemplateUpdateRequest(
        revision=1,
        name="Push",
        exercises=[
            TemplateExerciseInput(
                exercise_id=str(exercise_id),
                planned_sets=[TemplateSetInput()],
            )
        ],
    )
    with pytest.raises(HTTPException) as caught:
        await service.update_template(
            None,
            user_id=original["user_id"],
            template_id=str(original["_id"]),
            payload=payload,
        )
    assert caught.value.status_code == 409
    assert caught.value.detail["code"] == "TEMPLATE_REVISION_CONFLICT"
    assert caught.value.detail["current_revision"] == 2
