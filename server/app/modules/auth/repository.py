from datetime import datetime
from typing import cast

from bson import ObjectId
from pymongo import (
    DESCENDING,
    ReturnDocument,
)

from app.db.mongo import Database
from app.modules.auth.models import (
    AuthChallengeDocument,
    AuthIdentityDocument,
    RefreshTokenDocument,
    SessionDocument,
)


async def get_latest_active_challenge(
    database: Database,
    *,
    email: str,
    now: datetime,
) -> AuthChallengeDocument | None:
    document = await database["auth_challenges"].find_one(
        {
            "email": email,
            "is_active": True,
            "expires_at": {
                "$gt": now,
            },
        },
        sort=[
            (
                "created_at",
                DESCENDING,
            )
        ],
    )

    return cast(
        AuthChallengeDocument | None,
        document,
    )


async def invalidate_active_challenges(
    database: Database,
    *,
    email: str,
    now: datetime,
    reason: str,
) -> None:
    await database["auth_challenges"].update_many(
        {
            "email": email,
            "is_active": True,
        },
        {
            "$set": {
                "is_active": False,
                "invalidated_at": now,
                "invalidated_reason": reason,
            }
        },
    )


async def insert_challenge(
    database: Database,
    challenge: AuthChallengeDocument,
) -> None:
    await database["auth_challenges"].insert_one(challenge)


async def get_challenge_for_attempt(
    database: Database,
    *,
    challenge_id: ObjectId,
    now: datetime,
) -> AuthChallengeDocument | None:
    document = await database["auth_challenges"].find_one_and_update(
        {
            "_id": challenge_id,
            "is_active": True,
            "expires_at": {
                "$gt": now,
            },
            "$expr": {
                "$lt": [
                    "$attempt_count",
                    "$max_attempts",
                ]
            },
        },
        {
            "$inc": {
                "attempt_count": 1,
            }
        },
        return_document=(ReturnDocument.AFTER),
    )

    return cast(
        AuthChallengeDocument | None,
        document,
    )


async def consume_challenge(
    database: Database,
    *,
    challenge_id: ObjectId,
    now: datetime,
) -> bool:
    result = await database["auth_challenges"].update_one(
        {
            "_id": challenge_id,
            "is_active": True,
        },
        {
            "$set": {
                "is_active": False,
                "consumed_at": now,
            }
        },
    )

    return result.modified_count == 1


async def invalidate_challenge(
    database: Database,
    *,
    challenge_id: ObjectId,
    now: datetime,
    reason: str,
) -> None:
    await database["auth_challenges"].update_one(
        {
            "_id": challenge_id,
        },
        {
            "$set": {
                "is_active": False,
                "invalidated_at": now,
                "invalidated_reason": reason,
            }
        },
    )


async def get_identity(
    database: Database,
    *,
    provider: str,
    provider_subject: str,
) -> AuthIdentityDocument | None:
    document = await database["auth_identities"].find_one(
        {
            "provider": provider,
            "provider_subject": (provider_subject),
        }
    )

    return cast(
        AuthIdentityDocument | None,
        document,
    )


async def insert_identity(
    database: Database,
    identity: AuthIdentityDocument,
) -> None:
    await database["auth_identities"].insert_one(identity)


async def create_session(
    database: Database,
    session: SessionDocument,
) -> None:
    await database["sessions"].insert_one(session)


async def get_session(
    database: Database,
    session_id: ObjectId,
) -> SessionDocument | None:
    document = await database["sessions"].find_one(
        {
            "_id": session_id,
        }
    )

    return cast(
        SessionDocument | None,
        document,
    )


async def update_session_activity(
    database: Database,
    session_id: ObjectId,
    *,
    last_used_at: datetime,
    expires_at: datetime,
) -> None:
    await database["sessions"].update_one(
        {
            "_id": session_id,
        },
        {
            "$set": {
                "last_used_at": last_used_at,
                "expires_at": expires_at,
            }
        },
    )


async def revoke_session(
    database: Database,
    session_id: ObjectId,
    *,
    revoked_at: datetime,
    reason: str,
) -> None:
    await database["sessions"].update_one(
        {
            "_id": session_id,
            "revoked_at": None,
        },
        {
            "$set": {
                "revoked_at": revoked_at,
                "revoke_reason": reason,
            }
        },
    )

    await database["refresh_tokens"].update_many(
        {
            "session_id": session_id,
            "revoked_at": None,
        },
        {
            "$set": {
                "revoked_at": revoked_at,
            }
        },
    )


async def insert_refresh_token(
    database: Database,
    token: RefreshTokenDocument,
) -> None:
    await database["refresh_tokens"].insert_one(token)


async def get_refresh_token(
    database: Database,
    token_hash: str,
) -> RefreshTokenDocument | None:
    document = await database["refresh_tokens"].find_one(
        {
            "_id": token_hash,
        }
    )

    return cast(
        RefreshTokenDocument | None,
        document,
    )


async def consume_refresh_token(
    database: Database,
    token_hash: str,
    *,
    used_at: datetime,
    replacement_hash: str,
) -> bool:
    result = await database["refresh_tokens"].update_one(
        {
            "_id": token_hash,
            "used_at": None,
            "revoked_at": None,
        },
        {
            "$set": {
                "used_at": used_at,
                "replaced_by_hash": (replacement_hash),
            }
        },
    )

    return result.modified_count == 1
