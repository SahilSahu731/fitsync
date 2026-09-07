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
from app.modules.exercises import (
    service,
)
from app.modules.exercises.models import (
    Equipment,
    ExerciseSource,
    MuscleGroup,
)
from app.modules.exercises.schemas import (
    ExerciseArchiveResponse,
    ExerciseCreateRequest,
    ExerciseListResponse,
    ExerciseResponse,
    ExerciseUpdateRequest,
)

router = APIRouter(
    prefix="/exercises",
    tags=[
        "Exercises",
    ],
)


@router.get(
    "",
    response_model=ExerciseListResponse,
)
async def list_exercises(
    database: DatabaseDep,
    user: CurrentUserDep,
    q: str | None = Query(
        default=None,
        max_length=100,
    ),
    muscle: MuscleGroup | None = None,
    equipment: Equipment | None = None,
    source: ExerciseSource | None = None,
    cursor: str | None = None,
    limit: int = Query(
        default=30,
        ge=1,
        le=100,
    ),
) -> ExerciseListResponse:
    (
        exercises,
        next_cursor,
    ) = await service.list_exercises(
        database,
        user_id=user["_id"],
        q=q,
        muscle=muscle,
        equipment=equipment,
        source=source,
        cursor=cursor,
        limit=limit,
    )

    return ExerciseListResponse(
        items=[
            ExerciseResponse.from_document(
                exercise,
                current_user_id=(user["_id"]),
            )
            for exercise in exercises
        ],
        next_cursor=next_cursor,
    )


@router.get(
    "/{exercise_id}",
    response_model=ExerciseResponse,
)
async def get_exercise(
    exercise_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> ExerciseResponse:
    exercise = await service.get_exercise(
        database,
        exercise_id=exercise_id,
        user_id=user["_id"],
    )

    return ExerciseResponse.from_document(
        exercise,
        current_user_id=user["_id"],
    )


@router.post(
    "",
    response_model=ExerciseResponse,
    status_code=201,
)
async def create_exercise(
    payload: ExerciseCreateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> ExerciseResponse:
    exercise = await service.create_custom_exercise(
        database,
        user_id=user["_id"],
        payload=payload,
    )

    return ExerciseResponse.from_document(
        exercise,
        current_user_id=user["_id"],
    )


@router.patch(
    "/{exercise_id}",
    response_model=ExerciseResponse,
)
async def update_exercise(
    exercise_id: str,
    payload: ExerciseUpdateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> ExerciseResponse:
    exercise = await service.update_custom_exercise(
        database,
        exercise_id=exercise_id,
        user_id=user["_id"],
        payload=payload,
    )

    return ExerciseResponse.from_document(
        exercise,
        current_user_id=user["_id"],
    )


@router.delete(
    "/{exercise_id}",
    response_model=ExerciseArchiveResponse,
)
async def archive_exercise(
    exercise_id: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> ExerciseArchiveResponse:
    await service.archive_custom_exercise(
        database,
        exercise_id=exercise_id,
        user_id=user["_id"],
    )

    return ExerciseArchiveResponse(message="Exercise archived.")
