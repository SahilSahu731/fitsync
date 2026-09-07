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
from app.modules.workouts import (
    service,
)
from app.modules.workouts.schemas import (
    ActiveWorkoutResponse,
    AddWorkoutExercisesRequest,
    MessageResponse,
    StartWorkoutRequest,
    WorkoutHistoryResponse,
    WorkoutSessionResponse,
    WorkoutSessionUpdateRequest,
    WorkoutTemplateCreateRequest,
    WorkoutTemplateListResponse,
    WorkoutTemplateResponse,
    WorkoutTemplateUpdateRequest,
)

router = APIRouter(
    tags=[
        "Workouts",
    ],
)


# =========================================================
# TEMPLATES
# =========================================================


@router.get(
    "/workout-templates",
    response_model=(WorkoutTemplateListResponse),
)
async def list_templates(
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutTemplateListResponse:
    items = await service.list_templates(
        database,
        user_id=user["_id"],
    )

    return WorkoutTemplateListResponse(items=items)


@router.post(
    "/workout-templates",
    response_model=WorkoutTemplateResponse,
    status_code=201,
)
async def create_template(
    payload: WorkoutTemplateCreateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutTemplateResponse:
    return await service.create_template(
        database,
        user_id=user["_id"],
        payload=payload,
    )


@router.get(
    "/workout-templates/{template_id}",
    response_model=WorkoutTemplateResponse,
)
async def get_template(
    template_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutTemplateResponse:
    return await service.get_template(
        database,
        user_id=user["_id"],
        template_id=template_id,
    )


@router.patch(
    "/workout-templates/{template_id}",
    response_model=WorkoutTemplateResponse,
)
async def update_template(
    template_id: str,
    payload: WorkoutTemplateUpdateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutTemplateResponse:
    return await service.update_template(
        database,
        user_id=user["_id"],
        template_id=template_id,
        payload=payload,
    )


@router.post(
    "/workout-templates/{template_id}/duplicate",
    response_model=WorkoutTemplateResponse,
)
async def duplicate_template(
    template_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutTemplateResponse:
    return await service.duplicate_template(
        database,
        user_id=user["_id"],
        template_id=template_id,
    )


@router.delete(
    "/workout-templates/{template_id}",
    response_model=MessageResponse,
)
async def archive_template(
    template_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> MessageResponse:
    await service.archive_template(
        database,
        user_id=user["_id"],
        template_id=template_id,
    )

    return MessageResponse(message=("Workout template archived."))


# =========================================================
# SESSIONS
# =========================================================


@router.post(
    "/workout-sessions",
    response_model=WorkoutSessionResponse,
    status_code=201,
)
async def start_workout(
    payload: StartWorkoutRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutSessionResponse:
    return await service.start_workout(
        database,
        user=user,
        payload=payload,
    )


@router.get(
    "/workout-sessions/active",
    response_model=ActiveWorkoutResponse,
)
async def active_workout(
    database: DatabaseDep,
    user: CurrentUserDep,
) -> ActiveWorkoutResponse:
    workout = await service.get_active_workout(
        database,
        user_id=user["_id"],
    )

    return ActiveWorkoutResponse(workout=workout)


@router.get(
    "/workout-sessions/history",
    response_model=WorkoutHistoryResponse,
)
async def history(
    database: DatabaseDep,
    user: CurrentUserDep,
    cursor: str | None = None,
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
    ),
) -> WorkoutHistoryResponse:
    (
        items,
        next_cursor,
    ) = await service.workout_history(
        database,
        user_id=user["_id"],
        cursor=cursor,
        limit=limit,
    )

    return WorkoutHistoryResponse(
        items=items,
        next_cursor=next_cursor,
    )


@router.get(
    "/workout-sessions/{session_id}",
    response_model=WorkoutSessionResponse,
)
async def get_workout(
    session_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutSessionResponse:
    return await service.get_workout(
        database,
        user_id=user["_id"],
        session_id=session_id,
    )


@router.post(
    "/workout-sessions/{session_id}/exercises",
    response_model=WorkoutSessionResponse,
)
async def add_exercises(
    session_id: str,
    payload: AddWorkoutExercisesRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutSessionResponse:
    return await service.add_exercises_to_workout(
        database,
        user=user,
        session_id=session_id,
        payload=payload,
    )


@router.patch(
    "/workout-sessions/{session_id}",
    response_model=WorkoutSessionResponse,
)
async def update_workout(
    session_id: str,
    payload: WorkoutSessionUpdateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutSessionResponse:
    return await service.update_workout(
        database,
        user=user,
        session_id=session_id,
        payload=payload,
    )


@router.post(
    "/workout-sessions/{session_id}/complete",
    response_model=WorkoutSessionResponse,
)
async def complete_workout(
    session_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> WorkoutSessionResponse:
    return await service.finish_workout(
        database,
        user_id=user["_id"],
        session_id=session_id,
    )


@router.post(
    "/workout-sessions/{session_id}/cancel",
    response_model=MessageResponse,
)
async def cancel_workout(
    session_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> MessageResponse:
    await service.cancel_workout(
        database,
        user_id=user["_id"],
        session_id=session_id,
    )

    return MessageResponse(message="Workout cancelled.")
