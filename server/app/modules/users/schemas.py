import re
from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from app.modules.users.models import (
    UserDocument,
)

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


USERNAME_PATTERN = re.compile(r"^[a-z0-9_]{3,24}$")


def normalize_username(
    value: str,
) -> str:
    return value.strip().lower()


class UserResponse(BaseModel):
    id: str

    email: str

    display_name: str | None

    username: str | None

    avatar_url: str | None

    email_verified: bool

    onboarding_complete: bool

    fitness_goal: FitnessGoal | None

    experience_level: ExperienceLevel | None

    weight_unit: WeightUnit

    weekly_workout_target: int

    created_at: datetime

    @classmethod
    def from_document(
        cls,
        user: UserDocument,
    ) -> "UserResponse":
        return cls(
            id=str(user["_id"]),
            email=user["email"],
            display_name=user.get("display_name"),
            username=user.get("username"),
            avatar_url=user.get("avatar_url"),
            email_verified=user["email_verified"],
            onboarding_complete=user["onboarding_complete"],
            fitness_goal=user.get("fitness_goal"),
            experience_level=user.get("experience_level"),
            weight_unit=user.get(
                "weight_unit",
                "KG",
            ),
            weekly_workout_target=user.get(
                "weekly_workout_target",
                3,
            ),
            created_at=user["created_at"],
        )


class OnboardingRequest(BaseModel):
    display_name: str = Field(
        min_length=2,
        max_length=60,
    )

    username: str

    fitness_goal: FitnessGoal

    experience_level: ExperienceLevel

    weight_unit: WeightUnit

    weekly_workout_target: int = Field(
        ge=1,
        le=7,
    )

    @field_validator("display_name")
    @classmethod
    def clean_display_name(
        cls,
        value: str,
    ) -> str:
        value = " ".join(value.split())

        if len(value) < 2:
            raise ValueError("Name is too short")

        return value

    @field_validator("username")
    @classmethod
    def validate_username(
        cls,
        value: str,
    ) -> str:
        value = normalize_username(value)

        if not USERNAME_PATTERN.fullmatch(value):
            raise ValueError(
                "Username must be 3-24 characters "
                "and contain only lowercase letters, "
                "numbers, and underscores"
            )

        return value


class ProfileUpdateRequest(BaseModel):
    display_name: str = Field(
        min_length=2,
        max_length=60,
    )

    username: str

    @field_validator("display_name")
    @classmethod
    def clean_display_name(
        cls,
        value: str,
    ) -> str:
        return " ".join(value.split())

    @field_validator("username")
    @classmethod
    def validate_username(
        cls,
        value: str,
    ) -> str:
        value = normalize_username(value)

        if not USERNAME_PATTERN.fullmatch(value):
            raise ValueError(
                "Username must be 3-24 characters "
                "and contain only lowercase letters, "
                "numbers, and underscores"
            )

        return value


class PreferencesUpdateRequest(BaseModel):
    fitness_goal: FitnessGoal

    experience_level: ExperienceLevel

    weight_unit: WeightUnit

    weekly_workout_target: int = Field(
        ge=1,
        le=7,
    )


class UsernameAvailabilityResponse(BaseModel):
    username: str

    available: bool


class DeleteAccountRequest(BaseModel):
    confirmation: Literal["DELETE"]


class MessageResponse(BaseModel):
    message: str
