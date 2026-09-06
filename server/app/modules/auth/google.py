from dataclasses import dataclass
from typing import Any

from anyio import to_thread
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.core.config import settings


@dataclass(slots=True)
class GoogleIdentity:
    subject: str

    email: str

    email_verified: bool

    email_authoritative: bool

    display_name: str | None

    avatar_url: str | None


def _verify_google_token(
    token: str,
) -> dict[str, Any]:
    claims = google_id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        settings.google_web_client_id,
    )

    if not isinstance(claims, dict):
        raise ValueError("Invalid Google token payload")

    return claims


async def verify_google_token(
    token: str,
) -> GoogleIdentity:
    claims = await to_thread.run_sync(
        _verify_google_token,
        token,
    )

    issuer = claims.get("iss")

    if issuer not in {
        "accounts.google.com",
        "https://accounts.google.com",
    }:
        raise ValueError("Invalid Google token issuer")

    subject = claims.get("sub")
    email = claims.get("email")

    if not isinstance(subject, str):
        raise ValueError("Google token is missing subject")

    if not isinstance(email, str):
        raise ValueError("Google token is missing email")

    email = email.strip().lower()

    email_verified = claims.get("email_verified") is True

    hosted_domain = claims.get("hd")

    email_authoritative = email.endswith("@gmail.com") or (
        email_verified
        and isinstance(
            hosted_domain,
            str,
        )
        and bool(hosted_domain)
    )

    display_name = claims.get("name")

    avatar_url = claims.get("picture")

    return GoogleIdentity(
        subject=subject,
        email=email,
        email_verified=email_verified,
        email_authoritative=(email_authoritative),
        display_name=(
            display_name
            if isinstance(
                display_name,
                str,
            )
            else None
        ),
        avatar_url=(
            avatar_url
            if isinstance(
                avatar_url,
                str,
            )
            else None
        ),
    )
