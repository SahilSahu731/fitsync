from datetime import (
    UTC,
    datetime,
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
    ProgressRange,
)
from app.modules.progress.helpers import (
    completed_at,
    completed_working_sets,
    convert_display_volume,
    convert_display_weight,
    decode_cursor,
    encode_cursor,
    exercise_from_session,
    get_zone,
    range_start,
    thumbnail_for_meta,
    user_timezone,
    user_weight_unit,
)
from app.modules.progress.schemas import (
    ExerciseCurrentRecordsResponse,
    ExerciseProgressExerciseResponse,
    ExerciseProgressPoint,
    ExerciseProgressResponse,
    ExerciseProgressSummaryResponse,
    ExerciseSessionListResponse,
    ExerciseSessionResponse,
    ExerciseSessionSetResponse,
)


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
