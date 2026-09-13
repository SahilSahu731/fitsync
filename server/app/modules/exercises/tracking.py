from typing import Any

from fastapi import HTTPException

from app.modules.exercises.models import (
    ExerciseDocument,
    ExerciseLaterality,
    ExerciseLoadMode,
    ExerciseTrackingType,
)

DEFAULT_TRACKING_TYPE: ExerciseTrackingType = "WEIGHT_REPS"

DEFAULT_LATERALITY: ExerciseLaterality = "BILATERAL"

DEFAULT_LOAD_MODE: ExerciseLoadMode = "TOTAL"


WEIGHT_TRACKING_TYPES = {
    "WEIGHT_REPS",
    "BODYWEIGHT_REPS",
    "ASSISTED_REPS",
    "WEIGHT_DURATION",
    "WEIGHT_DISTANCE",
}


REPS_TRACKING_TYPES = {
    "WEIGHT_REPS",
    "BODYWEIGHT_REPS",
    "ASSISTED_REPS",
    "REPS_ONLY",
}


DURATION_TRACKING_TYPES = {
    "DURATION",
    "DISTANCE_DURATION",
    "WEIGHT_DURATION",
}


DISTANCE_TRACKING_TYPES = {
    "DISTANCE_DURATION",
    "WEIGHT_DISTANCE",
}


def exercise_tracking_type(
    exercise: ExerciseDocument | dict,
) -> ExerciseTrackingType:
    return exercise.get(
        "tracking_type",
        DEFAULT_TRACKING_TYPE,
    )


def exercise_laterality(
    exercise: ExerciseDocument | dict,
) -> ExerciseLaterality:
    return exercise.get(
        "laterality",
        DEFAULT_LATERALITY,
    )


def exercise_load_mode(
    exercise: ExerciseDocument | dict,
) -> ExerciseLoadMode:
    tracking_type = exercise_tracking_type(exercise)

    if tracking_type not in WEIGHT_TRACKING_TYPES:
        return DEFAULT_LOAD_MODE

    return exercise.get(
        "load_mode",
        DEFAULT_LOAD_MODE,
    )


def exercise_default_rest_seconds(
    exercise: ExerciseDocument | dict,
) -> int:
    value = exercise.get("default_rest_seconds")

    if (
        isinstance(
            value,
            int,
        )
        and 15 <= value <= 900
    ):
        return value

    return 180 if exercise.get("mechanic") == "COMPOUND" else 90


def uses_weight(
    tracking_type: ExerciseTrackingType,
) -> bool:
    return tracking_type in WEIGHT_TRACKING_TYPES


def uses_reps(
    tracking_type: ExerciseTrackingType,
) -> bool:
    return tracking_type in REPS_TRACKING_TYPES


def uses_duration(
    tracking_type: ExerciseTrackingType,
) -> bool:
    return tracking_type in DURATION_TRACKING_TYPES


def uses_distance(
    tracking_type: ExerciseTrackingType,
) -> bool:
    return tracking_type in DISTANCE_TRACKING_TYPES


def tracking_validation_error(
    message: str,
):
    return HTTPException(
        status_code=422,
        detail={
            "code": "INVALID_TRACKING_METRICS",
            "message": message,
        },
    )


def validate_metrics(
    tracking_type: ExerciseTrackingType,
    *,
    weight: float | None,
    reps: int | None,
    duration_seconds: int | None,
    distance_meters: float | None,
) -> None:
    if weight is not None and not uses_weight(tracking_type):
        raise tracking_validation_error(f"{tracking_type} exercises do not use weight.")

    if reps is not None and not uses_reps(tracking_type):
        raise tracking_validation_error(f"{tracking_type} exercises do not use repetitions.")

    if duration_seconds is not None and not uses_duration(tracking_type):
        raise tracking_validation_error(f"{tracking_type} exercises do not use duration.")

    if distance_meters is not None and not uses_distance(tracking_type):
        raise tracking_validation_error(f"{tracking_type} exercises do not use distance.")


def validate_workout_set(
    tracking_type: ExerciseTrackingType,
    workout_set: Any,
) -> None:
    validate_metrics(
        tracking_type,
        weight=workout_set.weight,
        reps=workout_set.reps,
        duration_seconds=(workout_set.duration_seconds),
        distance_meters=(workout_set.distance_meters),
    )


def validate_template_set(
    tracking_type: ExerciseTrackingType,
    planned_set: Any,
) -> None:
    reps_present = (
        planned_set.target_reps_min is not None or planned_set.target_reps_max is not None
    )

    validate_metrics(
        tracking_type,
        weight=(planned_set.target_weight),
        reps=(1 if reps_present else None),
        duration_seconds=(planned_set.target_duration_seconds),
        distance_meters=(planned_set.target_distance_meters),
    )
