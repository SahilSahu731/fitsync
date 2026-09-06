import math
from datetime import timedelta

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.db.mongo import Database
from app.modules.auth import (
    repository as auth_repository,
)
from app.modules.auth.email import (
    send_auth_code,
)
from app.modules.auth.google import (
    GoogleIdentity,
)
from app.modules.auth.models import (
    AuthChallengeDocument,
    AuthIdentityDocument,
    RefreshTokenDocument,
    SessionDocument,
)
from app.modules.auth.schemas import (
    TokenPair,
)
from app.modules.auth.security import (
    create_access_token,
    digest_otp,
    generate_otp,
    generate_refresh_token,
    hash_refresh_token,
    otp_matches,
    utc_now,
)
from app.modules.users import (
    repository as user_repository,
)
from app.modules.users.models import (
    UserDocument,
)


def invalid_code() -> HTTPException:
    return HTTPException(
        status_code=(status.HTTP_400_BAD_REQUEST),
        detail=("Invalid or expired verification code"),
    )


async def start_email_auth(
    database: Database,
    *,
    email: str,
) -> tuple[str, int, int]:
    email = email.strip().lower()

    now = utc_now()

    latest = await auth_repository.get_latest_active_challenge(
        database,
        email=email,
        now=now,
    )

    if latest is not None and latest["resend_available_at"] > now:
        seconds = math.ceil((latest["resend_available_at"] - now).total_seconds())

        raise HTTPException(
            status_code=(status.HTTP_429_TOO_MANY_REQUESTS),
            detail={
                "code": ("RESEND_COOLDOWN"),
                "message": ("Please wait before requesting another code."),
                "retry_after": seconds,
            },
            headers={"Retry-After": str(seconds)},
        )

    await auth_repository.invalidate_active_challenges(
        database,
        email=email,
        now=now,
        reason="replaced",
    )

    challenge_id = ObjectId()

    code = generate_otp()

    expires_at = now + timedelta(minutes=(settings.otp_expire_minutes))

    resend_available_at = now + timedelta(seconds=(settings.otp_resend_seconds))

    challenge: AuthChallengeDocument = {
        "_id": challenge_id,
        "email": email,
        "purpose": "email_auth",
        "code_digest": digest_otp(
            challenge_id=str(challenge_id),
            email=email,
            code=code,
        ),
        "attempt_count": 0,
        "max_attempts": (settings.otp_max_attempts),
        "created_at": now,
        "expires_at": expires_at,
        "resend_available_at": (resend_available_at),
        "is_active": True,
        "consumed_at": None,
        "invalidated_at": None,
        "invalidated_reason": None,
    }

    await auth_repository.insert_challenge(
        database,
        challenge,
    )

    try:
        await send_auth_code(
            email=email,
            code=code,
        )

    except Exception as error:
        await auth_repository.invalidate_challenge(
            database,
            challenge_id=challenge_id,
            now=utc_now(),
            reason="email_delivery_failed",
        )

        raise HTTPException(
            status_code=(status.HTTP_502_BAD_GATEWAY),
            detail=("Unable to send verification email right now"),
        ) from error

    return (
        str(challenge_id),
        settings.otp_expire_minutes * 60,
        settings.otp_resend_seconds,
    )


async def resolve_verified_email_user(
    database: Database,
    *,
    email: str,
) -> tuple[
    UserDocument,
    bool,
]:
    now = utc_now()

    identity = await auth_repository.get_identity(
        database,
        provider="email",
        provider_subject=email,
    )

    if identity is not None:
        user = await user_repository.get_user_by_id(
            database,
            identity["user_id"],
        )

        if user is None:
            raise RuntimeError("Authentication identity references a missing user")

        await user_repository.mark_email_verified(
            database,
            user["_id"],
            updated_at=now,
        )

        user["email_verified"] = True

        user["last_seen_at"] = now

        return (
            user,
            False,
        )

    existing_user = await user_repository.get_user_by_email(
        database,
        email,
    )

    is_new_user = existing_user is None

    if existing_user is None:
        user: UserDocument = {
            "_id": ObjectId(),
            "email": email,
            "display_name": None,
            "username": None,
            "avatar_url": None,
            "email_verified": True,
            "onboarding_complete": False,
            "created_at": now,
            "updated_at": now,
            "last_seen_at": now,
        }

        try:
            await user_repository.insert_user(
                database,
                user,
            )

        except DuplicateKeyError:
            existing_user = await user_repository.get_user_by_email(
                database,
                email,
            )

            if existing_user is None:
                raise

            user = existing_user

            is_new_user = False

    else:
        user = existing_user

        await user_repository.mark_email_verified(
            database,
            user["_id"],
            updated_at=now,
        )

        user["email_verified"] = True

        user["last_seen_at"] = now

    identity_document: AuthIdentityDocument = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "provider": "email",
        "provider_subject": email,
        "created_at": now,
    }

    try:
        await auth_repository.insert_identity(
            database,
            identity_document,
        )

    except DuplicateKeyError:
        pass

    return (
        user,
        is_new_user,
    )


async def create_auth_session(
    database: Database,
    *,
    user: UserDocument,
    device_name: str | None,
    platform: str,
    user_agent: str | None,
) -> TokenPair:
    now = utc_now()

    session_id = ObjectId()

    absolute_expires_at = now + timedelta(days=(settings.session_absolute_expire_days))

    expires_at = min(
        (now + timedelta(days=(settings.refresh_token_expire_days))),
        absolute_expires_at,
    )

    session: SessionDocument = {
        "_id": session_id,
        "user_id": user["_id"],
        "device_name": device_name,
        "platform": platform,
        "user_agent": user_agent,
        "created_at": now,
        "last_used_at": now,
        "expires_at": expires_at,
        "absolute_expires_at": (absolute_expires_at),
        "revoked_at": None,
        "revoke_reason": None,
    }

    await auth_repository.create_session(
        database,
        session,
    )

    raw_refresh_token = generate_refresh_token()

    refresh_hash = hash_refresh_token(raw_refresh_token)

    refresh_document: RefreshTokenDocument = {
        "_id": refresh_hash,
        "session_id": session_id,
        "user_id": user["_id"],
        "created_at": now,
        "expires_at": expires_at,
        "used_at": None,
        "revoked_at": None,
        "replaced_by_hash": None,
    }

    await auth_repository.insert_refresh_token(
        database,
        refresh_document,
    )

    access_token = create_access_token(
        user_id=str(user["_id"]),
        session_id=str(session_id),
    )

    return TokenPair(
        access_token=access_token,
        refresh_token=(raw_refresh_token),
        expires_in=(settings.access_token_expire_minutes * 60),
    )


async def verify_email_code(
    database: Database,
    *,
    challenge_id: str,
    code: str,
    device_name: str | None,
    platform: str,
    user_agent: str | None,
) -> tuple[
    UserDocument,
    TokenPair,
    bool,
]:
    if not ObjectId.is_valid(challenge_id):
        raise invalid_code()

    now = utc_now()

    challenge_object_id = ObjectId(challenge_id)

    challenge = await auth_repository.get_challenge_for_attempt(
        database,
        challenge_id=(challenge_object_id),
        now=now,
    )

    if challenge is None:
        raise invalid_code()

    valid = otp_matches(
        challenge_id=challenge_id,
        email=challenge["email"],
        code=code,
        expected_digest=challenge["code_digest"],
    )

    if not valid:
        if challenge["attempt_count"] >= challenge["max_attempts"]:
            await auth_repository.invalidate_challenge(
                database,
                challenge_id=(challenge_object_id),
                now=now,
                reason=("too_many_attempts"),
            )

        raise invalid_code()

    consumed = await auth_repository.consume_challenge(
        database,
        challenge_id=(challenge_object_id),
        now=now,
    )

    if not consumed:
        raise invalid_code()

    user, is_new_user = await resolve_verified_email_user(
        database,
        email=challenge["email"],
    )

    tokens = await create_auth_session(
        database,
        user=user,
        device_name=device_name,
        platform=platform,
        user_agent=user_agent,
    )

    return (
        user,
        tokens,
        is_new_user,
    )


def invalid_refresh_token() -> HTTPException:
    return HTTPException(
        status_code=(status.HTTP_401_UNAUTHORIZED),
        detail=("Invalid refresh token"),
    )


async def refresh_session(
    database: Database,
    *,
    raw_refresh_token: str,
) -> TokenPair:
    now = utc_now()

    token_hash = hash_refresh_token(raw_refresh_token)

    token = await auth_repository.get_refresh_token(
        database,
        token_hash,
    )

    if token is None:
        raise invalid_refresh_token()

    session_id = token["session_id"]

    if token["used_at"] is not None:
        await auth_repository.revoke_session(
            database,
            session_id,
            revoked_at=now,
            reason="refresh_token_reuse",
        )

        raise invalid_refresh_token()

    if token["revoked_at"] is not None or token["expires_at"] <= now:
        raise invalid_refresh_token()

    session = await auth_repository.get_session(
        database,
        session_id,
    )

    if session is None or session["revoked_at"] is not None:
        raise invalid_refresh_token()

    if session["expires_at"] <= now:
        raise invalid_refresh_token()

    if session["absolute_expires_at"] <= now:
        await auth_repository.revoke_session(
            database,
            session_id,
            revoked_at=now,
            reason=("absolute_session_expired"),
        )

        raise invalid_refresh_token()

    user = await user_repository.get_user_by_id(
        database,
        session["user_id"],
    )

    if user is None:
        await auth_repository.revoke_session(
            database,
            session_id,
            revoked_at=now,
            reason="missing_user",
        )

        raise invalid_refresh_token()

    new_raw_token = generate_refresh_token()

    new_hash = hash_refresh_token(new_raw_token)

    consumed = await auth_repository.consume_refresh_token(
        database,
        token_hash,
        used_at=now,
        replacement_hash=new_hash,
    )

    if not consumed:
        await auth_repository.revoke_session(
            database,
            session_id,
            revoked_at=now,
            reason="refresh_token_reuse",
        )

        raise invalid_refresh_token()

    new_expires_at = min(
        (now + timedelta(days=(settings.refresh_token_expire_days))),
        session["absolute_expires_at"],
    )

    new_refresh_document: RefreshTokenDocument = {
        "_id": new_hash,
        "session_id": session_id,
        "user_id": user["_id"],
        "created_at": now,
        "expires_at": new_expires_at,
        "used_at": None,
        "revoked_at": None,
        "replaced_by_hash": None,
    }

    await auth_repository.insert_refresh_token(
        database,
        new_refresh_document,
    )

    await auth_repository.update_session_activity(
        database,
        session_id,
        last_used_at=now,
        expires_at=new_expires_at,
    )

    access_token = create_access_token(
        user_id=str(user["_id"]),
        session_id=str(session_id),
    )

    return TokenPair(
        access_token=access_token,
        refresh_token=new_raw_token,
        expires_in=(settings.access_token_expire_minutes * 60),
    )


async def authenticate_with_google(
    database: Database,
    *,
    google: GoogleIdentity,
    device_name: str | None,
    platform: str,
    user_agent: str | None,
) -> tuple[
    UserDocument,
    TokenPair,
    bool,
]:
    now = utc_now()

    identity = await auth_repository.get_identity(
        database,
        provider="google",
        provider_subject=(google.subject),
    )

    if identity is not None:
        user = await user_repository.get_user_by_id(
            database,
            identity["user_id"],
        )

        if user is None:
            raise RuntimeError("Google identity references a missing FitSync user")
        display_name = google.display_name if user["display_name"] is None else None

        avatar_url = google.avatar_url if user["avatar_url"] is None else None

        await user_repository.update_user_profile(
            database,
            user["_id"],
            display_name=display_name,
            avatar_url=avatar_url,
            mark_email_verified=(google.email_authoritative),
            timestamp=now,
        )

        if display_name is not None:
            user["display_name"] = display_name

        if avatar_url is not None:
            user["avatar_url"] = avatar_url

        if google.email_authoritative:
            user["email_verified"] = True

        user["last_seen_at"] = now

        tokens = await create_auth_session(
            database,
            user=user,
            device_name=device_name,
            platform=platform,
            user_agent=user_agent,
        )

        return (
            user,
            tokens,
            False,
        )

    existing_user = await user_repository.get_user_by_email(
        database,
        google.email,
    )

    if existing_user is not None:
        if not google.email_authoritative:
            raise HTTPException(
                status_code=(status.HTTP_409_CONFLICT),
                detail={
                    "code": ("GOOGLE_LINK_REQUIRES_EMAIL_VERIFICATION"),
                    "message": (
                        "Verify your email with FitSync before linking this Google account."
                    ),
                },
            )

        user = existing_user

        display_name = google.display_name if user["display_name"] is None else None

        avatar_url = google.avatar_url if user["avatar_url"] is None else None

        await user_repository.update_user_profile(
            database,
            user["_id"],
            display_name=display_name,
            avatar_url=avatar_url,
            mark_email_verified=True,
            timestamp=now,
        )

        if display_name is not None:
            user["display_name"] = display_name

        if avatar_url is not None:
            user["avatar_url"] = avatar_url

        user["email_verified"] = True

        user["last_seen_at"] = now

        is_new_user = False

    else:
        user = {
            "_id": ObjectId(),
            "email": google.email,
            "display_name": (google.display_name),
            "username": None,
            "avatar_url": (google.avatar_url),
            "email_verified": (google.email_authoritative),
            "onboarding_complete": False,
            "created_at": now,
            "updated_at": now,
            "last_seen_at": now,
        }

        try:
            await user_repository.insert_user(
                database,
                user,
            )

        except DuplicateKeyError:
            existing_user = await user_repository.get_user_by_email(
                database,
                google.email,
            )

            if existing_user is None:
                raise

            if not google.email_authoritative:
                raise HTTPException(
                    status_code=(status.HTTP_409_CONFLICT),
                    detail={
                        "code": ("GOOGLE_LINK_REQUIRES_EMAIL_VERIFICATION"),
                        "message": (
                            "Verify your email with FitSync before linking this Google account."
                        ),
                    },
                ) from None

            user = existing_user

            is_new_user = False

        else:
            is_new_user = True

    google_identity: AuthIdentityDocument = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "provider": "google",
        "provider_subject": (google.subject),
        "created_at": now,
    }

    try:
        await auth_repository.insert_identity(
            database,
            google_identity,
        )

    except DuplicateKeyError as err:
        linked_identity = await auth_repository.get_identity(
            database,
            provider="google",
            provider_subject=(google.subject),
        )

        if linked_identity is None:
            raise

        linked_user = await user_repository.get_user_by_id(
            database,
            linked_identity["user_id"],
        )

        if linked_user is None:
            raise RuntimeError("Google identity references a missing FitSync user") from err

        user = linked_user

        is_new_user = False

    tokens = await create_auth_session(
        database,
        user=user,
        device_name=device_name,
        platform=platform,
        user_agent=user_agent,
    )

    return (
        user,
        tokens,
        is_new_user,
    )
