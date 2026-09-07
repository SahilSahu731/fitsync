import base64
import json
from uuid import uuid4

from bson import ObjectId
from fastapi import (
    HTTPException,
    status,
)
from pymongo.errors import (
    DuplicateKeyError,
)

from app.db.mongo import Database
from app.modules.auth.security import (
    utc_now,
)
from app.modules.exercises import (
    repository,
)
from app.modules.exercises.models import (
    ExerciseDocument,
    ExerciseMediaDocument,
)
from app.modules.exercises.schemas import (
    ExerciseCreateRequest,
    ExerciseUpdateRequest,
    normalize_exercise_name,
)
from app.modules.media.service import (
    image_delivery_url,
    image_thumbnail_url,
    verify_owned_asset,
    video_delivery_url,
    video_thumbnail_url,
)


def exercise_not_found():
    return HTTPException(
        status_code=404,
        detail={
            "code":
                "EXERCISE_NOT_FOUND",

            "message":
                "Exercise not found.",
        },
    )


def duplicate_exercise():
    return HTTPException(
        status_code=409,
        detail={
            "code":
                "DUPLICATE_CUSTOM_EXERCISE",

            "message":
                "You already have a custom "
                "exercise with this name.",
        },
    )


def encode_cursor(
    exercise: ExerciseDocument,
) -> str:
    payload = {
        "name":
            exercise[
                "normalized_name"
            ],

        "id":
            str(
                exercise["_id"]
            ),
    }

    encoded = base64.urlsafe_b64encode(
        json.dumps(
            payload
        ).encode()
    )

    return encoded.decode()


def decode_cursor(
    cursor: str | None,
) -> tuple[
    str | None,
    ObjectId | None,
]:
    if not cursor:
        return (
            None,
            None,
        )

    try:
        decoded = (
            base64.urlsafe_b64decode(
                cursor.encode()
            )
        )

        payload = json.loads(
            decoded
        )

        name = payload[
            "name"
        ]

        object_id = ObjectId(
            payload[
                "id"
            ]
        )

        if not isinstance(
            name,
            str,
        ):
            raise ValueError

        return (
            name,
            object_id,
        )

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail={
                "code":
                    "INVALID_CURSOR",

                "message":
                    "Invalid pagination cursor.",
            },
        ) from error


async def build_media_documents(
    *,
    user_id: ObjectId,
    media_inputs,
) -> list[
    ExerciseMediaDocument
]:
    video_count = sum(
        1
        for media in media_inputs
        if media.type
        == "VIDEO"
    )

    image_count = sum(
        1
        for media in media_inputs
        if media.type
        == "IMAGE"
    )

    if video_count > 1:
        raise HTTPException(
            status_code=400,
            detail={
                "code":
                    "TOO_MANY_VIDEOS",

                "message":
                    "An exercise can have "
                    "at most one video.",
            },
        )

    if image_count > 2:
        raise HTTPException(
            status_code=400,
            detail={
                "code":
                    "TOO_MANY_IMAGES",

                "message":
                    "An exercise can have "
                    "at most two images.",
            },
        )

    result: list[
        ExerciseMediaDocument
    ] = []

    for media in media_inputs:
        resource_type = (
            "video"
            if media.type
            == "VIDEO"
            else "image"
        )

        try:
            resource = (
                await verify_owned_asset(
                    user_id=str(
                        user_id
                    ),
                    public_id=(
                        media.public_id
                    ),
                    resource_type=(
                        resource_type
                    ),
                )
            )

        except Exception as error:
            raise HTTPException(
                status_code=400,
                detail={
                    "code":
                        "INVALID_EXERCISE_MEDIA",

                    "message":
                        "One of the uploaded "
                        "media files is invalid.",
                },
            ) from error

        format_name = (
            str(
                resource.get(
                    "format"
                )
                or media.format
                or (
                    "mp4"
                    if resource_type
                    == "video"
                    else "jpg"
                )
            )
        )

        if resource_type == "video":
            secure_url = (
                video_delivery_url(
                    media.public_id,
                    format_name,
                )
            )

            thumbnail_url = (
                video_thumbnail_url(
                    media.public_id
                )
            )

        else:
            secure_url = (
                image_delivery_url(
                    media.public_id
                )
            )

            thumbnail_url = (
                image_thumbnail_url(
                    media.public_id
                )
            )

        duration = resource.get(
            "duration"
        )

        result.append(
            {
                "id":
                    str(
                        uuid4()
                    ),

                "type":
                    media.type,

                "public_id":
                    media.public_id,

                "secure_url":
                    secure_url,

                "thumbnail_url":
                    thumbnail_url,

                "width":
                    resource.get(
                        "width"
                    ),

                "height":
                    resource.get(
                        "height"
                    ),

                "duration_seconds": (
                    float(
                        duration
                    )
                    if duration
                    is not None
                    else None
                ),

                "format":
                    format_name,

                "sort_order":
                    media.sort_order,
            }
        )

    result.sort(
        key=lambda item: (
            item[
                "sort_order"
            ]
        )
    )

    return result


async def list_exercises(
    database: Database,
    *,
    user_id: ObjectId,
    q: str | None,
    muscle: str | None,
    equipment: str | None,
    source: str | None,
    cursor: str | None,
    limit: int,
):
    (
        after_name,
        after_id,
    ) = decode_cursor(
        cursor
    )

    documents = (
        await repository
        .list_exercises(
            database,
            user_id=user_id,
            q=(
                q.strip()
                if q
                else None
            ),
            muscle=muscle,
            equipment=equipment,
            source=source,
            after_name=after_name,
            after_id=after_id,
            limit=limit + 1,
        )
    )

    has_more = (
        len(documents)
        > limit
    )

    items = documents[
        :limit
    ]

    next_cursor = None

    if (
        has_more
        and items
    ):
        next_cursor = (
            encode_cursor(
                items[-1]
            )
        )

    return (
        items,
        next_cursor,
    )


async def get_exercise(
    database: Database,
    *,
    exercise_id: str,
    user_id: ObjectId,
):
    if not ObjectId.is_valid(
        exercise_id
    ):
        raise exercise_not_found()

    exercise = (
        await repository
        .get_visible_exercise(
            database,
            exercise_id=ObjectId(
                exercise_id
            ),
            user_id=user_id,
        )
    )

    if exercise is None:
        raise exercise_not_found()

    return exercise


async def create_custom_exercise(
    database: Database,
    *,
    user_id: ObjectId,
    payload: ExerciseCreateRequest,
):
    now = utc_now()

    media = (
        await build_media_documents(
            user_id=user_id,
            media_inputs=(
                payload.media
            ),
        )
    )

    exercise: ExerciseDocument = {
        "_id":
            ObjectId(),

        "source":
            "CUSTOM",

        "owner_user_id":
            user_id,

        "name":
            payload.name,

        "normalized_name":
            normalize_exercise_name(
                payload.name
            ),

        "description":
            payload.description,

        "primary_muscles":
            payload.primary_muscles,

        "secondary_muscles":
            payload.secondary_muscles,

        "equipment":
            payload.equipment,

        "mechanic":
            payload.mechanic,

        "movement_pattern":
            payload.movement_pattern,

        "instructions":
            payload.instructions,

        "tips":
            payload.tips,

        "media":
            media,

        "is_archived":
            False,

        "created_at":
            now,

        "updated_at":
            now,
    }

    try:
        await repository.insert_exercise(
            database,
            exercise,
        )

    except DuplicateKeyError as error:
        raise duplicate_exercise() from error

    return exercise


async def update_custom_exercise(
    database: Database,
    *,
    exercise_id: str,
    user_id: ObjectId,
    payload: ExerciseUpdateRequest,
):
    if not ObjectId.is_valid(
        exercise_id
    ):
        raise exercise_not_found()

    object_id = ObjectId(
        exercise_id
    )

    existing = (
        await repository
        .get_editable_custom_exercise(
            database,
            exercise_id=object_id,
            user_id=user_id,
        )
    )

    if existing is None:
        raise exercise_not_found()

    media = (
        await build_media_documents(
            user_id=user_id,
            media_inputs=(
                payload.media
            ),
        )
    )

    fields = {
        "name":
            payload.name,

        "normalized_name":
            normalize_exercise_name(
                payload.name
            ),

        "description":
            payload.description,

        "primary_muscles":
            payload.primary_muscles,

        "secondary_muscles":
            payload.secondary_muscles,

        "equipment":
            payload.equipment,

        "mechanic":
            payload.mechanic,

        "movement_pattern":
            payload.movement_pattern,

        "instructions":
            payload.instructions,

        "tips":
            payload.tips,

        "media":
            media,

        "updated_at":
            utc_now(),
    }

    try:
        updated = (
            await repository
            .replace_custom_exercise(
                database,
                exercise_id=object_id,
                user_id=user_id,
                fields=fields,
            )
        )

    except DuplicateKeyError as error:
        raise duplicate_exercise() from error

    if not updated:
        raise exercise_not_found()

    result = (
        await repository
        .get_editable_custom_exercise(
            database,
            exercise_id=object_id,
            user_id=user_id,
        )
    )

    if result is None:
        raise exercise_not_found()

    return result


async def archive_custom_exercise(
    database: Database,
    *,
    exercise_id: str,
    user_id: ObjectId,
) -> None:
    if not ObjectId.is_valid(
        exercise_id
    ):
        raise exercise_not_found()

    archived = (
        await repository
        .archive_custom_exercise(
            database,
            exercise_id=ObjectId(
                exercise_id
            ),
            user_id=user_id,
            timestamp=utc_now(),
        )
    )

    if not archived:
        raise exercise_not_found()