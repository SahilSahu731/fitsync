import base64
from collections import defaultdict
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

from app.db.mongo import Database
from app.modules.auth.security import (
    utc_now,
)
from app.modules.progress import (
    calculations,
    repository,
)
from app.modules.progress.constants import (
    MuscleRange,
    PersonalRecordType,
    ProgressRange,
)
from app.modules.progress.models import (
    PersonalRecordDocument,
)
from app.modules.progress.schemas import (
    ActivityCalendarDayResponse,
    ActivityCalendarResponse,
    ExerciseCurrentRecordsResponse,
    ExerciseProgressExerciseResponse,
    ExerciseProgressPoint,
    ExerciseProgressResponse,
    ExerciseProgressSummaryResponse,
    ExerciseSessionListResponse,
    ExerciseSessionResponse,
    ExerciseSessionSetResponse,
    MuscleGroupProgressItem,
    MuscleGroupProgressResponse,
    PersonalRecordListResponse,
    PersonalRecordResponse,
    ProgressComparisonResponse,
    ProgressOverviewResponse,
    ProgressPeriodResponse,
    ProgressPreferencesResponse,
    ProgressPreferencesUpdateRequest,
    ProgressTotalsResponse,
    TopExerciseProgressItem,
    WeeklyGoalResponse,
    WeeklyProgressPoint,
    WorkoutPersonalRecordsResponse,
)

# =========================================================
# GENERAL HELPERS
# =========================================================


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


# =========================================================
# PREFERENCES
# =========================================================


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


# =========================================================
# PERSONAL RECORD HELPERS
# =========================================================


def update_best_state_from_set(
    *,
    state: dict,
    workout_set: dict,
) -> None:
    if not calculations.is_pr_eligible_set(workout_set):
        return

    reps = int(workout_set.get("reps") or 0)

    weight_kg = calculations.normalized_weight_kg(workout_set)

    if weight_kg > state["weight"]:
        state["weight"] = weight_kg

    e1rm = calculations.calculate_epley_1rm_kg(workout_set)

    if e1rm is not None and e1rm > state["e1rm"]:
        state["e1rm"] = e1rm

    volume = calculations.calculate_set_volume_kg(workout_set)

    if volume > state["volume"]:
        state["volume"] = volume

    weight_key = calculations.record_weight_key(weight_kg)

    state["reps_at_weight"][weight_key] = max(
        state["reps_at_weight"].get(
            weight_key,
            0,
        ),
        reps,
    )


def build_historical_bests(
    sessions: list[dict],
    exercise_ids: list[ObjectId],
) -> dict[str, dict]:
    states = {
        str(exercise_id): {
            "weight": 0.0,
            "e1rm": 0.0,
            "volume": 0.0,
            "reps_at_weight": {},
        }
        for exercise_id in exercise_ids
    }

    for session in sessions:
        for exercise in session.get(
            "exercises",
            [],
        ):
            exercise_id = str(exercise.get("exercise_id"))

            if exercise_id not in states:
                continue

            for workout_set in exercise.get(
                "sets",
                [],
            ):
                update_best_state_from_set(
                    state=states[exercise_id],
                    workout_set=workout_set,
                )

    return states


async def detect_personal_records_for_workout(
    database: Database,
    *,
    user_id: ObjectId,
    session_id: str,
) -> list[PersonalRecordDocument]:
    if not ObjectId.is_valid(session_id):
        return []

    session = await repository.get_completed_session(
        database,
        user_id=user_id,
        session_id=ObjectId(session_id),
    )

    if session is None:
        return []

    completion_time = session.get("completed_at")

    if completion_time is None:
        return []

    exercise_ids = list(
        {
            exercise["exercise_id"]
            for exercise in session.get(
                "exercises",
                [],
            )
        }
    )

    previous_sessions = await repository.list_previous_completed_sessions(
        database,
        user_id=user_id,
        completed_before=completion_time,
        exercise_ids=exercise_ids,
    )

    bests = build_historical_bests(
        previous_sessions,
        exercise_ids,
    )

    inserted: list[PersonalRecordDocument] = []

    for exercise in sorted(
        session.get(
            "exercises",
            [],
        ),
        key=lambda item: item.get(
            "position",
            0,
        ),
    ):
        exercise_id_obj = exercise["exercise_id"]

        exercise_id = str(exercise_id_obj)

        state = bests[exercise_id]

        for workout_set in sorted(
            exercise.get(
                "sets",
                [],
            ),
            key=lambda item: item.get(
                "position",
                0,
            ),
        ):
            if not calculations.is_pr_eligible_set(workout_set):
                continue

            weight_kg = calculations.normalized_weight_kg(workout_set)

            reps = int(workout_set.get("reps") or 0)

            e1rm = calculations.calculate_epley_1rm_kg(workout_set)

            volume = calculations.calculate_set_volume_kg(workout_set)

            candidates: list[
                tuple[
                    PersonalRecordType,
                    float,
                ]
            ] = []

            if weight_kg > 0 and weight_kg > state["weight"]:
                candidates.append(
                    (
                        "WEIGHT",
                        weight_kg,
                    )
                )

            if e1rm is not None and e1rm > state["e1rm"]:
                candidates.append(
                    (
                        "ESTIMATED_1RM",
                        e1rm,
                    )
                )

            if volume > 0 and volume > state["volume"]:
                candidates.append(
                    (
                        "SET_VOLUME",
                        volume,
                    )
                )

            weight_key = calculations.record_weight_key(weight_kg)

            old_reps = state["reps_at_weight"].get(
                weight_key,
                0,
            )

            if reps > old_reps:
                candidates.append(
                    (
                        "REPS_AT_WEIGHT",
                        float(reps),
                    )
                )

            for (
                record_type,
                value,
            ) in candidates:
                record: PersonalRecordDocument = {
                    "_id": ObjectId(),
                    "user_id": user_id,
                    "exercise_id": exercise_id_obj,
                    "workout_session_id": session["_id"],
                    "set_id": workout_set["id"],
                    "record_type": record_type,
                    "value": float(value),
                    "weight_kg": weight_kg,
                    "reps": reps,
                    "estimated_1rm_kg": e1rm,
                    "set_volume_kg": volume,
                    "created_at": completion_time,
                }

                created = await repository.upsert_personal_record(
                    database,
                    record=record,
                )

                if created:
                    inserted.append(record)

            update_best_state_from_set(
                state=state,
                workout_set=workout_set,
            )

    return inserted


# =========================================================
# RECORD RESPONSES
# =========================================================


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


async def record_responses(
    database: Database,
    *,
    user_id: ObjectId,
    records: list[PersonalRecordDocument],
    weight_unit: str,
) -> list[PersonalRecordResponse]:
    exercise_ids = list({record["exercise_id"] for record in records})

    exercise_docs = await repository.get_historical_exercises(
        database,
        user_id=user_id,
        exercise_ids=exercise_ids,
    )

    names = {
        str(exercise["_id"]): exercise.get(
            "name",
            "Exercise",
        )
        for exercise in exercise_docs
    }

    result = []

    for record in records:
        exercise_id = str(record["exercise_id"])

        result.append(
            PersonalRecordResponse(
                id=str(record["_id"]),
                exercise_id=exercise_id,
                exercise_name=names.get(
                    exercise_id,
                    "Exercise",
                ),
                workout_session_id=str(record["workout_session_id"]),
                set_id=record["set_id"],
                record_type=record["record_type"],
                value=(
                    round(
                        calculations.from_kg(
                            record["value"],
                            weight_unit,
                        ),
                        2,
                    )
                    if record["record_type"]
                    in {
                        "WEIGHT",
                        "ESTIMATED_1RM",
                        "SET_VOLUME",
                    }
                    else record["value"]
                ),
                weight=round(
                    calculations.from_kg(
                        record["weight_kg"],
                        weight_unit,
                    ),
                    2,
                ),
                weight_unit=weight_unit,
                reps=record["reps"],
                estimated_1rm=(
                    convert_display_weight(
                        record["estimated_1rm_kg"],
                        weight_unit,
                    )
                ),
                set_volume=(
                    convert_display_volume(
                        record["set_volume_kg"],
                        weight_unit,
                    )
                ),
                created_at=record["created_at"].isoformat(),
            )
        )

    return result


async def list_personal_records(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_id: str | None,
    record_type: str | None,
    cursor: str | None,
    limit: int,
) -> PersonalRecordListResponse:
    user = await repository.get_user(
        database,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    exercise_object_id = None

    if exercise_id:
        if not ObjectId.is_valid(exercise_id):
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "EXERCISE_NOT_FOUND",
                    "message": "Exercise not found.",
                },
            )

        exercise_object_id = ObjectId(exercise_id)

    before = decode_cursor(cursor)

    records = await repository.list_personal_records(
        database,
        user_id=user_id,
        exercise_id=exercise_object_id,
        record_type=record_type,
        before=before,
        limit=limit + 1,
    )

    has_more = len(records) > limit

    selected = records[:limit]

    responses = await record_responses(
        database,
        user_id=user_id,
        records=selected,
        weight_unit=user_weight_unit(user),
    )

    next_cursor = None

    if has_more and selected:
        next_cursor = encode_cursor(selected[-1]["created_at"])

    return PersonalRecordListResponse(
        items=responses,
        next_cursor=next_cursor,
    )


async def workout_personal_records(
    database: Database,
    *,
    user_id: ObjectId,
    session_id: str,
) -> WorkoutPersonalRecordsResponse:
    if not ObjectId.is_valid(session_id):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "WORKOUT_NOT_FOUND",
                "message": "Workout not found.",
            },
        )

    user = await repository.get_user(
        database,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    records = await repository.list_workout_personal_records(
        database,
        user_id=user_id,
        workout_session_id=ObjectId(session_id),
    )

    return WorkoutPersonalRecordsResponse(
        items=await record_responses(
            database,
            user_id=user_id,
            records=records,
            weight_unit=user_weight_unit(user),
        )
    )


# =========================================================
# WORKOUT METRICS
# =========================================================


def session_metrics(
    session: dict,
) -> tuple[
    int,
    float,
]:
    working_sets = 0

    volume_kg = 0.0

    for exercise in session.get(
        "exercises",
        [],
    ):
        for workout_set in exercise.get(
            "sets",
            [],
        ):
            if not calculations.is_working_set(workout_set):
                continue

            working_sets += 1

            volume_kg += calculations.calculate_set_volume_kg(workout_set)

    return (
        working_sets,
        volume_kg,
    )


def totals_for_sessions(
    sessions: list[dict],
    *,
    display_unit: str,
) -> ProgressTotalsResponse:
    working_sets = 0

    volume_kg = 0.0

    duration_seconds = 0

    for session in sessions:
        (
            sets,
            volume,
        ) = session_metrics(session)

        working_sets += sets

        volume_kg += volume

        duration_seconds += int(session.get("duration_seconds") or 0)

    return ProgressTotalsResponse(
        workouts=len(sessions),
        working_sets=working_sets,
        volume=round(
            calculations.from_kg(
                volume_kg,
                display_unit,
            ),
            2,
        ),
        duration_seconds=duration_seconds,
    )


# =========================================================
# WEEKLY CONSISTENCY
# =========================================================


def weekly_session_groups(
    sessions: list[dict],
    *,
    zone: ZoneInfo,
) -> dict[
    date,
    list[dict],
]:
    groups: dict[
        date,
        list[dict],
    ] = defaultdict(list)

    for session in sessions:
        completed = completed_at(session)

        if completed is None:
            continue

        local_date = completed.astimezone(zone).date()

        week_start = monday_for_date(local_date)

        groups[week_start].append(session)

    return groups


def streak_metrics(
    *,
    groups: dict[
        date,
        list[dict],
    ],
    target: int,
    current_week: date,
) -> tuple[
    int,
    int,
    int,
    int,
]:
    if not groups:
        return (
            0,
            0,
            0,
            0,
        )

    successful = {
        week
        for (
            week,
            sessions,
        ) in groups.items()
        if len(sessions) >= target
    }

    weeks_goal_met = len(successful)

    total_training_weeks = len(groups)

    current_streak = 0

    cursor = current_week

    if cursor not in successful:
        cursor = cursor - timedelta(days=7)

    while cursor in successful:
        current_streak += 1

        cursor = cursor - timedelta(days=7)

    if not successful:
        return (
            current_streak,
            0,
            weeks_goal_met,
            total_training_weeks,
        )

    sorted_successful = sorted(successful)

    best = 1
    running = 1

    for index in range(
        1,
        len(sorted_successful),
    ):
        expected = sorted_successful[index - 1] + timedelta(days=7)

        if sorted_successful[index] == expected:
            running += 1

            best = max(
                best,
                running,
            )

        else:
            running = 1

    return (
        current_streak,
        best,
        weeks_goal_met,
        total_training_weeks,
    )


def weekly_goal_response(
    *,
    sessions: list[dict],
    target: int,
    zone: ZoneInfo,
    now: datetime,
) -> WeeklyGoalResponse:
    local_today = now.astimezone(zone).date()

    current_week = monday_for_date(local_today)

    groups = weekly_session_groups(
        sessions,
        zone=zone,
    )

    completed = len(
        groups.get(
            current_week,
            [],
        )
    )

    (
        current_streak,
        best_streak,
        weeks_goal_met,
        total_training_weeks,
    ) = streak_metrics(
        groups=groups,
        target=target,
        current_week=current_week,
    )

    week_end = current_week + timedelta(days=7)

    return WeeklyGoalResponse(
        target=target,
        completed=completed,
        remaining=max(
            target - completed,
            0,
        ),
        percentage=min(
            100.0,
            (completed / target * 100),
        ),
        week_start=(
            local_midnight_to_utc(
                current_week,
                zone,
            ).isoformat()
        ),
        week_end=(
            local_midnight_to_utc(
                week_end,
                zone,
            ).isoformat()
        ),
        current_streak=current_streak,
        best_streak=best_streak,
        weeks_goal_met=weeks_goal_met,
        total_training_weeks=(total_training_weeks),
    )


# =========================================================
# WEEKLY SERIES
# =========================================================


def weekly_series(
    *,
    sessions: list[dict],
    zone: ZoneInfo,
    display_unit: str,
) -> list[WeeklyProgressPoint]:
    grouped = weekly_session_groups(
        sessions,
        zone=zone,
    )

    result = []

    for week in sorted(grouped):
        current = grouped[week]

        totals = totals_for_sessions(
            current,
            display_unit=(display_unit),
        )

        result.append(
            WeeklyProgressPoint(
                week_start=(
                    local_midnight_to_utc(
                        week,
                        zone,
                    ).isoformat()
                ),
                workout_count=(totals.workouts),
                working_sets=(totals.working_sets),
                volume=(totals.volume),
                duration_seconds=(totals.duration_seconds),
            )
        )

    return result


# =========================================================
# MUSCLE EXPOSURE
# =========================================================


async def calculate_muscle_groups(
    database: Database,
    *,
    user_id: ObjectId,
    sessions: list[dict],
) -> list[MuscleGroupProgressItem]:
    exercise_ids = list(
        {
            exercise["exercise_id"]
            for session in sessions
            for exercise in session.get(
                "exercises",
                [],
            )
        }
    )

    metadata = await repository.get_historical_exercises(
        database,
        user_id=user_id,
        exercise_ids=exercise_ids,
    )

    meta_map = exercise_meta_map(metadata)

    set_counts: dict[
        str,
        float,
    ] = defaultdict(float)

    exercise_sets: dict[
        str,
        set[str],
    ] = defaultdict(set)

    for session in sessions:
        for exercise in session.get(
            "exercises",
            [],
        ):
            exercise_id = str(exercise["exercise_id"])

            meta = meta_map.get(exercise_id)

            if not meta:
                continue

            working_count = len(completed_working_sets(exercise))

            if working_count <= 0:
                continue

            primary = set(
                meta.get(
                    "primary_muscles",
                    [],
                )
            )

            secondary = set(
                meta.get(
                    "secondary_muscles",
                    [],
                )
            )

            secondary -= primary

            for muscle in primary:
                set_counts[muscle] += working_count

                exercise_sets[muscle].add(exercise_id)

            for muscle in secondary:
                set_counts[muscle] += working_count * 0.5

                exercise_sets[muscle].add(exercise_id)

    return [
        MuscleGroupProgressItem(
            muscle=muscle,
            estimated_sets=round(
                value,
                1,
            ),
            exercise_count=len(exercise_sets[muscle]),
        )
        for (
            muscle,
            value,
        ) in sorted(
            set_counts.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    ]


# =========================================================
# TOP EXERCISES
# =========================================================


async def top_exercises(
    database: Database,
    *,
    user_id: ObjectId,
    sessions: list[dict],
    display_unit: str,
    limit: int = 5,
) -> list[TopExerciseProgressItem]:
    stats: dict[
        str,
        dict,
    ] = {}

    exercise_ids = set()

    for session in sessions:
        for exercise in session.get(
            "exercises",
            [],
        ):
            exercise_id = str(exercise["exercise_id"])

            exercise_ids.add(exercise["exercise_id"])

            if exercise_id not in stats:
                stats[exercise_id] = {
                    "session_count": 0,
                    "first_best": None,
                    "latest_best": None,
                    "name": exercise.get(
                        "exercise_name_snapshot",
                        "Exercise",
                    ),
                }

            working_sets = completed_working_sets(exercise)

            if not working_sets:
                continue

            best_e1rm = max(
                (
                    value
                    for value in (
                        calculations.calculate_epley_1rm_kg(workout_set)
                        for workout_set in working_sets
                    )
                    if value is not None
                ),
                default=None,
            )

            stat = stats[exercise_id]

            stat["session_count"] += 1

            if best_e1rm is not None:
                if stat["first_best"] is None:
                    stat["first_best"] = best_e1rm

                stat["latest_best"] = max(
                    stat["latest_best"] or 0,
                    best_e1rm,
                )

    metadata = await repository.get_historical_exercises(
        database,
        user_id=user_id,
        exercise_ids=list(exercise_ids),
    )

    meta_map = exercise_meta_map(metadata)

    ranked = sorted(
        stats.items(),
        key=lambda item: item[1]["session_count"],
        reverse=True,
    )[:limit]

    result = []

    for (
        exercise_id,
        stat,
    ) in ranked:
        first = stat["first_best"]

        latest = stat["latest_best"]

        change = None

        if first is not None and latest is not None:
            change = calculations.percent_change(
                first,
                latest,
            )

        meta = meta_map.get(exercise_id)

        result.append(
            TopExerciseProgressItem(
                exercise_id=exercise_id,
                exercise_name=(
                    exercise_name_from_meta(
                        meta,
                        stat["name"],
                    )
                ),
                session_count=stat["session_count"],
                latest_best_e1rm=(
                    convert_display_weight(
                        latest,
                        display_unit,
                    )
                ),
                change_percent=(
                    round(
                        change,
                        1,
                    )
                    if change is not None
                    else None
                ),
            )
        )

    return result


# =========================================================
# OVERVIEW
# =========================================================


async def overview(
    database: Database,
    *,
    user_id: ObjectId,
    progress_range: ProgressRange,
) -> ProgressOverviewResponse:
    user = await repository.get_user(
        database,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    timezone_name = user_timezone(user)

    zone = get_zone(timezone_name)

    display_unit = user_weight_unit(user)

    now = utc_now()

    start = range_start(
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

    all_sessions = await repository.list_completed_sessions(
        database,
        user_id=user_id,
    )

    current_totals = totals_for_sessions(
        sessions,
        display_unit=(display_unit),
    )

    local_today = now.astimezone(zone).date()

    current_week = monday_for_date(local_today)

    previous_week = current_week - timedelta(days=7)

    next_week = current_week + timedelta(days=7)

    current_week_start_utc = local_midnight_to_utc(
        current_week,
        zone,
    )

    previous_week_start_utc = local_midnight_to_utc(
        previous_week,
        zone,
    )

    next_week_start_utc = local_midnight_to_utc(
        next_week,
        zone,
    )

    this_week_sessions = [
        session
        for session in all_sessions
        if (
            completed_at(session) is not None
            and current_week_start_utc <= completed_at(session) < next_week_start_utc
        )
    ]

    previous_week_sessions = [
        session
        for session in all_sessions
        if (
            completed_at(session) is not None
            and previous_week_start_utc <= completed_at(session) < current_week_start_utc
        )
    ]

    this_week_totals = totals_for_sessions(
        this_week_sessions,
        display_unit=(display_unit),
    )

    previous_week_totals = totals_for_sessions(
        previous_week_sessions,
        display_unit=(display_unit),
    )

    records = await repository.list_personal_records(
        database,
        user_id=user_id,
        limit=5,
    )

    recent_prs = await record_responses(
        database,
        user_id=user_id,
        records=records,
        weight_unit=(display_unit),
    )

    return ProgressOverviewResponse(
        period=ProgressPeriodResponse(
            range=progress_range,
            start=(start.isoformat() if start else None),
            end=now.isoformat(),
        ),
        weight_unit=display_unit,
        totals=current_totals,
        comparison=(
            ProgressComparisonResponse(
                workouts_change=(
                    calculations.percent_change(
                        previous_week_totals.workouts,
                        this_week_totals.workouts,
                    )
                ),
                working_sets_change=(
                    calculations.percent_change(
                        previous_week_totals.working_sets,
                        this_week_totals.working_sets,
                    )
                ),
                volume_change=(
                    calculations.percent_change(
                        previous_week_totals.volume,
                        this_week_totals.volume,
                    )
                ),
            )
        ),
        weekly_goal=(
            weekly_goal_response(
                sessions=all_sessions,
                target=weekly_target(user),
                zone=zone,
                now=now,
            )
        ),
        recent_prs=recent_prs,
        top_exercises=(
            await top_exercises(
                database,
                user_id=user_id,
                sessions=sessions,
                display_unit=(display_unit),
            )
        ),
        weekly_volume=weekly_series(
            sessions=sessions,
            zone=zone,
            display_unit=display_unit,
        ),
        muscle_groups=(
            await calculate_muscle_groups(
                database,
                user_id=user_id,
                sessions=sessions,
            )
        ),
    )


# =========================================================
# EXERCISE PROGRESS
# =========================================================


async def get_historical_exercise(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_id: ObjectId,
) -> dict:
    documents = await repository.get_historical_exercises(
        database,
        user_id=user_id,
        exercise_ids=[exercise_id],
    )

    if not documents:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "EXERCISE_NOT_FOUND",
                "message": "Exercise not found.",
            },
        )

    return documents[0]


def exercise_summary_from_sessions(
    sessions: list[dict],
    *,
    exercise_id: ObjectId,
    display_unit: str,
):
    session_count = 0

    working_set_count = 0

    volume_kg = 0.0

    heaviest = None

    best_e1rm = None

    best_set_volume = None

    most_reps = None

    for session in sessions:
        exercise = exercise_from_session(
            session,
            exercise_id,
        )

        if exercise is None:
            continue

        sets = completed_working_sets(exercise)

        if not sets:
            continue

        session_count += 1

        working_set_count += len(sets)

        for workout_set in sets:
            weight_kg = calculations.normalized_weight_kg(workout_set)

            volume = calculations.calculate_set_volume_kg(workout_set)

            e1rm = calculations.calculate_epley_1rm_kg(workout_set)

            reps = workout_set.get("reps")

            volume_kg += volume

            if weight_kg > 0:
                heaviest = max(
                    heaviest or 0,
                    weight_kg,
                )

            if e1rm is not None:
                best_e1rm = max(
                    best_e1rm or 0,
                    e1rm,
                )

            if volume > 0:
                best_set_volume = max(
                    best_set_volume or 0,
                    volume,
                )

            if reps is not None and reps > 0:
                most_reps = max(
                    most_reps or 0,
                    int(reps),
                )

    return (
        ExerciseProgressSummaryResponse(
            session_count=session_count,
            working_set_count=(working_set_count),
            total_volume=round(
                calculations.from_kg(
                    volume_kg,
                    display_unit,
                ),
                2,
            ),
            heaviest_weight=(
                convert_display_weight(
                    heaviest,
                    display_unit,
                )
            ),
            best_estimated_1rm=(
                convert_display_weight(
                    best_e1rm,
                    display_unit,
                )
            ),
            best_set_volume=(
                convert_display_volume(
                    best_set_volume,
                    display_unit,
                )
            ),
            most_reps=most_reps,
        ),
        ExerciseCurrentRecordsResponse(
            heaviest_weight=(
                convert_display_weight(
                    heaviest,
                    display_unit,
                )
            ),
            best_estimated_1rm=(
                convert_display_weight(
                    best_e1rm,
                    display_unit,
                )
            ),
            best_set_volume=(
                convert_display_volume(
                    best_set_volume,
                    display_unit,
                )
            ),
            most_reps=most_reps,
        ),
    )


def exercise_points(
    sessions: list[dict],
    *,
    exercise_id: ObjectId,
    display_unit: str,
) -> list[ExerciseProgressPoint]:
    points = []

    chronological = sorted(
        sessions,
        key=lambda session: completed_at(session) or datetime.min.replace(tzinfo=UTC),
    )

    for session in chronological:
        exercise = exercise_from_session(
            session,
            exercise_id,
        )

        if exercise is None:
            continue

        sets = completed_working_sets(exercise)

        if not sets:
            continue

        best_weight_kg = max(
            (calculations.normalized_weight_kg(workout_set) for workout_set in sets),
            default=0.0,
        )

        e1rm_values = [
            value
            for value in (calculations.calculate_epley_1rm_kg(workout_set) for workout_set in sets)
            if value is not None
        ]

        best_e1rm = max(e1rm_values) if e1rm_values else None

        volume_kg = sum(calculations.calculate_set_volume_kg(workout_set) for workout_set in sets)

        completed = completed_at(session)

        if completed is None:
            continue

        points.append(
            ExerciseProgressPoint(
                workout_session_id=str(session["_id"]),
                completed_at=(completed.isoformat()),
                best_weight=(
                    convert_display_weight(
                        best_weight_kg,
                        display_unit,
                    )
                    if best_weight_kg > 0
                    else None
                ),
                best_estimated_1rm=(
                    convert_display_weight(
                        best_e1rm,
                        display_unit,
                    )
                ),
                volume=round(
                    calculations.from_kg(
                        volume_kg,
                        display_unit,
                    ),
                    2,
                ),
                working_sets=len(sets),
            )
        )

    return points


async def exercise_progress(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_id: str,
    progress_range: ProgressRange,
) -> ExerciseProgressResponse:
    if not ObjectId.is_valid(exercise_id):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "EXERCISE_NOT_FOUND",
                "message": "Exercise not found.",
            },
        )

    exercise_object_id = ObjectId(exercise_id)

    user = await repository.get_user(
        database,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    metadata = await get_historical_exercise(
        database,
        user_id=user_id,
        exercise_id=(exercise_object_id),
    )

    zone = get_zone(user_timezone(user))

    start = range_start(
        progress_range=progress_range,
        now=utc_now(),
        zone=zone,
    )

    ranged_sessions = await repository.list_exercise_sessions(
        database,
        user_id=user_id,
        exercise_id=(exercise_object_id),
        start=start,
    )

    all_sessions = await repository.list_exercise_sessions(
        database,
        user_id=user_id,
        exercise_id=(exercise_object_id),
    )

    display_unit = user_weight_unit(user)

    (
        summary,
        records,
    ) = exercise_summary_from_sessions(
        all_sessions,
        exercise_id=(exercise_object_id),
        display_unit=(display_unit),
    )

    return ExerciseProgressResponse(
        range=progress_range,
        weight_unit=display_unit,
        exercise=(
            ExerciseProgressExerciseResponse(
                id=exercise_id,
                name=metadata["name"],
                primary_muscles=metadata.get(
                    "primary_muscles",
                    [],
                ),
                equipment=metadata.get(
                    "equipment",
                    [],
                ),
                thumbnail_url=(thumbnail_for_meta(metadata)),
            )
        ),
        summary=summary,
        current_records=records,
        points=exercise_points(
            ranged_sessions,
            exercise_id=(exercise_object_id),
            display_unit=(display_unit),
        ),
    )


async def exercise_sessions(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_id: str,
    cursor: str | None,
    limit: int,
) -> ExerciseSessionListResponse:
    if not ObjectId.is_valid(exercise_id):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "EXERCISE_NOT_FOUND",
                "message": "Exercise not found.",
            },
        )

    user = await repository.get_user(
        database,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    exercise_object_id = ObjectId(exercise_id)

    before = decode_cursor(cursor)

    sessions = await repository.list_exercise_sessions(
        database,
        user_id=user_id,
        exercise_id=(exercise_object_id),
        before=before,
        limit=limit + 1,
    )

    has_more = len(sessions) > limit

    selected = sessions[:limit]

    display_unit = user_weight_unit(user)

    items = []

    for session in selected:
        exercise = exercise_from_session(
            session,
            exercise_object_id,
        )

        if exercise is None:
            continue

        completed = session.get("completed_at")

        if completed is None:
            continue

        sets = []

        for workout_set in sorted(
            exercise.get(
                "sets",
                [],
            ),
            key=lambda item: item.get(
                "position",
                0,
            ),
        ):
            if not workout_set.get("completed"):
                continue

            weight = workout_set.get("weight")

            normalized = (
                calculations.normalized_weight_kg(workout_set) if weight is not None else None
            )

            sets.append(
                ExerciseSessionSetResponse(
                    type=workout_set.get(
                        "type",
                        "NORMAL",
                    ),
                    weight=(
                        convert_display_weight(
                            normalized,
                            display_unit,
                        )
                    ),
                    weight_unit=(display_unit),
                    reps=workout_set.get("reps"),
                    rpe=workout_set.get("rpe"),
                )
            )

        items.append(
            ExerciseSessionResponse(
                workout_session_id=str(session["_id"]),
                workout_name=session.get(
                    "name",
                    "Workout",
                ),
                completed_at=(completed.isoformat()),
                sets=sets,
            )
        )

    next_cursor = None

    if has_more and selected and selected[-1].get("completed_at"):
        next_cursor = encode_cursor(selected[-1]["completed_at"])

    return ExerciseSessionListResponse(
        items=items,
        next_cursor=next_cursor,
    )


# =========================================================
# MUSCLE GROUP ENDPOINT
# =========================================================


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


# =========================================================
# ACTIVITY CALENDAR
# =========================================================


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
