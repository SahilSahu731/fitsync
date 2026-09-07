from pydantic import (
    BaseModel,
    Field,
)

from app.modules.progress.constants import (
    MuscleRange,
    PersonalRecordType,
    ProgressRange,
    WeightUnit,
)


class ProgressPreferencesResponse(BaseModel):
    timezone: str

    weekly_workout_target: int

    weight_unit: WeightUnit


class ProgressPreferencesUpdateRequest(BaseModel):
    timezone: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    weekly_workout_target: int | None = Field(
        default=None,
        ge=1,
        le=7,
    )


class WeeklyGoalResponse(BaseModel):
    target: int

    completed: int

    remaining: int

    percentage: float

    week_start: str

    week_end: str

    current_streak: int

    best_streak: int

    weeks_goal_met: int

    total_training_weeks: int


class ProgressTotalsResponse(BaseModel):
    workouts: int

    working_sets: int

    volume: float

    duration_seconds: int


class ProgressComparisonResponse(BaseModel):
    workouts_change: float | None

    working_sets_change: float | None

    volume_change: float | None


class WeeklyProgressPoint(BaseModel):
    week_start: str

    workout_count: int

    working_sets: int

    volume: float

    duration_seconds: int


class MuscleGroupProgressItem(BaseModel):
    muscle: str

    estimated_sets: float

    exercise_count: int


class TopExerciseProgressItem(BaseModel):
    exercise_id: str

    exercise_name: str

    session_count: int

    latest_best_e1rm: float | None

    change_percent: float | None


class PersonalRecordResponse(BaseModel):
    id: str

    exercise_id: str

    exercise_name: str

    workout_session_id: str

    set_id: str

    record_type: PersonalRecordType

    value: float

    weight: float

    weight_unit: WeightUnit

    reps: int

    estimated_1rm: float | None

    set_volume: float | None

    created_at: str


class PersonalRecordListResponse(BaseModel):
    items: list[PersonalRecordResponse]

    next_cursor: str | None


class WorkoutPersonalRecordsResponse(BaseModel):
    items: list[PersonalRecordResponse]


class ProgressPeriodResponse(BaseModel):
    range: ProgressRange

    start: str | None

    end: str


class ProgressOverviewResponse(BaseModel):
    period: ProgressPeriodResponse

    weight_unit: WeightUnit

    totals: ProgressTotalsResponse

    comparison: ProgressComparisonResponse

    weekly_goal: WeeklyGoalResponse

    recent_prs: list[PersonalRecordResponse]

    top_exercises: list[TopExerciseProgressItem]

    weekly_volume: list[WeeklyProgressPoint]

    muscle_groups: list[MuscleGroupProgressItem]


class ExerciseProgressExerciseResponse(BaseModel):
    id: str

    name: str

    primary_muscles: list[str]

    equipment: list[str]

    thumbnail_url: str | None


class ExerciseProgressSummaryResponse(BaseModel):
    session_count: int

    working_set_count: int

    total_volume: float

    heaviest_weight: float | None

    best_estimated_1rm: float | None

    best_set_volume: float | None

    most_reps: int | None


class ExerciseProgressPoint(BaseModel):
    workout_session_id: str

    completed_at: str

    best_weight: float | None

    best_estimated_1rm: float | None

    volume: float

    working_sets: int


class ExerciseCurrentRecordsResponse(BaseModel):
    heaviest_weight: float | None

    best_estimated_1rm: float | None

    best_set_volume: float | None

    most_reps: int | None


class ExerciseProgressResponse(BaseModel):
    range: ProgressRange

    weight_unit: WeightUnit

    exercise: ExerciseProgressExerciseResponse

    summary: ExerciseProgressSummaryResponse

    current_records: ExerciseCurrentRecordsResponse

    points: list[ExerciseProgressPoint]


class ExerciseSessionSetResponse(BaseModel):
    type: str

    weight: float | None

    weight_unit: WeightUnit

    reps: int | None

    rpe: float | None


class ExerciseSessionResponse(BaseModel):
    workout_session_id: str

    workout_name: str

    completed_at: str

    sets: list[ExerciseSessionSetResponse]


class ExerciseSessionListResponse(BaseModel):
    items: list[ExerciseSessionResponse]

    next_cursor: str | None


class ActivityCalendarDayResponse(BaseModel):
    date: str

    workout_count: int

    working_sets: int

    volume: float


class ActivityCalendarResponse(BaseModel):
    items: list[ActivityCalendarDayResponse]


class MuscleGroupProgressResponse(BaseModel):
    range: MuscleRange

    items: list[MuscleGroupProgressItem]


class ProgressRangeQuery(BaseModel):
    range: ProgressRange = "12W"


class MuscleRangeQuery(BaseModel):
    range: MuscleRange = "7D"


class PersonalRecordQuery(BaseModel):
    exercise_id: str | None = None

    record_type: PersonalRecordType | None = None

    cursor: str | None = None

    limit: int = Field(
        default=20,
        ge=1,
        le=50,
    )
