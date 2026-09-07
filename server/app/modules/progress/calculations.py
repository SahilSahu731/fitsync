from app.modules.progress.constants import (
    E1RM_MAX_REPS,
    LB_TO_KG,
    WORKING_SET_TYPES,
)


def lb_to_kg(
    value: float,
) -> float:
    return value * LB_TO_KG


def kg_to_lb(
    value: float,
) -> float:
    return value / LB_TO_KG


def to_kg(
    weight: float,
    unit: str,
) -> float:
    if unit == "LB":
        return lb_to_kg(weight)

    return weight


def from_kg(
    weight_kg: float,
    unit: str,
) -> float:
    if unit == "LB":
        return kg_to_lb(weight_kg)

    return weight_kg


def round_weight(
    value: float,
) -> float:
    return round(
        value,
        2,
    )


def is_working_set(
    workout_set: dict,
) -> bool:
    return bool(workout_set.get("completed")) and workout_set.get("type") in WORKING_SET_TYPES


def is_pr_eligible_set(
    workout_set: dict,
) -> bool:
    if not is_working_set(workout_set):
        return False

    reps = workout_set.get("reps")

    if reps is None or reps <= 0:
        return False

    weight = workout_set.get("weight")

    if weight is None:
        return True

    return weight >= 0


def normalized_weight_kg(
    workout_set: dict,
) -> float:
    weight = workout_set.get("weight")

    if weight is None:
        return 0.0

    return to_kg(
        float(weight),
        workout_set.get(
            "weight_unit",
            "KG",
        ),
    )


def calculate_set_volume_kg(
    workout_set: dict,
) -> float:
    if not is_working_set(workout_set):
        return 0.0

    reps = workout_set.get("reps")

    if reps is None or reps <= 0:
        return 0.0

    return normalized_weight_kg(workout_set) * reps


def calculate_epley_1rm_kg(
    workout_set: dict,
) -> float | None:
    if not is_pr_eligible_set(workout_set):
        return None

    reps = workout_set.get("reps")

    if reps is None or reps < 1 or reps > E1RM_MAX_REPS:
        return None

    weight_kg = normalized_weight_kg(workout_set)

    if weight_kg <= 0:
        return None

    if reps == 1:
        return weight_kg

    return weight_kg * (1 + reps / 30)


def percent_change(
    previous: float,
    current: float,
) -> float | None:
    if previous <= 0:
        return None

    return (current - previous) / previous * 100


def record_weight_key(
    weight_kg: float,
) -> str:
    return f"{weight_kg:.4f}"
