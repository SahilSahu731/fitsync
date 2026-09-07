from datetime import datetime
from typing import Any, cast

from bson import ObjectId
from pymongo import (
    ASCENDING,
    DESCENDING,
)

from app.db.mongo import Database
from app.modules.progress.models import (
    PersonalRecordDocument,
)
from app.modules.workouts.models import (
    WorkoutSessionDocument,
)


async def get_user(
    database: Database,
    *,
    user_id: ObjectId,
) -> dict[str, Any] | None:
    return await database["users"].find_one(
        {
            "_id": user_id,
        }
    )


async def update_user_preferences(
    database: Database,
    *,
    user_id: ObjectId,
    fields: dict[str, Any],
) -> None:
    await database["users"].update_one(
        {
            "_id": user_id,
        },
        {
            "$set": fields,
        },
    )


async def list_completed_sessions(
    database: Database,
    *,
    user_id: ObjectId,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 5000,
) -> list[WorkoutSessionDocument]:
    query: dict[str, Any] = {
        "user_id": user_id,
        "status": "COMPLETED",
    }

    if start is not None or end is not None:
        completed_filter = {}

        if start is not None:
            completed_filter["$gte"] = start

        if end is not None:
            completed_filter["$lt"] = end

        query["completed_at"] = completed_filter

    cursor = (
        database["workout_sessions"]
        .find(query)
        .sort(
            "completed_at",
            ASCENDING,
        )
        .limit(limit)
    )

    documents = await cursor.to_list(length=limit)

    return cast(
        list[WorkoutSessionDocument],
        documents,
    )


async def get_completed_session(
    database: Database,
    *,
    user_id: ObjectId,
    session_id: ObjectId,
) -> WorkoutSessionDocument | None:
    document = await database["workout_sessions"].find_one(
        {
            "_id": session_id,
            "user_id": user_id,
            "status": "COMPLETED",
        }
    )

    return cast(
        WorkoutSessionDocument | None,
        document,
    )


async def list_previous_completed_sessions(
    database: Database,
    *,
    user_id: ObjectId,
    completed_before: datetime,
    exercise_ids: list[ObjectId],
    limit: int = 5000,
) -> list[WorkoutSessionDocument]:
    cursor = (
        database["workout_sessions"]
        .find(
            {
                "user_id": user_id,
                "status": "COMPLETED",
                "completed_at": {
                    "$lt": completed_before,
                },
                "exercises.exercise_id": {
                    "$in": exercise_ids,
                },
            }
        )
        .sort(
            "completed_at",
            ASCENDING,
        )
        .limit(limit)
    )

    documents = await cursor.to_list(length=limit)

    return cast(
        list[WorkoutSessionDocument],
        documents,
    )


async def list_exercise_sessions(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_id: ObjectId,
    start: datetime | None = None,
    before: datetime | None = None,
    limit: int = 1000,
) -> list[WorkoutSessionDocument]:
    query: dict[str, Any] = {
        "user_id": user_id,
        "status": "COMPLETED",
        "exercises.exercise_id": exercise_id,
    }

    time_filter = {}

    if start is not None:
        time_filter["$gte"] = start

    if before is not None:
        time_filter["$lt"] = before

    if time_filter:
        query["completed_at"] = time_filter

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


async def get_historical_exercises(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_ids: list[ObjectId],
) -> list[dict[str, Any]]:
    if not exercise_ids:
        return []

    cursor = database["exercises"].find(
        {
            "$and": [
                {
                    "_id": {
                        "$in": exercise_ids,
                    }
                },
                {
                    "$or": [
                        {
                            "source": "SYSTEM",
                        },
                        {
                            "source": "CUSTOM",
                            "owner_user_id": user_id,
                        },
                    ]
                },
            ]
        }
    )

    return await cursor.to_list(length=len(exercise_ids))


async def upsert_personal_record(
    database: Database,
    *,
    record: PersonalRecordDocument,
) -> bool:
    result = await database["personal_records"].update_one(
        {
            "workout_session_id": record["workout_session_id"],
            "set_id": record["set_id"],
            "record_type": record["record_type"],
        },
        {
            "$setOnInsert": record,
        },
        upsert=True,
    )

    return result.upserted_id is not None


async def list_personal_records(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_id: ObjectId | None = None,
    record_type: str | None = None,
    before: datetime | None = None,
    limit: int = 20,
) -> list[PersonalRecordDocument]:
    query: dict[str, Any] = {
        "user_id": user_id,
    }

    if exercise_id is not None:
        query["exercise_id"] = exercise_id

    if record_type is not None:
        query["record_type"] = record_type

    if before is not None:
        query["created_at"] = {
            "$lt": before,
        }

    cursor = (
        database["personal_records"]
        .find(query)
        .sort(
            [
                (
                    "created_at",
                    DESCENDING,
                ),
                (
                    "_id",
                    DESCENDING,
                ),
            ]
        )
        .limit(limit)
    )

    documents = await cursor.to_list(length=limit)

    return cast(
        list[PersonalRecordDocument],
        documents,
    )


async def list_workout_personal_records(
    database: Database,
    *,
    user_id: ObjectId,
    workout_session_id: ObjectId,
) -> list[PersonalRecordDocument]:
    cursor = (
        database["personal_records"]
        .find(
            {
                "user_id": user_id,
                "workout_session_id": workout_session_id,
            }
        )
        .sort(
            "created_at",
            ASCENDING,
        )
    )

    documents = await cursor.to_list(length=100)

    return cast(
        list[PersonalRecordDocument],
        documents,
    )
