from datetime import datetime
from typing import Literal, TypedDict

from bson import ObjectId

WorkoutSetType = Literal[
    "WARMUP",
    "NORMAL",
    "BACKOFF",
    "DROP",
    "FAILURE",
    "AMRAP",
]

WorkoutStatus = Literal[
    "PLANNED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
]

WeightUnit = Literal[
    "KG",
    "LB",
]


class TemplateSetDocument(TypedDict):
    id: str

    position: int

    type: WorkoutSetType

    target_reps_min: int | None

    target_reps_max: int | None

    target_weight: float | None

    target_rpe: float | None

    target_rir: int | None


class TemplateExerciseDocument(TypedDict):
    id: str

    exercise_id: ObjectId

    position: int

    rest_seconds: int

    notes: str | None

    superset_group_id: str | None

    planned_sets: list[TemplateSetDocument]


class WorkoutTemplateDocument(TypedDict):
    _id: ObjectId

    user_id: ObjectId

    name: str

    description: str | None

    exercises: list[TemplateExerciseDocument]

    created_at: datetime

    updated_at: datetime

    archived_at: datetime | None


class WorkoutSetDocument(TypedDict):
    id: str

    position: int

    type: WorkoutSetType

    target_reps_min: int | None

    target_reps_max: int | None

    target_weight: float | None

    target_rpe: float | None

    target_rir: int | None

    reps: int | None

    weight: float | None

    weight_unit: WeightUnit

    rpe: float | None

    rir: int | None

    completed: bool

    completed_at: datetime | None


class WorkoutExerciseDocument(TypedDict):
    id: str

    exercise_id: ObjectId

    exercise_name_snapshot: str

    thumbnail_url_snapshot: str | None

    position: int

    rest_seconds: int

    notes: str | None

    superset_group_id: str | None

    sets: list[WorkoutSetDocument]


class WorkoutSessionDocument(TypedDict):
    _id: ObjectId

    user_id: ObjectId

    client_workout_id: str

    template_id: ObjectId | None

    name: str

    status: WorkoutStatus

    started_at: datetime

    completed_at: datetime | None

    cancelled_at: datetime | None

    duration_seconds: int | None

    notes: str | None

    exercises: list[WorkoutExerciseDocument]

    created_at: datetime

    updated_at: datetime

    revision: int
