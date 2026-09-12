from datetime import date

from bson import ObjectId
from fastapi import HTTPException

from app.db.mongo import Database
from app.modules.auth.security import (
    utc_now,
)
from app.modules.progress import (
    calculations,
    repository,
)
from app.modules.progress.helpers import (
    completed_at,
    get_zone,
    local_midnight_to_utc,
    user_timezone,
    user_weight_unit,
)
from app.modules.progress.overview_service import (
    session_metrics,
)
from app.modules.progress.schemas import (
    ActivityCalendarDayResponse,
    ActivityCalendarResponse,
)


def subtract_months(
    value: date,
    months: int,
) -> date:
    year = value.year

    month = value.month - months

    while month <= 0:
        year -= 1

        month += 12

    return date(
        year,
        month,
        1,
    )


async def activity_calendar(
    database: Database,
    *,
    user_id: ObjectId,
    months: int,
) -> ActivityCalendarResponse:
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

    unit = user_weight_unit(user)

    now = utc_now()

    local_today = now.astimezone(zone).date()

    start_date = subtract_months(
        local_today.replace(day=1),
        months - 1,
    )

    start = local_midnight_to_utc(
        start_date,
        zone,
    )

    sessions = await repository.list_completed_sessions(
        database,
        user_id=user_id,
        start=start,
    )

    grouped: dict[
        str,
        dict,
    ] = {}

    for session in sessions:
        completed = completed_at(session)

        if completed is None:
            continue

        key = completed.astimezone(zone).date().isoformat()

        if key not in grouped:
            grouped[key] = {
                "workouts": 0,
                "sets": 0,
                "volume_kg": 0.0,
            }

        (
            sets,
            volume,
        ) = session_metrics(session)

        grouped[key]["workouts"] += 1

        grouped[key]["sets"] += sets

        grouped[key]["volume_kg"] += volume

    return ActivityCalendarResponse(
        items=[
            ActivityCalendarDayResponse(
                date=key,
                workout_count=value["workouts"],
                working_sets=value["sets"],
                volume=round(
                    calculations.from_kg(
                        value["volume_kg"],
                        unit,
                    ),
                    2,
                ),
            )
            for (
                key,
                value,
            ) in sorted(grouped.items())
        ]
    )
