from datetime import datetime
from typing import Literal, NotRequired, TypedDict

from bson import ObjectId

FitnessGoal = Literal[
    "BUILD_MUSCLE",
    "GET_STRONGER",
    "LOSE_FAT",
    "STAY_ACTIVE",
    "IMPROVE_ENDURANCE",
    "OTHER",
]

ExperienceLevel = Literal[
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
]

WeightUnit = Literal[
    "KG",
    "LB",
]


class UserDocument(TypedDict):
    _id: ObjectId

    email: str

    display_name: str | None

    username: str | None

    avatar_url: str | None

    email_verified: bool

    onboarding_complete: bool

    created_at: datetime

    updated_at: datetime

    last_seen_at: datetime

    fitness_goal: NotRequired[FitnessGoal | None]

    experience_level: NotRequired[ExperienceLevel | None]

    weight_unit: NotRequired[WeightUnit]

    weekly_workout_target: NotRequired[int]
