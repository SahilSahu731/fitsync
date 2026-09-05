from datetime import datetime
from typing import TypedDict

from bson import ObjectId


class AuthIdentityDocument(TypedDict):
    _id: ObjectId

    user_id: ObjectId

    provider: str

    provider_subject: str

    created_at: datetime


class AuthChallengeDocument(TypedDict):
    _id: ObjectId

    email: str

    purpose: str

    code_digest: str

    attempt_count: int

    max_attempts: int

    created_at: datetime

    expires_at: datetime

    resend_available_at: datetime

    is_active: bool

    consumed_at: datetime | None

    invalidated_at: datetime | None

    invalidated_reason: str | None


class SessionDocument(TypedDict):
    _id: ObjectId

    user_id: ObjectId

    device_name: str | None

    platform: str

    user_agent: str | None

    created_at: datetime

    last_used_at: datetime

    expires_at: datetime

    absolute_expires_at: datetime

    revoked_at: datetime | None

    revoke_reason: str | None


class RefreshTokenDocument(TypedDict):
    _id: str

    session_id: ObjectId

    user_id: ObjectId

    created_at: datetime

    expires_at: datetime

    used_at: datetime | None

    revoked_at: datetime | None

    replaced_by_hash: str | None
