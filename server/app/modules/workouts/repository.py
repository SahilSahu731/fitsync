from typing import cast

from bson import ObjectId
from pymongo import DESCENDING

from app.db.mongo import Database
from app.modules.workouts.models import (
    WorkoutSessionDocument,
    WorkoutTemplateDocument,
)

# =========================================================
# TEMPLATES
# =========================================================


async def insert_template(
    database: Database,
    template: WorkoutTemplateDocument,
) -> None:
    await database["workout_templates"].insert_one(template)


async def list_templates(
    database: Database,
    *,
    user_id: ObjectId,
) -> list[WorkoutTemplateDocument]:
    cursor = (
        database["workout_templates"]
        .find(
            {
                "user_id": user_id,
                "archived_at": None,
            }
        )
        .sort(
            "updated_at",
            DESCENDING,
        )
    )

    documents = await cursor.to_list(length=200)

    return cast(
        list[WorkoutTemplateDocument],
        documents,
    )


async def get_template(
    database: Database,
    *,
    template_id: ObjectId,
    user_id: ObjectId,
) -> WorkoutTemplateDocument | None:
    document = await database["workout_templates"].find_one(
        {
            "_id": template_id,
            "user_id": user_id,
            "archived_at": None,
        }
    )

    return cast(
        WorkoutTemplateDocument | None,
        document,
    )


async def update_template(
    database: Database,
    *,
    template_id: ObjectId,
    user_id: ObjectId,
    fields: dict,
) -> bool:
    result = await database["workout_templates"].update_one(
        {
            "_id": template_id,
            "user_id": user_id,
            "archived_at": None,
        },
        {
            "$set": fields,
        },
    )

    return result.matched_count == 1


async def archive_template(
    database: Database,
    *,
    template_id: ObjectId,
    user_id: ObjectId,
    timestamp,
) -> bool:
    result = await database["workout_templates"].update_one(
        {
            "_id": template_id,
            "user_id": user_id,
            "archived_at": None,
        },
        {
            "$set": {
                "archived_at": timestamp,
                "updated_at": timestamp,
            }
        },
    )

    return result.modified_count == 1


# =========================================================
# SESSIONS
# =========================================================


async def get_active_session(
    database: Database,
    *,
    user_id: ObjectId,
) -> WorkoutSessionDocument | None:
    document = await database["workout_sessions"].find_one(
        {
            "user_id": user_id,
            "status": "IN_PROGRESS",
        }
    )

    return cast(
        WorkoutSessionDocument | None,
        document,
    )


async def insert_session(
    database: Database,
    session: WorkoutSessionDocument,
) -> None:
    await database["workout_sessions"].insert_one(session)


async def get_session(
    database: Database,
    *,
    session_id: ObjectId,
    user_id: ObjectId,
) -> WorkoutSessionDocument | None:
    document = await database["workout_sessions"].find_one(
        {
            "_id": session_id,
            "user_id": user_id,
        }
    )

    return cast(
        WorkoutSessionDocument | None,
        document,
    )


async def get_session_by_client_workout_id(
    database: Database,
    *,
    user_id: ObjectId,
    client_workout_id: str,
) -> WorkoutSessionDocument | None:
    document = await database["workout_sessions"].find_one(
        {
            "user_id": user_id,
            "client_workout_id": client_workout_id,
        }
    )

    return cast(
        WorkoutSessionDocument | None,
        document,
    )


async def replace_active_session_fields(
    database: Database,
    *,
    session_id: ObjectId,
    user_id: ObjectId,
    expected_revision: int,
    fields: dict,
) -> bool:
    result = await database["workout_sessions"].update_one(
        {
            "_id": session_id,
            "user_id": user_id,
            "status": "IN_PROGRESS",
            "revision": expected_revision,
        },
        {
            "$set": fields,
            "$inc": {
                "revision": 1,
            },
        },
    )

    return result.matched_count == 1


async def complete_session(
    database: Database,
    *,
    session_id: ObjectId,
    user_id: ObjectId,
    expected_revision: int,
    completed_at,
    duration_seconds: int,
) -> bool:
    result = await database["workout_sessions"].update_one(
        {
            "_id": session_id,
            "user_id": user_id,
            "status": "IN_PROGRESS",
            "revision": expected_revision,
        },
        {
            "$set": {
                "status": "COMPLETED",
                "completed_at": completed_at,
                "duration_seconds": duration_seconds,
                "updated_at": completed_at,
            },
            "$inc": {
                "revision": 1,
            },
        },
    )

    return result.modified_count == 1


async def cancel_session(
    database: Database,
    *,
    session_id: ObjectId,
    user_id: ObjectId,
    cancelled_at,
) -> bool:
    result = await database["workout_sessions"].update_one(
        {
            "_id": session_id,
            "user_id": user_id,
            "status": "IN_PROGRESS",
        },
        {
            "$set": {
                "status": "CANCELLED",
                "cancelled_at": cancelled_at,
                "updated_at": cancelled_at,
            },
            "$inc": {
                "revision": 1,
            },
        },
    )

    return result.modified_count == 1


async def list_completed_sessions(
    database: Database,
    *,
    user_id: ObjectId,
    before_completed_at=None,
    limit: int = 20,
) -> list[WorkoutSessionDocument]:
    query: dict = {
        "user_id": user_id,
        "status": "COMPLETED",
    }

    if before_completed_at is not None:
        query["completed_at"] = {
            "$lt": before_completed_at,
        }

    cursor = (
        database["workout_sessions"]
        .find(query)
        .sort(
            "completed_at",
            DESCENDING,
        )
        .limit(limit)
    )

    documents = await cursor.to_list(length=limit)

    return cast(
        list[WorkoutSessionDocument],
        documents,
    )


async def recent_sessions_for_exercises(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_ids: list[ObjectId],
    limit: int = 50,
) -> list[WorkoutSessionDocument]:
    cursor = (
        database["workout_sessions"]
        .find(
            {
                "user_id": user_id,
                "status": "COMPLETED",
                "exercises.exercise_id": {
                    "$in": exercise_ids,
                },
            }
        )
        .sort(
            "completed_at",
            DESCENDING,
        )
        .limit(limit)
    )

    documents = await cursor.to_list(length=limit)

    return cast(
        list[WorkoutSessionDocument],
        documents,
    )
