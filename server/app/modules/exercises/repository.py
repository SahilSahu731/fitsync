import re
from typing import cast

from bson import ObjectId
from pymongo import ASCENDING

from app.db.mongo import Database
from app.modules.exercises.models import (
    ExerciseDocument,
)


def visibility_query(
    user_id: ObjectId,
) -> dict:
    return {
        "$or": [
            {
                "source":
                    "SYSTEM",
            },
            {
                "source":
                    "CUSTOM",

                "owner_user_id":
                    user_id,
            },
        ]
    }


async def list_exercises(
    database: Database,
    *,
    user_id: ObjectId,
    q: str | None,
    muscle: str | None,
    equipment: str | None,
    source: str | None,
    after_name: str | None,
    after_id: ObjectId | None,
    limit: int,
) -> list[ExerciseDocument]:
    clauses: list[dict] = [
        visibility_query(
            user_id
        ),

        {
            "is_archived":
                False,
        },
    ]

    if q:
        normalized = " ".join(
            q.lower().split()
        )

        clauses.append(
            {
                "normalized_name": {
                    "$regex":
                        re.escape(
                            normalized
                        ),
                }
            }
        )

    if muscle:
        clauses.append(
            {
                "$or": [
                    {
                        "primary_muscles":
                            muscle,
                    },
                    {
                        "secondary_muscles":
                            muscle,
                    },
                ]
            }
        )

    if equipment:
        clauses.append(
            {
                "equipment":
                    equipment,
            }
        )

    if source:
        if source == "CUSTOM":
            clauses.append(
                {
                    "source":
                        "CUSTOM",

                    "owner_user_id":
                        user_id,
                }
            )

        else:
            clauses.append(
                {
                    "source":
                        source,
                }
            )

    if (
        after_name is not None
        and after_id is not None
    ):
        clauses.append(
            {
                "$or": [
                    {
                        "normalized_name": {
                            "$gt":
                                after_name,
                        }
                    },
                    {
                        "normalized_name":
                            after_name,

                        "_id": {
                            "$gt":
                                after_id,
                        },
                    },
                ]
            }
        )

    cursor = (
        database[
            "exercises"
        ]
        .find(
            {
                "$and":
                    clauses,
            }
        )
        .sort(
            [
                (
                    "normalized_name",
                    ASCENDING,
                ),
                (
                    "_id",
                    ASCENDING,
                ),
            ]
        )
        .limit(
            limit
        )
    )

    documents = (
        await cursor.to_list(
            length=limit
        )
    )

    return cast(
        list[
            ExerciseDocument
        ],
        documents,
    )


async def get_visible_exercise(
    database: Database,
    *,
    exercise_id: ObjectId,
    user_id: ObjectId,
    include_archived: bool = False,
) -> ExerciseDocument | None:
    query: dict = {
        "_id":
            exercise_id,

        **visibility_query(
            user_id
        ),
    }

    if not include_archived:
        query[
            "is_archived"
        ] = False

    document = await database[
        "exercises"
    ].find_one(
        query
    )

    return cast(
        ExerciseDocument | None,
        document,
    )


async def get_editable_custom_exercise(
    database: Database,
    *,
    exercise_id: ObjectId,
    user_id: ObjectId,
) -> ExerciseDocument | None:
    document = await database[
        "exercises"
    ].find_one(
        {
            "_id":
                exercise_id,

            "source":
                "CUSTOM",

            "owner_user_id":
                user_id,

            "is_archived":
                False,
        }
    )

    return cast(
        ExerciseDocument | None,
        document,
    )


async def insert_exercise(
    database: Database,
    exercise: ExerciseDocument,
) -> None:
    await database[
        "exercises"
    ].insert_one(
        exercise
    )


async def replace_custom_exercise(
    database: Database,
    *,
    exercise_id: ObjectId,
    user_id: ObjectId,
    fields: dict,
) -> bool:
    result = await database[
        "exercises"
    ].update_one(
        {
            "_id":
                exercise_id,

            "source":
                "CUSTOM",

            "owner_user_id":
                user_id,

            "is_archived":
                False,
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


async def archive_custom_exercise(
    database: Database,
    *,
    exercise_id: ObjectId,
    user_id: ObjectId,
    timestamp,
) -> bool:
    result = await database[
        "exercises"
    ].update_one(
        {
            "_id":
                exercise_id,

            "source":
                "CUSTOM",

            "owner_user_id":
                user_id,

            "is_archived":
                False,
        },
        {
            "$set": {
                "is_archived":
                    True,

                "updated_at":
                    timestamp,
            }
        },
    )

    return (
        result.modified_count
        == 1
    )


async def get_many_visible_exercises(
    database: Database,
    *,
    exercise_ids: list[
        ObjectId
    ],
    user_id: ObjectId,
) -> list[ExerciseDocument]:
    cursor = database[
        "exercises"
    ].find(
        {
            "$and": [
                {
                    "_id": {
                        "$in":
                            exercise_ids,
                    }
                },

                visibility_query(
                    user_id
                ),

                {
                    "is_archived":
                        False,
                },
            ]
        }
    )

    documents = await cursor.to_list(
        length=len(
            exercise_ids
        )
    )

    return cast(
        list[
            ExerciseDocument
        ],
        documents,
    )