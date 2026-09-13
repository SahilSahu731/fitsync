from bson import ObjectId
from fastapi import HTTPException

from app.db.mongo import Database
from app.modules.progress import (
    calculations,
    repository,
)
from app.modules.progress.constants import (
    PersonalRecordType,
)
from app.modules.progress.helpers import (
    convert_display_volume,
    convert_display_weight,
    decode_cursor,
    encode_cursor,
    user_weight_unit,
)
from app.modules.progress.models import (
    PersonalRecordDocument,
)
from app.modules.progress.schemas import (
    PersonalRecordListResponse,
    PersonalRecordResponse,
    WorkoutPersonalRecordsResponse,
)


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
            tracking_type = exercise.get(
                "tracking_type_snapshot",
                "WEIGHT_REPS",
            )

            if tracking_type != "WEIGHT_REPS":
                continue

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
        tracking_type = exercise.get(
            "tracking_type_snapshot",
            "WEIGHT_REPS",
        )

        if tracking_type != "WEIGHT_REPS":
            continue

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
