import base64
from datetime import (
    datetime,
    timedelta,
)
from uuid import uuid4

from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.db.mongo import Database
from app.modules.auth.security import (
    utc_now,
)
from app.modules.exercises import (
    repository as exercise_repository,
)
from app.modules.exercises.models import (
    ExerciseDocument,
)
from app.modules.exercises.tracking import (
    exercise_default_rest_seconds,
    exercise_laterality,
    exercise_load_mode,
    exercise_tracking_type,
    validate_template_set,
    validate_workout_set,
)
from app.modules.users.models import (
    UserDocument,
)
from app.modules.workouts import (
    repository,
)
from app.modules.workouts.models import (
    TemplateExerciseDocument,
    TemplateFolderDocument,
    TemplateSetDocument,
    WeightUnit,
    WorkoutExerciseDocument,
    WorkoutSessionDocument,
    WorkoutSetDocument,
    WorkoutSetType,
    WorkoutTemplateDocument,
)
from app.modules.workouts.schemas import (
    AddWorkoutExercisesRequest,
    PreviousExercisePerformance,
    PreviousSetResponse,
    StartWorkoutRequest,
    TemplateExerciseResponse,
    TemplateFolderCreateRequest,
    TemplateFolderResponse,
    TemplateFolderUpdateRequest,
    TemplateSetResponse,
    WorkoutExerciseResponse,
    WorkoutHistoryItem,
    WorkoutSessionResponse,
    WorkoutSessionUpdateRequest,
    WorkoutSetResponse,
    WorkoutTemplateCreateRequest,
    WorkoutTemplateResponse,
    WorkoutTemplateUpdateRequest,
)

# =========================================================
# ERRORS
# =========================================================


def template_not_found():
    return HTTPException(
        status_code=404,
        detail={
            "code": "TEMPLATE_NOT_FOUND",
            "message": "Workout template not found.",
        },
    )


def template_revision_conflict(current_revision: int):
    return HTTPException(
        status_code=409,
        detail={
            "code": "TEMPLATE_REVISION_CONFLICT",
            "message": "This routine changed on another device.",
            "current_revision": current_revision,
        },
    )


def template_folder_not_found():
    return HTTPException(
        status_code=404,
        detail={
            "code": "TEMPLATE_FOLDER_NOT_FOUND",
            "message": "Routine folder not found.",
        },
    )


def template_folder_revision_conflict(current_revision: int):
    return HTTPException(
        status_code=409,
        detail={
            "code": "TEMPLATE_FOLDER_REVISION_CONFLICT",
            "message": "This routine folder changed on another device.",
            "current_revision": current_revision,
        },
    )


def workout_not_found():
    return HTTPException(
        status_code=404,
        detail={
            "code": "WORKOUT_NOT_FOUND",
            "message": "Workout not found.",
        },
    )


def active_workout_exists(
    workout_id: str,
):
    return HTTPException(
        status_code=409,
        detail={
            "code": "ACTIVE_WORKOUT_EXISTS",
            "message": "You already have a workout in progress.",
            "workout_id": workout_id,
        },
    )


def workout_not_in_progress():
    return HTTPException(
        status_code=409,
        detail={
            "code": "WORKOUT_NOT_IN_PROGRESS",
            "message": "This workout is no longer in progress.",
        },
    )


def workout_revision_conflict(
    current_revision: int,
):
    return HTTPException(
        status_code=409,
        detail={
            "code": "WORKOUT_REVISION_CONFLICT",
            "message": ("This workout changed on the server. Refresh it before saving again."),
            "current_revision": current_revision,
        },
    )


async def raise_workout_write_error(
    database: Database,
    *,
    session_id: ObjectId,
    user_id: ObjectId,
):
    current = await repository.get_session(
        database,
        session_id=session_id,
        user_id=user_id,
    )

    if current is None:
        raise workout_not_found()

    if current["status"] != "IN_PROGRESS":
        raise workout_not_in_progress()

    raise workout_revision_conflict(current["revision"])


def invalid_exercise():
    return HTTPException(
        status_code=400,
        detail={
            "code": "INVALID_EXERCISE",
            "message": "One or more exercises are invalid or unavailable.",
        },
    )


# =========================================================
# SHARED EXERCISE RESOLUTION
# =========================================================


async def resolve_exercises(
    database: Database,
    *,
    user_id: ObjectId,
    raw_ids: list[str],
) -> dict[str, ExerciseDocument]:
    if not raw_ids:
        return {}

    if not all(ObjectId.is_valid(value) for value in raw_ids):
        raise invalid_exercise()

    object_ids = [ObjectId(value) for value in raw_ids]

    documents = await exercise_repository.get_many_visible_exercises(
        database,
        exercise_ids=object_ids,
        user_id=user_id,
    )

    mapping = {str(exercise["_id"]): exercise for exercise in documents}

    if len(mapping) != len(set(raw_ids)):
        raise invalid_exercise()

    return mapping


# =========================================================
# TEMPLATE HELPERS
# =========================================================


def build_template_exercises(
    payload_exercises,
    exercise_map: dict[
        str,
        ExerciseDocument,
    ],
) -> list[TemplateExerciseDocument]:
    result = []

    for (
        exercise_position,
        input_exercise,
    ) in enumerate(payload_exercises):
        exercise = exercise_map[input_exercise.exercise_id]

        tracking_type = exercise_tracking_type(exercise)

        sets: list[TemplateSetDocument] = []

        for (
            set_position,
            planned_set,
        ) in enumerate(input_exercise.planned_sets):
            validate_template_set(
                tracking_type,
                planned_set,
            )

            sets.append(
                {
                    "id": str(uuid4()),
                    "position": set_position,
                    "type": planned_set.type,
                    "target_reps_min": planned_set.target_reps_min,
                    "target_reps_max": planned_set.target_reps_max,
                    "target_weight": planned_set.target_weight,
                    "target_duration_seconds": planned_set.target_duration_seconds,
                    "target_distance_meters": planned_set.target_distance_meters,
                    "target_rpe": planned_set.target_rpe,
                    "target_rir": planned_set.target_rir,
                }
            )

        result.append(
            {
                "id": str(uuid4()),
                "exercise_id": exercise["_id"],
                "exercise_name_snapshot": exercise["name"],
                "thumbnail_url_snapshot": thumbnail_for_exercise(exercise),
                "tracking_type_snapshot": tracking_type,
                "laterality_snapshot": exercise_laterality(exercise),
                "load_mode_snapshot": exercise_load_mode(exercise),
                "primary_muscles_snapshot": exercise.get("primary_muscles", []),
                "position": exercise_position,
                "rest_seconds": input_exercise.rest_seconds,
                "notes": input_exercise.notes,
                "superset_group_id": input_exercise.superset_group_id,
                "planned_sets": sets,
            }
        )

    return result


def clean_template_supersets(
    exercises: list[TemplateExerciseDocument],
) -> list[TemplateExerciseDocument]:
    counts: dict[str, int] = {}
    for exercise in exercises:
        group = exercise.get("superset_group_id")
        if group:
            counts[group] = counts.get(group, 0) + 1

    for exercise in exercises:
        group = exercise.get("superset_group_id")
        if group and counts.get(group, 0) < 2:
            exercise["superset_group_id"] = None

    return exercises


async def resolve_template_folder(
    database: Database,
    *,
    user_id: ObjectId,
    client_folder_id: str | None,
) -> ObjectId | None:
    if client_folder_id is None:
        return None

    folder = await repository.get_template_folder_by_client_id(
        database,
        user_id=user_id,
        client_folder_id=client_folder_id,
    )
    if folder is None or folder.get("archived_at") is not None:
        raise template_folder_not_found()
    return folder["_id"]


def template_response(
    template: WorkoutTemplateDocument,
    *,
    folder_client_id: str | None,
    usage: dict | None = None,
) -> WorkoutTemplateResponse:
    response_exercises = []
    muscle_groups = []

    for item in sorted(
        template["exercises"],
        key=lambda exercise: exercise["position"],
    ):
        muscles = item.get("primary_muscles_snapshot", [])
        for muscle in muscles:
            if muscle not in muscle_groups:
                muscle_groups.append(muscle)

        response_exercises.append(
            TemplateExerciseResponse(
                id=item["id"],
                exercise_id=str(item["exercise_id"]),
                exercise_name=item.get("exercise_name_snapshot", "Exercise"),
                thumbnail_url=item.get("thumbnail_url_snapshot"),
                tracking_type=item.get("tracking_type_snapshot", "WEIGHT_REPS"),
                laterality=item.get("laterality_snapshot", "BILATERAL"),
                load_mode=item.get("load_mode_snapshot", "TOTAL"),
                primary_muscles=muscles,
                position=item["position"],
                rest_seconds=item["rest_seconds"],
                notes=item["notes"],
                superset_group_id=item["superset_group_id"],
                planned_sets=[
                    TemplateSetResponse(
                        id=planned_set["id"],
                        position=planned_set["position"],
                        type=planned_set["type"],
                        target_reps_min=planned_set.get("target_reps_min"),
                        target_reps_max=planned_set.get("target_reps_max"),
                        target_weight=planned_set.get("target_weight"),
                        target_duration_seconds=planned_set.get("target_duration_seconds"),
                        target_distance_meters=planned_set.get("target_distance_meters"),
                        target_rpe=planned_set.get("target_rpe"),
                        target_rir=planned_set.get("target_rir"),
                    )
                    for planned_set in sorted(
                        item["planned_sets"],
                        key=lambda value: value["position"],
                    )
                ],
            )
        )

    usage = usage or {}

    return WorkoutTemplateResponse(
        id=str(template["_id"]),
        client_template_id=template.get("client_template_id") or str(template["_id"]),
        name=template["name"],
        description=template.get("description"),
        folder_client_id=folder_client_id,
        is_favorite=template.get("is_favorite", False),
        position=template.get("position", 0),
        archived=template.get("archived_at") is not None,
        exercise_count=len(response_exercises),
        set_count=sum(len(exercise.planned_sets) for exercise in response_exercises),
        muscle_groups=muscle_groups[:4],
        exercises=response_exercises,
        revision=template.get("revision", 1),
        times_performed=usage.get("count", 0),
        last_performed_at=(
            usage["last_performed_at"].isoformat() if usage.get("last_performed_at") else None
        ),
        created_at=template["created_at"].isoformat(),
        updated_at=template["updated_at"].isoformat(),
    )


# =========================================================
# TEMPLATE SERVICES
# =========================================================


async def create_template(
    database: Database,
    *,
    user_id: ObjectId,
    payload: WorkoutTemplateCreateRequest,
):
    client_template_id = payload.client_template_id or str(uuid4())

    existing = await repository.get_template_by_client_id(
        database,
        user_id=user_id,
        client_template_id=client_template_id,
    )
    if existing:
        folder_client_id = None
        if existing.get("folder_id"):
            folder = await repository.get_template_folder(
                database,
                folder_id=existing["folder_id"],
                user_id=user_id,
            )
            if folder:
                folder_client_id = folder.get("client_folder_id")
        usage_map = await repository.template_usage(
            database, user_id=user_id, template_ids=[existing["_id"]]
        )
        return template_response(
            existing,
            folder_client_id=folder_client_id,
            usage=usage_map.get(str(existing["_id"])),
        )

    raw_ids = [item.exercise_id for item in payload.exercises]

    exercise_map = await resolve_exercises(
        database,
        user_id=user_id,
        raw_ids=raw_ids,
    )

    now = utc_now()

    folder_id = await resolve_template_folder(
        database,
        user_id=user_id,
        client_folder_id=payload.folder_client_id,
    )

    exercises = clean_template_supersets(build_template_exercises(payload.exercises, exercise_map))

    template: WorkoutTemplateDocument = {
        "_id": ObjectId(),
        "user_id": user_id,
        "client_template_id": client_template_id,
        "name": payload.name.strip(),
        "description": (payload.description.strip() if payload.description else None),
        "folder_id": folder_id,
        "is_favorite": payload.is_favorite,
        "position": payload.position,
        "exercises": exercises,
        "revision": 1,
        "created_at": now,
        "updated_at": now,
        "archived_at": now if payload.archived else None,
    }

    try:
        await repository.insert_template(database, template)
    except DuplicateKeyError:
        retry = await repository.get_template_by_client_id(
            database,
            user_id=user_id,
            client_template_id=client_template_id,
        )
        if retry:
            return template_response(retry, folder_client_id=payload.folder_client_id)
        raise

    return template_response(
        template,
        folder_client_id=payload.folder_client_id,
    )


async def list_templates(
    database: Database,
    *,
    user_id: ObjectId,
):
    templates = await repository.list_templates(
        database,
        user_id=user_id,
    )
    folders = await repository.list_template_folders(database, user_id=user_id)
    folder_clients = {folder["_id"]: folder.get("client_folder_id") for folder in folders}
    usage = await repository.template_usage(
        database,
        user_id=user_id,
        template_ids=[template["_id"] for template in templates],
    )
    return [
        template_response(
            template,
            folder_client_id=folder_clients.get(template.get("folder_id")),
            usage=usage.get(str(template["_id"])),
        )
        for template in templates
    ]


async def get_template(
    database: Database,
    *,
    user_id: ObjectId,
    template_id: str,
):
    if not ObjectId.is_valid(template_id):
        raise template_not_found()

    template = await repository.get_template(
        database,
        template_id=ObjectId(template_id),
        user_id=user_id,
    )

    if template is None:
        raise template_not_found()

    folder_client_id = None
    if template.get("folder_id"):
        folder = await repository.get_template_folder(
            database, folder_id=template["folder_id"], user_id=user_id
        )
        if folder:
            folder_client_id = folder.get("client_folder_id")

    usage = await repository.template_usage(
        database, user_id=user_id, template_ids=[ObjectId(template_id)]
    )

    return template_response(
        template,
        folder_client_id=folder_client_id,
        usage=usage.get(template_id),
    )


async def update_template(
    database: Database,
    *,
    user_id: ObjectId,
    template_id: str,
    payload: WorkoutTemplateUpdateRequest,
):
    if not ObjectId.is_valid(template_id):
        raise template_not_found()

    object_id = ObjectId(template_id)

    current = await repository.get_template(database, template_id=object_id, user_id=user_id)
    if current is None:
        raise template_not_found()

    raw_ids = [item.exercise_id for item in payload.exercises]

    exercise_map = await resolve_exercises(
        database,
        user_id=user_id,
        raw_ids=raw_ids,
    )

    now = utc_now()

    folder_id = await resolve_template_folder(
        database,
        user_id=user_id,
        client_folder_id=payload.folder_client_id,
    )

    updated = await repository.update_template_with_revision(
        database,
        template_id=object_id,
        user_id=user_id,
        expected_revision=payload.revision,
        fields={
            "name": payload.name.strip(),
            "description": (payload.description.strip() if payload.description else None),
            "folder_id": folder_id,
            "is_favorite": payload.is_favorite,
            "position": payload.position,
            "exercises": clean_template_supersets(
                build_template_exercises(payload.exercises, exercise_map)
            ),
            "archived_at": now if payload.archived else None,
            "updated_at": now,
        },
    )

    if updated is None:
        latest = await repository.get_template(database, template_id=object_id, user_id=user_id)
        if latest is None:
            raise template_not_found()
        raise template_revision_conflict(latest.get("revision", 1))

    usage = await repository.template_usage(database, user_id=user_id, template_ids=[object_id])

    return template_response(
        updated,
        folder_client_id=payload.folder_client_id,
        usage=usage.get(template_id),
    )


def folder_response(folder: TemplateFolderDocument) -> TemplateFolderResponse:
    return TemplateFolderResponse(
        id=str(folder["_id"]),
        client_folder_id=folder.get("client_folder_id") or str(folder["_id"]),
        name=folder["name"],
        position=folder.get("position", 0),
        revision=folder.get("revision", 1),
        archived=folder.get("archived_at") is not None,
        created_at=folder["created_at"].isoformat(),
        updated_at=folder["updated_at"].isoformat(),
    )


async def create_template_folder(
    database: Database,
    *,
    user_id: ObjectId,
    payload: TemplateFolderCreateRequest,
):
    client_id = payload.client_folder_id or str(uuid4())
    existing = await repository.get_template_folder_by_client_id(
        database, user_id=user_id, client_folder_id=client_id
    )
    if existing:
        return folder_response(existing)

    now = utc_now()
    folder: TemplateFolderDocument = {
        "_id": ObjectId(),
        "user_id": user_id,
        "client_folder_id": client_id,
        "name": payload.name.strip(),
        "position": payload.position,
        "revision": 1,
        "created_at": now,
        "updated_at": now,
        "archived_at": None,
    }
    try:
        await repository.insert_template_folder(database, folder)
    except DuplicateKeyError:
        existing = await repository.get_template_folder_by_client_id(
            database, user_id=user_id, client_folder_id=client_id
        )
        if existing:
            return folder_response(existing)
        raise
    return folder_response(folder)


async def list_template_folders(database: Database, *, user_id: ObjectId):
    folders = await repository.list_template_folders(database, user_id=user_id)
    return [folder_response(folder) for folder in folders]


async def update_template_folder(
    database: Database,
    *,
    user_id: ObjectId,
    folder_id: str,
    payload: TemplateFolderUpdateRequest,
):
    if not ObjectId.is_valid(folder_id):
        raise template_folder_not_found()
    object_id = ObjectId(folder_id)
    now = utc_now()
    updated = await repository.update_template_folder_with_revision(
        database,
        folder_id=object_id,
        user_id=user_id,
        expected_revision=payload.revision,
        fields={
            "name": payload.name.strip(),
            "position": payload.position,
            "archived_at": now if payload.archived else None,
            "updated_at": now,
        },
    )
    if updated is None:
        latest = await repository.get_template_folder(
            database, folder_id=object_id, user_id=user_id
        )
        if latest is None:
            raise template_folder_not_found()
        raise template_folder_revision_conflict(latest.get("revision", 1))

    if payload.archived:
        await repository.unset_folder_from_templates(
            database, user_id=user_id, folder_id=object_id, timestamp=now
        )
    return folder_response(updated)


# =========================================================
# SESSION SERIALIZATION
# =========================================================


def session_response(
    session: WorkoutSessionDocument,
) -> WorkoutSessionResponse:
    exercises = []

    completed_set_count = 0
    total_set_count = 0

    for exercise in sorted(
        session["exercises"],
        key=lambda item: item["position"],
    ):
        sets = []

        for workout_set in sorted(
            exercise["sets"],
            key=lambda item: item["position"],
        ):
            total_set_count += 1

            if workout_set.get("completed", False):
                completed_set_count += 1

            sets.append(
                WorkoutSetResponse(
                    id=workout_set["id"],
                    position=workout_set["position"],
                    type=workout_set["type"],
                    target_reps_min=workout_set.get("target_reps_min"),
                    target_reps_max=workout_set.get("target_reps_max"),
                    target_weight=workout_set.get("target_weight"),
                    target_duration_seconds=workout_set.get("target_duration_seconds"),
                    target_distance_meters=workout_set.get("target_distance_meters"),
                    target_rpe=workout_set.get("target_rpe"),
                    target_rir=workout_set.get("target_rir"),
                    reps=workout_set.get("reps"),
                    weight=workout_set.get("weight"),
                    weight_unit=workout_set.get("weight_unit", "KG"),
                    duration_seconds=workout_set.get("duration_seconds"),
                    distance_meters=workout_set.get("distance_meters"),
                    rpe=workout_set.get("rpe"),
                    rir=workout_set.get("rir"),
                    completed=workout_set.get("completed", False),
                    completed_at=(
                        workout_set["completed_at"].isoformat()
                        if workout_set.get("completed_at")
                        else None
                    ),
                )
            )

        exercises.append(
            WorkoutExerciseResponse(
                id=exercise["id"],
                exercise_id=str(exercise["exercise_id"]),
                exercise_name=(exercise["exercise_name_snapshot"]),
                thumbnail_url=exercise.get("thumbnail_url_snapshot"),
                tracking_type=exercise.get(
                    "tracking_type_snapshot",
                    "WEIGHT_REPS",
                ),
                laterality=exercise.get("laterality_snapshot", "BILATERAL"),
                load_mode=exercise.get("load_mode_snapshot", "TOTAL"),
                position=(exercise["position"]),
                rest_seconds=(exercise["rest_seconds"]),
                notes=exercise.get("notes"),
                superset_group_id=exercise.get("superset_group_id"),
                sets=sets,
            )
        )

    return WorkoutSessionResponse(
        id=str(session["_id"]),
        client_workout_id=(session.get("client_workout_id") or str(session["_id"])),
        template_id=(str(session["template_id"]) if session.get("template_id") else None),
        template_client_id=session.get("template_client_id_snapshot"),
        template_name_snapshot=session.get("template_name_snapshot"),
        name=session["name"],
        status=session["status"],
        started_at=(session["started_at"].isoformat()),
        completed_at=(session["completed_at"].isoformat() if session.get("completed_at") else None),
        cancelled_at=(session["cancelled_at"].isoformat() if session.get("cancelled_at") else None),
        duration_seconds=session.get("duration_seconds"),
        notes=session.get("notes"),
        exercises=exercises,
        completed_set_count=(completed_set_count),
        total_set_count=(total_set_count),
        revision=(session["revision"]),
    )


# =========================================================
# SESSION BUILDERS
# =========================================================


def default_weight_unit(
    user: UserDocument,
):
    return user.get(
        "weight_unit",
        "KG",
    )


def build_session_set(
    *,
    weight_unit: WeightUnit,
    position: int,
    set_type: WorkoutSetType = "NORMAL",
    target_reps_min: int | None = None,
    target_reps_max: int | None = None,
    target_weight: float | None = None,
    target_duration_seconds: int | None = None,
    target_distance_meters: float | None = None,
    target_rpe: float | None = None,
    target_rir: int | None = None,
) -> WorkoutSetDocument:
    return {
        "id": str(uuid4()),
        "position": position,
        "type": set_type,
        "target_reps_min": target_reps_min,
        "target_reps_max": target_reps_max,
        "target_weight": target_weight,
        "target_duration_seconds": target_duration_seconds,
        "target_distance_meters": target_distance_meters,
        "target_rpe": target_rpe,
        "target_rir": target_rir,
        "reps": None,
        "weight": None,
        "weight_unit": weight_unit,
        "duration_seconds": None,
        "distance_meters": None,
        "rpe": None,
        "rir": None,
        "completed": False,
        "completed_at": None,
    }


def thumbnail_for_exercise(
    exercise: ExerciseDocument,
) -> str | None:
    media = exercise.get(
        "media",
        [],
    )

    if not media:
        return None

    return media[0]["thumbnail_url"]


def validated_started_at(
    value: datetime | None,
    *,
    now: datetime,
) -> datetime:
    if value is None:
        return now

    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_WORKOUT_TIMESTAMP",
                "message": "started_at must include a timezone.",
            },
        )

    if value > now + timedelta(minutes=5):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_WORKOUT_TIMESTAMP",
                "message": "Workout start time is too far in the future.",
            },
        )

    return value


# =========================================================
# START WORKOUT
# =========================================================


async def start_workout(
    database: Database,
    *,
    user: UserDocument,
    payload: StartWorkoutRequest,
):
    if payload.client_workout_id is not None:
        existing_by_client_id = await repository.get_session_by_client_workout_id(
            database,
            user_id=user["_id"],
            client_workout_id=(payload.client_workout_id),
        )

        if existing_by_client_id is not None:
            return session_response(existing_by_client_id)

    existing = await repository.get_active_session(
        database,
        user_id=user["_id"],
    )

    if existing is not None:
        raise active_workout_exists(str(existing["_id"]))

    now = utc_now()

    started_at = validated_started_at(
        payload.started_at,
        now=now,
    )

    client_workout_id = payload.client_workout_id or str(uuid4())

    exercises: list[WorkoutExerciseDocument] = []

    template_id = None
    template_client_id = None
    template_name_snapshot = None

    name = payload.name.strip() if payload.name else "Workout"

    template = None

    if payload.template_id:
        if not ObjectId.is_valid(payload.template_id):
            raise template_not_found()

        template = await repository.get_template(
            database,
            template_id=ObjectId(payload.template_id),
            user_id=user["_id"],
        )

    elif payload.template_client_id:
        template = await repository.get_template_by_client_id(
            database,
            user_id=user["_id"],
            client_template_id=payload.template_client_id,
        )

    if (payload.template_id or payload.template_client_id) and template is None:
        raise template_not_found()

    if template is not None:
        if template.get("archived_at") is not None:
            raise template_not_found()
        template_id = template["_id"]
        template_client_id = template.get("client_template_id") or str(template["_id"])
        template_name_snapshot = template["name"]

        name = template["name"]

        raw_ids = [str(exercise["exercise_id"]) for exercise in template["exercises"]]

        exercise_map = await resolve_exercises(
            database,
            user_id=user["_id"],
            raw_ids=raw_ids,
        )

        for template_exercise in sorted(
            template["exercises"],
            key=lambda item: item["position"],
        ):
            exercise_id = str(template_exercise["exercise_id"])

            exercise = exercise_map[exercise_id]

            sets = []

            for planned_set in sorted(
                template_exercise["planned_sets"],
                key=lambda item: item["position"],
            ):
                sets.append(
                    build_session_set(
                        weight_unit=(default_weight_unit(user)),
                        position=len(sets),
                        set_type=(planned_set["type"]),
                        target_reps_min=(planned_set["target_reps_min"]),
                        target_reps_max=(planned_set["target_reps_max"]),
                        target_weight=(planned_set["target_weight"]),
                        target_duration_seconds=planned_set.get("target_duration_seconds"),
                        target_distance_meters=planned_set.get("target_distance_meters"),
                        target_rpe=(planned_set["target_rpe"]),
                        target_rir=(planned_set["target_rir"]),
                    )
                )

            exercises.append(
                {
                    "id": str(uuid4()),
                    "exercise_id": exercise["_id"],
                    "exercise_name_snapshot": exercise["name"],
                    "thumbnail_url_snapshot": thumbnail_for_exercise(exercise),
                    "tracking_type_snapshot": exercise_tracking_type(exercise),
                    "laterality_snapshot": exercise_laterality(exercise),
                    "load_mode_snapshot": exercise_load_mode(exercise),
                    "position": len(exercises),
                    "rest_seconds": template_exercise["rest_seconds"],
                    "notes": template_exercise["notes"],
                    "superset_group_id": template_exercise["superset_group_id"],
                    "sets": sets,
                }
            )

    session: WorkoutSessionDocument = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "client_workout_id": client_workout_id,
        "template_id": template_id,
        "template_client_id_snapshot": template_client_id,
        "template_name_snapshot": template_name_snapshot,
        "name": name,
        "status": "IN_PROGRESS",
        "started_at": started_at,
        "completed_at": None,
        "cancelled_at": None,
        "duration_seconds": None,
        "notes": None,
        "exercises": exercises,
        "created_at": now,
        "updated_at": now,
        "revision": 1,
    }

    try:
        await repository.insert_session(
            database,
            session,
        )

    except DuplicateKeyError as error:
        retry_session = await repository.get_session_by_client_workout_id(
            database,
            user_id=user["_id"],
            client_workout_id=client_workout_id,
        )

        if retry_session is not None:
            return session_response(retry_session)

        active = await repository.get_active_session(
            database,
            user_id=user["_id"],
        )

        if active is not None:
            raise active_workout_exists(str(active["_id"])) from error

        raise

    return session_response(session)


# =========================================================
# GET ACTIVE / GET SESSION
# =========================================================


async def get_active_workout(
    database: Database,
    *,
    user_id: ObjectId,
):
    session = await repository.get_active_session(
        database,
        user_id=user_id,
    )

    if session is None:
        return None

    return session_response(session)


async def get_workout(
    database: Database,
    *,
    user_id: ObjectId,
    session_id: str,
):
    if not ObjectId.is_valid(session_id):
        raise workout_not_found()

    session = await repository.get_session(
        database,
        session_id=ObjectId(session_id),
        user_id=user_id,
    )

    if session is None:
        raise workout_not_found()

    return session_response(session)


# =========================================================
# ADD EXERCISES
# =========================================================


async def add_exercises_to_workout(
    database: Database,
    *,
    user: UserDocument,
    session_id: str,
    payload: AddWorkoutExercisesRequest,
):
    if not ObjectId.is_valid(session_id):
        raise workout_not_found()

    session = await repository.get_session(
        database,
        session_id=ObjectId(session_id),
        user_id=user["_id"],
    )

    if session is None:
        raise workout_not_found()

    if session["status"] != "IN_PROGRESS":
        raise workout_not_in_progress()

    exercise_map = await resolve_exercises(
        database,
        user_id=user["_id"],
        raw_ids=payload.exercise_ids,
    )

    existing_ids = {str(item["exercise_id"]) for item in session["exercises"]}

    exercises = list(session["exercises"])

    for exercise_id in payload.exercise_ids:
        if exercise_id in existing_ids:
            continue

        exercise = exercise_map[exercise_id]

        sets = [
            build_session_set(
                weight_unit=default_weight_unit(user),
                position=0,
            ),
            build_session_set(
                weight_unit=default_weight_unit(user),
                position=1,
            ),
            build_session_set(
                weight_unit=default_weight_unit(user),
                position=2,
            ),
        ]

        exercises.append(
            {
                "id": str(uuid4()),
                "exercise_id": exercise["_id"],
                "exercise_name_snapshot": exercise["name"],
                "thumbnail_url_snapshot": thumbnail_for_exercise(exercise),
                "tracking_type_snapshot": exercise_tracking_type(exercise),
                "laterality_snapshot": exercise_laterality(exercise),
                "load_mode_snapshot": exercise_load_mode(exercise),
                "position": len(exercises),
                "rest_seconds": exercise_default_rest_seconds(exercise),
                "notes": None,
                "superset_group_id": None,
                "sets": sets,
            }
        )

    updated_ok = await repository.replace_active_session_fields(
        database,
        session_id=session["_id"],
        user_id=user["_id"],
        expected_revision=payload.revision,
        fields={
            "exercises": exercises,
            "updated_at": utc_now(),
        },
    )

    if not updated_ok:
        await raise_workout_write_error(
            database,
            session_id=session["_id"],
            user_id=user["_id"],
        )

    updated = await repository.get_session(
        database,
        session_id=session["_id"],
        user_id=user["_id"],
    )

    if updated is None:
        raise workout_not_found()

    return session_response(updated)


# =========================================================
# UPDATE ACTIVE WORKOUT
# =========================================================


async def update_workout(
    database: Database,
    *,
    user: UserDocument,
    session_id: str,
    payload: WorkoutSessionUpdateRequest,
):
    if not ObjectId.is_valid(session_id):
        raise workout_not_found()

    session = await repository.get_session(
        database,
        session_id=ObjectId(session_id),
        user_id=user["_id"],
    )

    if session is None:
        raise workout_not_found()

    if session["status"] != "IN_PROGRESS":
        raise workout_not_in_progress()

    raw_exercise_ids = [exercise.exercise_id for exercise in payload.exercises]

    exercise_map = (
        await resolve_exercises(
            database,
            user_id=user["_id"],
            raw_ids=list(dict.fromkeys(raw_exercise_ids)),
        )
        if raw_exercise_ids
        else {}
    )

    previous_completed_at = {}

    for exercise in session["exercises"]:
        for workout_set in exercise["sets"]:
            previous_completed_at[workout_set["id"]] = workout_set["completed_at"]

    now = utc_now()

    exercises = []

    for (
        exercise_position,
        input_exercise,
    ) in enumerate(payload.exercises):
        exercise = exercise_map[input_exercise.exercise_id]

        sets = []

        for (
            set_position,
            input_set,
        ) in enumerate(input_exercise.sets):
            validate_workout_set(
                input_exercise.tracking_type,
                input_set,
            )

            old_completed_at = previous_completed_at.get(input_set.id)

            completed_at = (
                old_completed_at
                if (input_set.completed and old_completed_at)
                else (now if input_set.completed else None)
            )

            sets.append(
                {
                    "id": input_set.id,
                    "position": set_position,
                    "type": input_set.type,
                    "target_reps_min": input_set.target_reps_min,
                    "target_reps_max": input_set.target_reps_max,
                    "target_weight": input_set.target_weight,
                    "target_duration_seconds": input_set.target_duration_seconds,
                    "target_distance_meters": input_set.target_distance_meters,
                    "target_rpe": input_set.target_rpe,
                    "target_rir": input_set.target_rir,
                    "reps": input_set.reps,
                    "weight": input_set.weight,
                    "weight_unit": input_set.weight_unit,
                    "duration_seconds": input_set.duration_seconds,
                    "distance_meters": input_set.distance_meters,
                    "rpe": input_set.rpe,
                    "rir": input_set.rir,
                    "completed": input_set.completed,
                    "completed_at": completed_at,
                }
            )

        exercises.append(
            {
                "id": input_exercise.id,
                "exercise_id": exercise["_id"],
                "exercise_name_snapshot": exercise["name"],
                "thumbnail_url_snapshot": thumbnail_for_exercise(exercise),
                "tracking_type_snapshot": input_exercise.tracking_type,
                "laterality_snapshot": input_exercise.laterality,
                "load_mode_snapshot": input_exercise.load_mode,
                "position": exercise_position,
                "rest_seconds": input_exercise.rest_seconds,
                "notes": input_exercise.notes,
                "superset_group_id": input_exercise.superset_group_id,
                "sets": sets,
            }
        )

    updated = await repository.replace_active_session_fields(
        database,
        session_id=session["_id"],
        user_id=user["_id"],
        expected_revision=payload.revision,
        fields={
            "name": payload.name.strip(),
            "notes": (payload.notes.strip() if payload.notes else None),
            "exercises": exercises,
            "updated_at": now,
        },
    )

    if not updated:
        await raise_workout_write_error(
            database,
            session_id=session["_id"],
            user_id=user["_id"],
        )

    result = await repository.get_session(
        database,
        session_id=session["_id"],
        user_id=user["_id"],
    )

    if result is None:
        raise workout_not_found()

    return session_response(result)


# =========================================================
# COMPLETE / CANCEL
# =========================================================


async def finish_workout(
    database: Database,
    *,
    user_id: ObjectId,
    session_id: str,
    expected_revision: int,
    completed_at: datetime | None = None,
):
    if not ObjectId.is_valid(session_id):
        raise workout_not_found()

    object_id = ObjectId(session_id)

    session = await repository.get_session(
        database,
        session_id=object_id,
        user_id=user_id,
    )

    if session is None:
        raise workout_not_found()

    if session["status"] != "IN_PROGRESS":
        raise workout_not_in_progress()

    now = utc_now()

    actual_completed_at = validated_completed_at(
        completed_at,
        started_at=(session["started_at"]),
        now=now,
    )

    duration_seconds = max(
        0,
        int((actual_completed_at - session["started_at"]).total_seconds()),
    )

    completed = await repository.complete_session(
        database,
        session_id=object_id,
        user_id=user_id,
        expected_revision=expected_revision,
        completed_at=actual_completed_at,
        duration_seconds=duration_seconds,
    )

    if not completed:
        await raise_workout_write_error(
            database,
            session_id=object_id,
            user_id=user_id,
        )

    result = await repository.get_session(
        database,
        session_id=object_id,
        user_id=user_id,
    )

    if result is None:
        raise workout_not_found()

    return session_response(result)


async def cancel_workout(
    database: Database,
    *,
    user_id: ObjectId,
    session_id: str,
):
    if not ObjectId.is_valid(session_id):
        raise workout_not_found()

    cancelled = await repository.cancel_session(
        database,
        session_id=ObjectId(session_id),
        user_id=user_id,
        cancelled_at=utc_now(),
    )

    if not cancelled:
        raise workout_not_in_progress()


# =========================================================
# HISTORY
# =========================================================


def encode_history_cursor(
    completed_at: datetime,
) -> str:
    raw = completed_at.isoformat()

    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_history_cursor(
    cursor: str | None,
):
    if not cursor:
        return None

    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()

        return datetime.fromisoformat(raw)

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_CURSOR",
                "message": "Invalid history cursor.",
            },
        ) from error


async def workout_history(
    database: Database,
    *,
    user_id: ObjectId,
    cursor: str | None,
    limit: int,
):
    before = decode_history_cursor(cursor)

    sessions = await repository.list_completed_sessions(
        database,
        user_id=user_id,
        before_completed_at=before,
        limit=limit + 1,
    )

    has_more = len(sessions) > limit

    items = sessions[:limit]

    response = []

    for session in items:
        completed_at = session["completed_at"]

        if completed_at is None:
            continue

        completed_sets = sum(
            1
            for exercise in session["exercises"]
            for workout_set in exercise["sets"]
            if workout_set["completed"]
        )

        response.append(
            WorkoutHistoryItem(
                id=str(session["_id"]),
                name=session["name"],
                started_at=session["started_at"].isoformat(),
                completed_at=(completed_at.isoformat()),
                duration_seconds=(session["duration_seconds"] or 0),
                exercise_count=len(session["exercises"]),
                completed_set_count=(completed_sets),
                exercise_names=[
                    exercise["exercise_name_snapshot"] for exercise in session["exercises"]
                ],
            )
        )

    next_cursor = None

    if has_more and items and items[-1]["completed_at"]:
        next_cursor = encode_history_cursor(items[-1]["completed_at"])

    return (
        response,
        next_cursor,
    )


async def previous_performance(
    database: Database,
    *,
    user_id: ObjectId,
    exercise_ids: list[str],
):
    if not all(ObjectId.is_valid(exercise_id) for exercise_id in exercise_ids):
        raise invalid_exercise()

    requested = {exercise_id for exercise_id in exercise_ids}

    object_ids = [ObjectId(exercise_id) for exercise_id in requested]

    sessions = await repository.recent_sessions_for_exercises(
        database,
        user_id=user_id,
        exercise_ids=object_ids,
    )

    found: dict[str, PreviousExercisePerformance] = {}

    for session in sessions:
        completed_at = session["completed_at"]

        if completed_at is None:
            continue

        for exercise in session["exercises"]:
            exercise_id = str(exercise["exercise_id"])

            if exercise_id not in requested or exercise_id in found:
                continue

            completed_sets = [
                workout_set
                for workout_set in sorted(
                    exercise["sets"],
                    key=lambda item: item["position"],
                )
                if workout_set["completed"]
            ]

            if not completed_sets:
                continue

            found[exercise_id] = PreviousExercisePerformance(
                exercise_id=(exercise_id),
                completed_at=(completed_at.isoformat()),
                sets=[
                    PreviousSetResponse(
                        type=workout_set["type"],
                        weight=workout_set.get("weight"),
                        weight_unit=workout_set.get("weight_unit", "KG"),
                        reps=workout_set.get("reps"),
                        duration_seconds=workout_set.get("duration_seconds"),
                        distance_meters=workout_set.get("distance_meters"),
                        rpe=workout_set.get("rpe"),
                    )
                    for workout_set in completed_sets
                ],
            )

    return list(found.values())


def validated_completed_at(
    value: datetime | None,
    *,
    started_at: datetime,
    now: datetime,
) -> datetime:
    completed_at = value if value is not None else now

    if completed_at.tzinfo is None or completed_at.utcoffset() is None:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_WORKOUT_TIMESTAMP",
                "message": "completed_at must include a timezone.",
            },
        )

    if completed_at < started_at:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_WORKOUT_TIMESTAMP",
                "message": "Workout cannot finish before it starts.",
            },
        )

    if completed_at > now + timedelta(minutes=5):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_WORKOUT_TIMESTAMP",
                "message": "Workout completion time is too far in the future.",
            },
        )

    return completed_at
