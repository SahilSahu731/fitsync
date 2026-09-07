from typing import Annotated

from fastapi import (
    APIRouter,
    Query,
)

from app.db.mongo import (
    DatabaseDep,
)
from app.modules.auth.dependencies import (
    CurrentUserDep,
)
from app.modules.progress import (
    service,
)
from app.modules.progress.constants import (
    MuscleRange,
    PersonalRecordType,
    ProgressRange,
)
from app.modules.progress.schemas import (
    ActivityCalendarResponse,
    ExerciseProgressResponse,
    ExerciseSessionListResponse,
    MuscleGroupProgressResponse,
    PersonalRecordListResponse,
    ProgressOverviewResponse,
    ProgressPreferencesResponse,
    ProgressPreferencesUpdateRequest,
    WorkoutPersonalRecordsResponse,
)

router = APIRouter(
    prefix="/progress",
    tags=[
        "Progress",
    ],
)


@router.get(
    "/preferences",
    response_model=(ProgressPreferencesResponse),
)
async def get_preferences(
    database: DatabaseDep,
    user: CurrentUserDep,
) -> ProgressPreferencesResponse:
    return await service.get_preferences(
        database,
        user_id=user["_id"],
    )


@router.patch(
    "/preferences",
    response_model=(ProgressPreferencesResponse),
)
async def update_preferences(
    payload: ProgressPreferencesUpdateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> ProgressPreferencesResponse:
    return await service.update_preferences(
        database,
        user_id=user["_id"],
        payload=payload,
    )


@router.get(
    "/overview",
    response_model=(ProgressOverviewResponse),
)
async def get_overview(
    database: DatabaseDep,
    user: CurrentUserDep,
    range: Annotated[ProgressRange, Query()] = "12W",
) -> ProgressOverviewResponse:
    return await service.overview(
        database,
        user_id=user["_id"],
        progress_range=range,
    )


@router.get(
    "/personal-records",
    response_model=(PersonalRecordListResponse),
)
async def get_personal_records(
    database: DatabaseDep,
    user: CurrentUserDep,
    exercise_id: str | None = None,
    record_type: (PersonalRecordType | None) = None,
    cursor: str | None = None,
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
    ),
) -> PersonalRecordListResponse:
    return await service.list_personal_records(
        database,
        user_id=user["_id"],
        exercise_id=exercise_id,
        record_type=record_type,
        cursor=cursor,
        limit=limit,
    )


@router.get(
    "/workouts/{session_id}/records",
    response_model=(WorkoutPersonalRecordsResponse),
)
async def get_workout_records(
    session_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutPersonalRecordsResponse:
    return await service.workout_personal_records(
        database,
        user_id=user["_id"],
        session_id=session_id,
    )


@router.get(
    "/exercises/{exercise_id}",
    response_model=(ExerciseProgressResponse),
)
async def get_exercise_progress(
    exercise_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
    range: Annotated[ProgressRange, Query()] = "12W",
) -> ExerciseProgressResponse:
    return await service.exercise_progress(
        database,
        user_id=user["_id"],
        exercise_id=exercise_id,
        progress_range=range,
    )


@router.get(
    "/exercises/{exercise_id}/sessions",
    response_model=(ExerciseSessionListResponse),
)
async def get_exercise_sessions(
    exercise_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
    cursor: str | None = None,
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
    ),
) -> ExerciseSessionListResponse:
    return await service.exercise_sessions(
        database,
        user_id=user["_id"],
        exercise_id=exercise_id,
        cursor=cursor,
        limit=limit,
    )


@router.get(
    "/muscle-groups",
    response_model=(MuscleGroupProgressResponse),
)
async def get_muscle_groups(
    database: DatabaseDep,
    user: CurrentUserDep,
    range: Annotated[MuscleRange, Query()] = "7D",
) -> MuscleGroupProgressResponse:
    return await service.muscle_groups(
        database,
        user_id=user["_id"],
        progress_range=range,
    )


@router.get(
    "/activity-calendar",
    response_model=(ActivityCalendarResponse),
)
async def get_activity_calendar(
    database: DatabaseDep,
    user: CurrentUserDep,
    months: int = Query(
        default=3,
        ge=1,
        le=12,
    ),
) -> ActivityCalendarResponse:
    return await service.activity_calendar(
        database,
        user_id=user["_id"],
        months=months,
    )
