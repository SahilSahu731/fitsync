from typing import Any

from pymongo import (
    ASCENDING,
    DESCENDING,
)
from pymongo.asynchronous.database import (
    AsyncDatabase,
)

from app.db.index_utils import ensure_index as ensure_index
from app.modules.progress.indexes import (
    ensure_progress_indexes,
)


async def ensure_indexes(
    database: AsyncDatabase[dict[str, Any]],
) -> None:
    users = database["users"]

    identities = database["auth_identities"]

    challenges = database["auth_challenges"]

    sessions = database["sessions"]

    refresh_tokens = database["refresh_tokens"]

    exercises = database["exercises"]

    templates = database["workout_templates"]

    workout_sessions = database["workout_sessions"]

    # USERS

    await ensure_index(
        users,
        "email",
        unique=True,
        name="uq_users_email",
    )

    await ensure_index(
        users,
        "username",
        unique=True,
        name="uq_users_username",
        partialFilterExpression={"username": {"$type": "string"}},
    )

    # AUTH IDENTITIES

    await ensure_index(
        identities,
        [
            (
                "provider",
                ASCENDING,
            ),
            (
                "provider_subject",
                ASCENDING,
            ),
        ],
        unique=True,
        name=("uq_auth_identity_provider_subject"),
    )

    await ensure_index(
        identities,
        "user_id",
        name="idx_auth_identity_user",
    )

    # AUTH CHALLENGES

    await ensure_index(
        challenges,
        "expires_at",
        expireAfterSeconds=0,
        name=("ttl_auth_challenge_expiry"),
    )

    await ensure_index(
        challenges,
        [
            (
                "email",
                ASCENDING,
            ),
            (
                "created_at",
                DESCENDING,
            ),
        ],
        name=("idx_auth_challenge_email_created"),
    )

    # SESSIONS

    await ensure_index(
        sessions,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "revoked_at",
                ASCENDING,
            ),
        ],
        name=("idx_sessions_user_revoked"),
    )

    await ensure_index(
        sessions,
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_sessions_expiry",
    )

    # REFRESH TOKENS

    await ensure_index(
        refresh_tokens,
        "session_id",
        name="idx_refresh_session",
    )

    await ensure_index(
        refresh_tokens,
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_refresh_expiry",
    )

    # EXERCISES

    await ensure_index(
        exercises,
        [
            (
                "normalized_name",
                ASCENDING,
            ),
            (
                "_id",
                ASCENDING,
            ),
        ],
        name=("idx_exercises_name_cursor"),
    )

    await ensure_index(
        exercises,
        [
            (
                "source",
                ASCENDING,
            ),
            (
                "owner_user_id",
                ASCENDING,
            ),
            (
                "is_archived",
                ASCENDING,
            ),
        ],
        name=("idx_exercises_visibility"),
    )

    await ensure_index(
        exercises,
        "primary_muscles",
        name=("idx_exercises_primary_muscles"),
    )

    await ensure_index(
        exercises,
        "equipment",
        name=("idx_exercises_equipment"),
    )

    await ensure_index(
        exercises,
        [
            (
                "owner_user_id",
                ASCENDING,
            ),
            (
                "normalized_name",
                ASCENDING,
            ),
        ],
        unique=True,
        partialFilterExpression={
            "source": "CUSTOM",
            "is_archived": False,
        },
        name=("uq_custom_exercise_name"),
    )

    # WORKOUT SESSIONS

    await ensure_index(
        workout_sessions,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "status",
                ASCENDING,
            ),
            (
                "exercises.exercise_id",
                ASCENDING,
            ),
            (
                "completed_at",
                DESCENDING,
            ),
        ],
        name=("idx_workout_previous_exercise"),
    )

    await ensure_index(
        workout_sessions,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "status",
                ASCENDING,
            ),
        ],
        name="idx_workout_session_active",
    )

    await ensure_index(
        workout_sessions,
        "user_id",
        unique=True,
        partialFilterExpression={
            "status": "IN_PROGRESS",
        },
        name="uq_workout_one_active_per_user",
    )

    await ensure_index(
        workout_sessions,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "completed_at",
                DESCENDING,
            ),
        ],
        name="idx_workout_history",
    )

    await ensure_index(
        workout_sessions,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "client_workout_id",
                ASCENDING,
            ),
        ],
        unique=True,
        partialFilterExpression={
            "client_workout_id": {
                "$type": "string",
            },
        },
        name="uq_workout_client_workout_id",
    )

    # WORKOUT TEMPLATES

    await ensure_index(
        templates,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "archived_at",
                ASCENDING,
            ),
            (
                "updated_at",
                DESCENDING,
            ),
        ],
        name=("idx_templates_user_active"),
    )
    await ensure_progress_indexes(database)
