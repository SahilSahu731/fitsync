from typing import Any

from pymongo import (
    ASCENDING,
    DESCENDING,
)
from pymongo.asynchronous.database import (
    AsyncDatabase,
)


async def ensure_indexes(
    database: AsyncDatabase[
        dict[str, Any]
    ],
) -> None:
    users = database[
        "users"
    ]

    identities = database[
        "auth_identities"
    ]

    challenges = database[
        "auth_challenges"
    ]

    sessions = database[
        "sessions"
    ]

    refresh_tokens = database[
        "refresh_tokens"
    ]

    exercises = database[
        "exercises"
    ]

    templates = database[
        "workout_templates"
    ]

    # USERS

    await users.create_index(
        "email",
        unique=True,
        name="uq_users_email",
    )

    await users.create_index(
        "username",
        unique=True,
        name="uq_users_username",
        partialFilterExpression={
            "username": {
                "$type":
                    "string",
            }
        },
    )

    # AUTH IDENTITIES

    await identities.create_index(
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
        name=(
            "uq_auth_identity_"
            "provider_subject"
        ),
    )

    await identities.create_index(
        "user_id",
        name="idx_auth_identity_user",
    )

    # AUTH CHALLENGES

    await challenges.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name=(
            "ttl_auth_challenge_expiry"
        ),
    )

    await challenges.create_index(
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
        name=(
            "idx_auth_challenge_"
            "email_created"
        ),
    )

    # SESSIONS

    await sessions.create_index(
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
        name=(
            "idx_sessions_user_revoked"
        ),
    )

    await sessions.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_sessions_expiry",
    )

    # REFRESH TOKENS

    await refresh_tokens.create_index(
        "session_id",
        name="idx_refresh_session",
    )

    await refresh_tokens.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_refresh_expiry",
    )

    # EXERCISES

    await exercises.create_index(
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
        name=(
            "idx_exercises_name_cursor"
        ),
    )

    await exercises.create_index(
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
        name=(
            "idx_exercises_visibility"
        ),
    )

    await exercises.create_index(
        "primary_muscles",
        name=(
            "idx_exercises_primary_muscles"
        ),
    )

    await exercises.create_index(
        "equipment",
        name=(
            "idx_exercises_equipment"
        ),
    )

    await exercises.create_index(
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
            "source":
                "CUSTOM",

            "is_archived":
                False,
        },
        name=(
            "uq_custom_exercise_name"
        ),
    )

    # WORKOUT TEMPLATES

    await templates.create_index(
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
        name=(
            "idx_templates_user_active"
        ),
    )