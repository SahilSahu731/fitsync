from datetime import timedelta

from bson import ObjectId
from fastapi import HTTPException

from app.db.mongo import Database
from app.modules.auth.security import (
    utc_now,
)
from app.modules.progress import repository
from app.modules.progress.constants import (
    MuscleRange,
)
from app.modules.progress.helpers import (
    get_zone,
    muscle_range_start,
    user_timezone,
)
from app.modules.progress.overview_service import (
    calculate_muscle_groups,
)
from app.modules.progress.schemas import (
    MuscleGroupProgressResponse,
)


async def muscle_groups(
    database: Database,
    *,
    user_id: ObjectId,
    progress_range: MuscleRange,
) -> MuscleGroupProgressResponse:
    user = await repository.get_user(
        database,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    zone = get_zone(user_timezone(user))

    now = utc_now()

    start = muscle_range_start(
        progress_range=progress_range,
        now=now,
        zone=zone,
    )

    sessions = await repository.list_completed_sessions(
        database,
        user_id=user_id,
        start=start,
        end=now + timedelta(seconds=1),
    )

    return MuscleGroupProgressResponse(
        range=progress_range,
        items=(
            await calculate_muscle_groups(
                database,
                user_id=user_id,
                sessions=sessions,
            )
        ),
    )
