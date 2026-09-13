from collections import defaultdict
from datetime import (
    date,
    datetime,
    timedelta,
)
from zoneinfo import ZoneInfo

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
    ProgressRange,
)
from app.modules.progress.helpers import (
    completed_at,
    completed_working_sets,
    convert_display_weight,
    exercise_meta_map,
    exercise_name_from_meta,
    get_zone,
    local_midnight_to_utc,
    monday_for_date,
    range_start,
    user_timezone,
    user_weight_unit,
    weekly_target,
)
from app.modules.progress.records_service import (
    record_responses,
)
from app.modules.progress.schemas import (
    MuscleGroupProgressItem,
    ProgressComparisonResponse,
    ProgressOverviewResponse,
    ProgressPeriodResponse,
    ProgressTotalsResponse,
    TopExerciseProgressItem,
    WeeklyGoalResponse,
    WeeklyProgressPoint,
)


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
        tracking_type = exercise.get(
            "tracking_type_snapshot",
            "WEIGHT_REPS",
        )

        for workout_set in exercise.get(
            "sets",
            [],
        ):
            if not calculations.is_working_set(workout_set):
                continue

            working_sets += 1

            if tracking_type == "WEIGHT_REPS":
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
