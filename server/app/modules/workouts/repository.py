from datetime import datetime
from typing import cast

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING, ReturnDocument

from app.db.mongo import Database
from app.modules.workouts.models import (
    TemplateFolderDocument,
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


async def get_template_by_client_id(
    database: Database,
    *,
    user_id: ObjectId,
    client_template_id: str,
) -> WorkoutTemplateDocument | None:
    document = await database["workout_templates"].find_one(
        {"user_id": user_id, "client_template_id": client_template_id}
    )
    return cast(WorkoutTemplateDocument | None, document)


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
            }
        )
        .sort(
            [
                ("is_favorite", DESCENDING),
                ("position", ASCENDING),
                ("updated_at", DESCENDING),
            ]
        )
    )

    documents = await cursor.to_list(length=500)

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
        }
    )

    return cast(
        WorkoutTemplateDocument | None,
        document,
    )


async def update_template_with_revision(
    database: Database,
    *,
    template_id: ObjectId,
    user_id: ObjectId,
    expected_revision: int,
    fields: dict,
) -> WorkoutTemplateDocument | None:
    document = await database["workout_templates"].find_one_and_update(
        {
            "_id": template_id,
            "user_id": user_id,
            "revision": expected_revision,
        },
        {
            "$set": fields,
            "$inc": {"revision": 1},
        },
        return_document=ReturnDocument.AFTER,
    )
    return cast(WorkoutTemplateDocument | None, document)


async def unset_folder_from_templates(
    database: Database,
    *,
    user_id: ObjectId,
    folder_id: ObjectId,
    timestamp: datetime,
) -> None:
    await database["workout_templates"].update_many(
        {"user_id": user_id, "folder_id": folder_id},
        {
            "$set": {"folder_id": None, "updated_at": timestamp},
            "$inc": {"revision": 1},
        },
    )


async def template_usage(
    database: Database,
    *,
    user_id: ObjectId,
    template_ids: list[ObjectId],
) -> dict[str, dict]:
    if not template_ids:
        return {}
    cursor = database["workout_sessions"].aggregate(
        [
            {
                "$match": {
                    "user_id": user_id,
                    "status": "COMPLETED",
                    "template_id": {"$in": template_ids},
                }
            },
            {
                "$group": {
                    "_id": "$template_id",
                    "count": {"$sum": 1},
                    "last_performed_at": {"$max": "$completed_at"},
                }
            },
        ]
    )
    result = {}
    async for item in cursor:
        result[str(item["_id"])] = {
            "count": item["count"],
            "last_performed_at": item["last_performed_at"],
        }
    return result


# =========================================================
# TEMPLATE FOLDERS
# =========================================================


async def insert_template_folder(database: Database, folder: TemplateFolderDocument) -> None:
    await database["template_folders"].insert_one(folder)


async def list_template_folders(
    database: Database, *, user_id: ObjectId
) -> list[TemplateFolderDocument]:
    cursor = database["template_folders"].find({"user_id": user_id}).sort("position", ASCENDING)
    return cast(list[TemplateFolderDocument], await cursor.to_list(length=200))


async def get_template_folder(
    database: Database, *, folder_id: ObjectId, user_id: ObjectId
) -> TemplateFolderDocument | None:
    document = await database["template_folders"].find_one({"_id": folder_id, "user_id": user_id})
    return cast(TemplateFolderDocument | None, document)


async def get_template_folder_by_client_id(
    database: Database, *, user_id: ObjectId, client_folder_id: str
) -> TemplateFolderDocument | None:
    document = await database["template_folders"].find_one(
        {"user_id": user_id, "client_folder_id": client_folder_id}
    )
    return cast(TemplateFolderDocument | None, document)


async def update_template_folder_with_revision(
    database: Database,
    *,
    folder_id: ObjectId,
    user_id: ObjectId,
    expected_revision: int,
    fields: dict,
) -> TemplateFolderDocument | None:
    document = await database["template_folders"].find_one_and_update(
        {"_id": folder_id, "user_id": user_id, "revision": expected_revision},
        {"$set": fields, "$inc": {"revision": 1}},
        return_document=ReturnDocument.AFTER,
    )
    return cast(TemplateFolderDocument | None, document)


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
