from datetime import datetime
from typing import Literal, TypedDict

from bson import ObjectId

ExerciseSource = Literal[
    "SYSTEM",
    "CUSTOM",
]


MuscleGroup = Literal[
    "CHEST",
    "BACK",
    "LATS",
    "TRAPS",
    "LOWER_BACK",
    "SHOULDERS",
    "FRONT_DELTS",
    "SIDE_DELTS",
    "REAR_DELTS",
    "BICEPS",
    "TRICEPS",
    "FOREARMS",
    "QUADS",
    "HAMSTRINGS",
    "GLUTES",
    "CALVES",
    "ABS",
    "OBLIQUES",
    "FULL_BODY",
    "OTHER",
]


Equipment = Literal[
    "BARBELL",
    "DUMBBELL",
    "MACHINE",
    "CABLE",
    "SMITH_MACHINE",
    "BODYWEIGHT",
    "KETTLEBELL",
    "EZ_BAR",
    "TRAP_BAR",
    "BANDS",
    "PLATE",
    "OTHER",
    "NONE",
]


ExerciseMechanic = Literal[
    "COMPOUND",
    "ISOLATION",
]


MovementPattern = Literal[
    "HORIZONTAL_PUSH",
    "VERTICAL_PUSH",
    "HORIZONTAL_PULL",
    "VERTICAL_PULL",
    "SQUAT",
    "HINGE",
    "LUNGE",
    "CARRY",
    "ROTATION",
    "CORE",
    "OTHER",
]


ExerciseMediaType = Literal[
    "IMAGE",
    "VIDEO",
]


ExerciseTrackingType = Literal[
    "WEIGHT_REPS",
    "BODYWEIGHT_REPS",
    "ASSISTED_REPS",
    "REPS_ONLY",
    "DURATION",
    "DISTANCE_DURATION",
    "WEIGHT_DURATION",
    "WEIGHT_DISTANCE",
]


ExerciseLaterality = Literal[
    "BILATERAL",
    "UNILATERAL",
    "ALTERNATING",
]


ExerciseLoadMode = Literal[
    "TOTAL",
    "PER_SIDE",
]


class ExerciseMediaDocument(
    TypedDict,
):
    id: str

    type: ExerciseMediaType

    public_id: str

    secure_url: str

    thumbnail_url: str

    width: int | None

    height: int | None

    duration_seconds: float | None

    format: str | None

    sort_order: int


class ExerciseDocument(
    TypedDict,
):
    _id: ObjectId

    source: ExerciseSource

    owner_user_id: ObjectId | None

    name: str

    normalized_name: str

    description: str | None

    primary_muscles: list[MuscleGroup]

    secondary_muscles: list[MuscleGroup]

    equipment: list[Equipment]

    mechanic: ExerciseMechanic

    movement_pattern: MovementPattern

    tracking_type: ExerciseTrackingType

    laterality: ExerciseLaterality

    load_mode: ExerciseLoadMode

    default_rest_seconds: int

    instructions: list[str]

    tips: list[str]

    media: list[ExerciseMediaDocument]

    is_archived: bool

    created_at: datetime

    updated_at: datetime
