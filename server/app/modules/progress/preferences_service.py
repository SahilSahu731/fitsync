from typing import Any

from bson import ObjectId
from fastapi import HTTPException

from app.db.mongo import Database
from app.modules.auth.security import (
    utc_now,
)
from app.modules.progress import repository
from app.modules.progress.helpers import (
    get_zone,
    user_timezone,
    user_weight_unit,
    weekly_target,
)
from app.modules.progress.schemas import (
    ProgressPreferencesResponse,
    ProgressPreferencesUpdateRequest,
)


async def get_preferences(
    database: Database,
    *,
    user_id: ObjectId,
) -> ProgressPreferencesResponse:
    user = await repository.get_user(
        database,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "User not found.",
            },
        )

    return ProgressPreferencesResponse(
        timezone=user_timezone(user),
        weekly_workout_target=(weekly_target(user)),
        weight_unit=user_weight_unit(user),
    )


async def update_preferences(
    database: Database,
    *,
    user_id: ObjectId,
    payload: ProgressPreferencesUpdateRequest,
) -> ProgressPreferencesResponse:
    current = await repository.get_user(
        database,
        user_id=user_id,
    )

    if current is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "User not found.",
            },
        )

    fields: dict[str, Any] = {}

    if payload.timezone is not None:
        get_zone(payload.timezone)

        fields["timezone"] = payload.timezone

    if payload.weekly_workout_target is not None:
        fields["weekly_workout_target"] = payload.weekly_workout_target

    if fields:
        fields["updated_at"] = utc_now()

        await repository.update_user_preferences(
            database,
            user_id=user_id,
            fields=fields,
        )

        current.update(fields)

    return ProgressPreferencesResponse(
        timezone=user_timezone(current),
        weekly_workout_target=(weekly_target(current)),
        weight_unit=user_weight_unit(current),
    )
