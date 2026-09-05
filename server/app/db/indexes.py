from typing import Any

from pymongo import ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase


async def ensure_indexes(
    database: AsyncDatabase[dict[str, Any]],
) -> None:
    users = database["users"]

    identities = database["auth_identities"]

    challenges = database["auth_challenges"]

    sessions = database["sessions"]

    refresh_tokens = database["refresh_tokens"]

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
                "$type": "string",
            }
        },
    )

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
        name=("uq_auth_identity_provider_subject"),
    )

    await identities.create_index(
        "user_id",
        name="idx_auth_identity_user",
    )

    await challenges.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_auth_challenge_expiry",
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
        name="idx_auth_challenge_email_created",
    )

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
        name="idx_sessions_user_revoked",
    )

    await sessions.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_sessions_expiry",
    )

    await refresh_tokens.create_index(
        "session_id",
        name="idx_refresh_session",
    )

    await refresh_tokens.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_refresh_expiry",
    )
