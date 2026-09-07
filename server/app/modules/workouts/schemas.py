from pydantic import (
    BaseModel,
    Field,
    model_validator,
)

from app.modules.workouts.models import (
    WorkoutSetType,
)


class TemplateSetInput(
    BaseModel
):
    type: WorkoutSetType = (
        "NORMAL"
    )

    target_reps_min: int | None = Field(
        default=None,
        ge=1,
        le=1000,
    )

    target_reps_max: int | None = Field(
        default=None,
        ge=1,
        le=1000,
    )

    target_weight: float | None = Field(
        default=None,
        ge=0,
        le=5000,
    )

    target_rpe: float | None = Field(
        default=None,
        ge=1,
        le=10,
    )

    target_rir: int | None = Field(
        default=None,
        ge=0,
        le=10,
    )

    @model_validator(
        mode="after"
    )
    def validate_rep_range(
        self,
    ):
        if (
            self.target_reps_min
            is not None
            and
            self.target_reps_max
            is not None
            and
            self.target_reps_min
            >
            self.target_reps_max
        ):
            raise ValueError(
                "Minimum reps cannot "
                "be greater than maximum reps"
            )

        return self


class TemplateExerciseInput(
    BaseModel
):
    exercise_id: str

    rest_seconds: int = Field(
        default=120,
        ge=0,
        le=900,
    )

    notes: str | None = Field(
        default=None,
        max_length=500,
    )

    superset_group_id: str | None = Field(
        default=None,
        max_length=100,
    )

    planned_sets: list[
        TemplateSetInput
    ] = Field(
        default_factory=lambda: [
            TemplateSetInput(),
            TemplateSetInput(),
            TemplateSetInput(),
        ],
        min_length=1,
        max_length=20,
    )


class WorkoutTemplateCreateRequest(
    BaseModel
):
    name: str = Field(
        min_length=1,
        max_length=80,
    )

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    exercises: list[
        TemplateExerciseInput
    ] = Field(
        min_length=1,
        max_length=30,
    )


class WorkoutTemplateUpdateRequest(
    WorkoutTemplateCreateRequest
):
    pass


class TemplateSetResponse(
    BaseModel
):
    id: str

    position: int

    type: WorkoutSetType

    target_reps_min: int | None

    target_reps_max: int | None

    target_weight: float | None

    target_rpe: float | None

    target_rir: int | None


class TemplateExerciseResponse(
    BaseModel
):
    id: str

    exercise_id: str

    exercise_name: str

    thumbnail_url: str | None

    position: int

    rest_seconds: int

    notes: str | None

    superset_group_id: str | None

    planned_sets: list[
        TemplateSetResponse
    ]


class WorkoutTemplateResponse(
    BaseModel
):
    id: str

    name: str

    description: str | None

    exercise_count: int

    exercises: list[
        TemplateExerciseResponse
    ]

    created_at: str

    updated_at: str


class WorkoutTemplateListItem(
    BaseModel
):
    id: str

    name: str

    description: str | None

    exercise_count: int

    exercise_names: list[str]

    thumbnail_url: str | None

    updated_at: str


class WorkoutTemplateListResponse(
    BaseModel
):
    items: list[
        WorkoutTemplateListItem
    ]


class MessageResponse(BaseModel):
    message: str