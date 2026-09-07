from typing import Any

from pymongo import (
    ASCENDING,
    DESCENDING,
    IndexModel,
)
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import (
    AsyncDatabase,
)
from pymongo.errors import OperationFailure


async def ensure_index(
    collection: AsyncCollection[dict[str, Any]],
    keys: str | list[tuple[str, int]],
    **options: Any,
) -> None:
    """Reuse equivalent indexes with legacy names without weakening constraints."""
    try:
        await collection.create_index(keys, **options)
    except OperationFailure as error:
        if error.code != 85:
            raise

        expected = dict(IndexModel(keys, **options).document)
        indexes = await collection.index_information()

        def definition(index: dict[str, Any]) -> dict[str, Any]:
            result = dict(index)
            key = result.pop("key")
            result["key"] = list(key.items()) if isinstance(key, dict) else list(key)
            # Server metadata and build options do not change index semantics.
            for field in ("name", "v", "ns", "background"):
                result.pop(field, None)
            for field in ("unique", "sparse", "hidden"):
                if result.get(field) is False:
                    result.pop(field)
            return result

        if not any(definition(index) == definition(expected) for index in indexes.values()):
            raise


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
