from typing import cast

from bson import ObjectId
from pymongo import DESCENDING

from app.db.mongo import Database
from app.modules.workouts.models import (
    WorkoutTemplateDocument,
)


async def insert_template(
    database: Database,
    template: WorkoutTemplateDocument,
) -> None:
    await database[
        "workout_templates"
    ].insert_one(
        template
    )


async def list_templates(
    database: Database,
    *,
    user_id: ObjectId,
) -> list[
    WorkoutTemplateDocument
]:
    cursor = (
        database[
            "workout_templates"
        ]
        .find(
            {
                "user_id":
                    user_id,

                "archived_at":
                    None,
            }
        )
        .sort(
            "updated_at",
            DESCENDING,
        )
    )

    documents = await cursor.to_list(
        length=200
    )

    return cast(
        list[
            WorkoutTemplateDocument
        ],
        documents,
    )


async def get_template(
    database: Database,
    *,
    template_id: ObjectId,
    user_id: ObjectId,
) -> WorkoutTemplateDocument | None:
    document = await database[
        "workout_templates"
    ].find_one(
        {
            "_id":
                template_id,

            "user_id":
                user_id,

            "archived_at":
                None,
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
    result = await database[
        "workout_templates"
    ].update_one(
        {
            "_id":
                template_id,

            "user_id":
                user_id,

            "archived_at":
                None,
        },
        {
            "$set":
                fields,
        },
    )

    return (
        result.matched_count
        == 1
    )


async def archive_template(
    database: Database,
    *,
    template_id: ObjectId,
    user_id: ObjectId,
    timestamp,
) -> bool:
    result = await database[
        "workout_templates"
    ].update_one(
        {
            "_id":
                template_id,

            "user_id":
                user_id,

            "archived_at":
                None,
        },
        {
            "$set": {
                "archived_at":
                    timestamp,

                "updated_at":
                    timestamp,
            }
        },
    )

    return (
        result.modified_count
        == 1
    )