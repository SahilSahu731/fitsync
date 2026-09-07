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


class TemplateSetDocument(
    TypedDict,
):
    id: str

    position: int

    type: WorkoutSetType

    target_reps_min: int | None

    target_reps_max: int | None

    target_weight: float | None

    target_rpe: float | None

    target_rir: int | None


class TemplateExerciseDocument(
    TypedDict,
):
    id: str

    exercise_id: ObjectId

    position: int

    rest_seconds: int

    notes: str | None

    superset_group_id: str | None

    planned_sets: list[
        TemplateSetDocument
    ]


class WorkoutTemplateDocument(
    TypedDict,
):
    _id: ObjectId

    user_id: ObjectId

    name: str

    description: str | None

    exercises: list[
        TemplateExerciseDocument
    ]

    created_at: datetime

    updated_at: datetime

    archived_at: datetime | None