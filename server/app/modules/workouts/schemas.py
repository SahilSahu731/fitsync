from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.modules.exercises.models import (
    ExerciseLaterality,
    ExerciseLoadMode,
    ExerciseTrackingType,
)
from app.modules.workouts.models import WeightUnit, WorkoutSetType


class TemplateSetInput(BaseModel):
    type: WorkoutSetType = "NORMAL"
    target_reps_min: int | None = Field(default=None, ge=1, le=1000)
    target_reps_max: int | None = Field(default=None, ge=1, le=1000)
    target_weight: float | None = Field(default=None, ge=0, le=5000)
    target_duration_seconds: int | None = Field(default=None, ge=1, le=86400)
    target_distance_meters: float | None = Field(default=None, ge=0, le=1_000_000)
    target_rpe: float | None = Field(default=None, ge=1, le=10)
    target_rir: int | None = Field(default=None, ge=0, le=10)

    @model_validator(mode="after")
    def validate_rep_range(self):
        if (
            self.target_reps_min is not None
            and self.target_reps_max is not None
            and self.target_reps_min > self.target_reps_max
        ):
            raise ValueError("Minimum reps cannot be greater than maximum reps")
        return self


class TemplateExerciseInput(BaseModel):
    exercise_id: str
    rest_seconds: int = Field(default=120, ge=0, le=900)
    notes: str | None = Field(default=None, max_length=500)
    superset_group_id: str | None = Field(default=None, max_length=100)
    planned_sets: list[TemplateSetInput] = Field(
        default_factory=lambda: [TemplateSetInput(), TemplateSetInput(), TemplateSetInput()],
        min_length=1,
        max_length=20,
    )


class WorkoutTemplateCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    exercises: list[TemplateExerciseInput] = Field(min_length=1, max_length=30)


class WorkoutTemplateUpdateRequest(WorkoutTemplateCreateRequest):
    pass


class TemplateSetResponse(BaseModel):
    id: str
    position: int
    type: WorkoutSetType
    target_reps_min: int | None
    target_reps_max: int | None
    target_weight: float | None
    target_duration_seconds: int | None
    target_distance_meters: float | None
    target_rpe: float | None
    target_rir: int | None


class TemplateExerciseResponse(BaseModel):
    id: str
    exercise_id: str
    exercise_name: str
    thumbnail_url: str | None
    tracking_type: ExerciseTrackingType
    laterality: ExerciseLaterality
    load_mode: ExerciseLoadMode
    position: int
    rest_seconds: int
    notes: str | None
    superset_group_id: str | None
    planned_sets: list[TemplateSetResponse]


class WorkoutTemplateResponse(BaseModel):
    id: str
    name: str
    description: str | None
    exercise_count: int
    exercises: list[TemplateExerciseResponse]
    created_at: str
    updated_at: str


class WorkoutTemplateListItem(BaseModel):
    id: str
    name: str
    description: str | None
    exercise_count: int
    exercise_names: list[str]
    thumbnail_url: str | None
    updated_at: str


class WorkoutTemplateListResponse(BaseModel):
    items: list[WorkoutTemplateListItem]


class StartWorkoutRequest(BaseModel):
    template_id: str | None = None
    name: str | None = Field(default=None, max_length=80)
    client_workout_id: str | None = Field(default=None, min_length=10, max_length=100)
    started_at: datetime | None = None


class WorkoutSetMutationInput(BaseModel):
    id: str
    type: WorkoutSetType = "NORMAL"
    target_reps_min: int | None = Field(default=None, ge=1, le=1000)
    target_reps_max: int | None = Field(default=None, ge=1, le=1000)
    target_weight: float | None = Field(default=None, ge=0, le=5000)
    target_duration_seconds: int | None = Field(default=None, ge=1, le=86400)
    target_distance_meters: float | None = Field(default=None, ge=0, le=1_000_000)
    target_rpe: float | None = Field(default=None, ge=1, le=10)
    target_rir: int | None = Field(default=None, ge=0, le=10)
    reps: int | None = Field(default=None, ge=0, le=10000)
    weight: float | None = Field(default=None, ge=0, le=5000)
    weight_unit: WeightUnit
    duration_seconds: int | None = Field(default=None, ge=0, le=86400)
    distance_meters: float | None = Field(default=None, ge=0, le=1_000_000)
    rpe: float | None = Field(default=None, ge=1, le=10)
    rir: int | None = Field(default=None, ge=0, le=10)
    completed: bool

    @model_validator(mode="after")
    def validate_targets(self):
        if (
            self.target_reps_min is not None
            and self.target_reps_max is not None
            and self.target_reps_min > self.target_reps_max
        ):
            raise ValueError("Minimum reps cannot exceed maximum reps")
        return self


class WorkoutExerciseMutationInput(BaseModel):
    id: str
    exercise_id: str
    tracking_type: ExerciseTrackingType = "WEIGHT_REPS"
    laterality: ExerciseLaterality = "BILATERAL"
    load_mode: ExerciseLoadMode = "TOTAL"
    rest_seconds: int = Field(ge=0, le=900)
    notes: str | None = Field(default=None, max_length=500)
    superset_group_id: str | None = Field(default=None, max_length=100)
    sets: list[WorkoutSetMutationInput] = Field(min_length=1, max_length=30)


class WorkoutSessionUpdateRequest(BaseModel):
    revision: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=80)
    notes: str | None = Field(default=None, max_length=2000)
    exercises: list[WorkoutExerciseMutationInput] = Field(
        default_factory=list,
        max_length=40,
    )


class AddWorkoutExercisesRequest(BaseModel):
    revision: int = Field(ge=1)
    exercise_ids: list[str] = Field(min_length=1, max_length=20)


class WorkoutRevisionRequest(BaseModel):
    revision: int = Field(ge=1)
    completed_at: datetime | None = None


class WorkoutSetResponse(BaseModel):
    id: str
    position: int
    type: WorkoutSetType
    target_reps_min: int | None
    target_reps_max: int | None
    target_weight: float | None
    target_duration_seconds: int | None
    target_distance_meters: float | None
    target_rpe: float | None
    target_rir: int | None
    reps: int | None
    weight: float | None
    weight_unit: WeightUnit
    duration_seconds: int | None
    distance_meters: float | None
    rpe: float | None
    rir: int | None
    completed: bool
    completed_at: str | None


class WorkoutExerciseResponse(BaseModel):
    id: str
    exercise_id: str
    exercise_name: str
    thumbnail_url: str | None
    tracking_type: ExerciseTrackingType
    laterality: ExerciseLaterality
    load_mode: ExerciseLoadMode
    position: int
    rest_seconds: int
    notes: str | None
    superset_group_id: str | None
    sets: list[WorkoutSetResponse]


class WorkoutSessionResponse(BaseModel):
    id: str
    client_workout_id: str
    template_id: str | None
    name: str
    status: Literal["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
    started_at: str
    completed_at: str | None
    cancelled_at: str | None
    duration_seconds: int | None
    notes: str | None
    exercises: list[WorkoutExerciseResponse]
    completed_set_count: int
    total_set_count: int
    revision: int


class WorkoutHistoryItem(BaseModel):
    id: str
    name: str
    started_at: str
    completed_at: str
    duration_seconds: int
    exercise_count: int
    completed_set_count: int
    exercise_names: list[str]


class WorkoutHistoryResponse(BaseModel):
    items: list[WorkoutHistoryItem]
    next_cursor: str | None


class ActiveWorkoutResponse(BaseModel):
    workout: WorkoutSessionResponse | None


class MessageResponse(BaseModel):
    message: str


class PreviousPerformanceRequest(BaseModel):
    exercise_ids: list[str] = Field(min_length=1, max_length=40)


class PreviousSetResponse(BaseModel):
    type: WorkoutSetType
    weight: float | None
    weight_unit: WeightUnit
    reps: int | None
    duration_seconds: int | None
    distance_meters: float | None
    rpe: float | None


class PreviousExercisePerformance(BaseModel):
    exercise_id: str
    completed_at: str
    sets: list[PreviousSetResponse]


class PreviousPerformanceResponse(BaseModel):
    items: list[PreviousExercisePerformance]
