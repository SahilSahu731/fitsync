import hashlib
import hmac
import secrets
from datetime import (
    UTC,
    datetime,
    timedelta,
)
from typing import Any
from uuid import uuid4

import jwt

from app.core.config import settings


def utc_now() -> datetime:
    return datetime.now(UTC)


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def digest_otp(
    *,
    challenge_id: str,
    email: str,
    code: str,
) -> str:
    message = (f"{challenge_id}:{email}:{code}").encode()

    key = settings.otp_hmac_secret.get_secret_value().encode()

    return hmac.new(
        key,
        message,
        hashlib.sha256,
    ).hexdigest()


def otp_matches(
    *,
    challenge_id: str,
    email: str,
    code: str,
    expected_digest: str,
) -> bool:
    actual = digest_otp(
        challenge_id=challenge_id,
        email=email,
        code=code,
    )

    return hmac.compare_digest(
        actual,
        expected_digest,
    )


def create_access_token(
    *,
    user_id: str,
    session_id: str,
) -> str:
    now = utc_now()

    expires_at = now + timedelta(minutes=(settings.access_token_expire_minutes))

    payload = {
        "sub": user_id,
        "sid": session_id,
        "type": "access",
        "jti": str(uuid4()),
        "iat": now,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret.get_secret_value(),
        algorithm=(settings.jwt_algorithm),
    )


def decode_access_token(
    token: str,
) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
        audience=(settings.jwt_audience),
        issuer=(settings.jwt_issuer),
        options={
            "require": [
                "sub",
                "sid",
                "type",
                "jti",
                "iat",
                "exp",
                "iss",
                "aud",
            ]
        },
    )


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(
    token: str,
) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
