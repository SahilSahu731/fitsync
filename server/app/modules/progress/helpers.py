import base64
from datetime import (
    UTC,
    date,
    datetime,
    time,
    timedelta,
)
from typing import Any
from zoneinfo import (
    ZoneInfo,
    ZoneInfoNotFoundError,
)

from bson import ObjectId
from fastapi import HTTPException

from app.modules.progress import calculations
from app.modules.progress.constants import (
    MuscleRange,
    ProgressRange,
)


def user_weight_unit(
    user: dict[str, Any],
) -> str:
    value = user.get("weight_unit") or user.get("preferred_weight_unit") or "KG"

    if value not in {
        "KG",
        "LB",
    }:
        return "KG"

    return value


def user_timezone(
    user: dict[str, Any],
) -> str:
    value = user.get("timezone")

    if not value:
        return "UTC"

    try:
        ZoneInfo(value)

        return value

    except ZoneInfoNotFoundError:
        return "UTC"


def weekly_target(
    user: dict[str, Any],
) -> int:
    value = user.get(
        "weekly_workout_target",
        3,
    )

    try:
        parsed = int(value)

    except (
        TypeError,
        ValueError,
    ):
        return 3

    return max(
        1,
        min(
            7,
            parsed,
        ),
    )


def get_zone(
    timezone_name: str,
) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name)

    except ZoneInfoNotFoundError as error:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_TIMEZONE",
                "message": "Invalid IANA timezone.",
            },
        ) from error


def local_midnight_to_utc(
    local_date: date,
    zone: ZoneInfo,
) -> datetime:
    local_dt = datetime.combine(
        local_date,
        time.min,
        tzinfo=zone,
    )

    return local_dt.astimezone(UTC)


def monday_for_date(
    value: date,
) -> date:
    return value - timedelta(days=value.weekday())


def range_start(
    *,
    progress_range: ProgressRange,
    now: datetime,
    zone: ZoneInfo,
) -> datetime | None:
    if progress_range == "ALL":
        return None

    local_now = now.astimezone(zone)

    today = local_now.date()

    days = {
        "7D": 7,
        "4W": 28,
        "12W": 84,
        "6M": 183,
        "1Y": 365,
    }[progress_range]

    start_date = today - timedelta(days=days - 1)

    return local_midnight_to_utc(
        start_date,
        zone,
    )


def muscle_range_start(
    *,
    progress_range: MuscleRange,
    now: datetime,
    zone: ZoneInfo,
) -> datetime:
    mapping = {
        "7D": 7,
        "4W": 28,
        "12W": 84,
    }

    local_now = now.astimezone(zone)

    start_date = local_now.date() - timedelta(days=(mapping[progress_range] - 1))

    return local_midnight_to_utc(
        start_date,
        zone,
    )


def completed_at(
    session: dict,
) -> datetime | None:
    return session.get("completed_at")


def completed_working_sets(
    exercise: dict,
) -> list[dict]:
    return [
        workout_set
        for workout_set in exercise.get(
            "sets",
            [],
        )
        if calculations.is_working_set(workout_set)
    ]


def exercise_from_session(
    session: dict,
    exercise_id: ObjectId,
) -> dict | None:
    for exercise in session.get(
        "exercises",
        [],
    ):
        if exercise.get("exercise_id") == exercise_id:
            return exercise

    return None


def exercise_meta_map(
    exercises: list[dict],
) -> dict[str, dict]:
    return {str(exercise["_id"]): exercise for exercise in exercises}


def exercise_name_from_meta(
    exercise: dict | None,
    fallback: str,
) -> str:
    if exercise:
        return exercise.get(
            "name",
            fallback,
        )

    return fallback


def thumbnail_for_meta(
    exercise: dict | None,
) -> str | None:
    if not exercise:
        return None

    media = exercise.get(
        "media",
        [],
    )

    if not media:
        return None

    return media[0].get("thumbnail_url")


def convert_display_weight(
    value_kg: float | None,
    unit: str,
) -> float | None:
    if value_kg is None:
        return None

    return round(
        calculations.from_kg(
            value_kg,
            unit,
        ),
        2,
    )


def convert_display_volume(
    value_kg: float | None,
    unit: str,
) -> float | None:
    if value_kg is None:
        return None

    return round(
        calculations.from_kg(
            value_kg,
            unit,
        ),
        2,
    )


def encode_cursor(
    value: datetime,
) -> str:
    return base64.urlsafe_b64encode(value.isoformat().encode()).decode()


def decode_cursor(
    value: str | None,
) -> datetime | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(base64.urlsafe_b64decode(value.encode()).decode())

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_CURSOR",
                "message": "Invalid pagination cursor.",
            },
        ) from error
