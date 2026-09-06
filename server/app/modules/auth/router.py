from fastapi import (
    APIRouter,
    HTTPException,
    Request,
    status,
)

from app.db.mongo import DatabaseDep
from app.modules.auth import (
    repository,
    service,
)
from app.modules.auth.dependencies import (
    CurrentAuthDep,
    CurrentUserDep,
)
from app.modules.auth.google import (
    verify_google_token,
)
from app.modules.auth.schemas import (
    EmailAuthResponse,
    EmailStartRequest,
    EmailStartResponse,
    EmailVerifyRequest,
    GoogleAuthRequest,
    GoogleAuthResponse,
    MessageResponse,
    RefreshRequest,
    TokenPair,
)
from app.modules.auth.security import (
    utc_now,
)
from app.modules.users.schemas import (
    UserResponse,
)

router = APIRouter(
    prefix="/auth",
    tags=[
        "Authentication",
    ],
)


@router.post(
    "/email/start",
    response_model=EmailStartResponse,
)
async def email_start(
    payload: EmailStartRequest,
    database: DatabaseDep,
) -> EmailStartResponse:
    email = str(payload.email).lower()

    (
        challenge_id,
        expires_in,
        resend_after,
    ) = await service.start_email_auth(
        database,
        email=email,
    )

    return EmailStartResponse(
        challenge_id=challenge_id,
        expires_in=expires_in,
        resend_after=resend_after,
    )


@router.post(
    "/email/verify",
    response_model=EmailAuthResponse,
)
async def email_verify(
    payload: EmailVerifyRequest,
    request: Request,
    database: DatabaseDep,
) -> EmailAuthResponse:
    (
        user,
        tokens,
        is_new_user,
    ) = await service.verify_email_code(
        database,
        challenge_id=(payload.challenge_id),
        code=payload.code,
        device_name=(payload.device_name),
        platform=(payload.platform),
        user_agent=(request.headers.get("user-agent")),
    )

    return EmailAuthResponse(
        user=UserResponse.from_document(user),
        tokens=tokens,
        is_new_user=is_new_user,
    )


@router.post(
    "/refresh",
    response_model=TokenPair,
)
async def refresh(
    payload: RefreshRequest,
    database: DatabaseDep,
) -> TokenPair:
    return await service.refresh_session(
        database,
        raw_refresh_token=(payload.refresh_token),
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
)
async def logout(
    auth: CurrentAuthDep,
    database: DatabaseDep,
) -> MessageResponse:
    await repository.revoke_session(
        database,
        auth.session["_id"],
        revoked_at=utc_now(),
        reason="logout",
    )

    return MessageResponse(message=("Logged out successfully"))


@router.post(
    "/google",
    response_model=GoogleAuthResponse,
)
async def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
    database: DatabaseDep,
) -> GoogleAuthResponse:
    try:
        google_identity = await verify_google_token(payload.id_token)

    except ValueError as error:
        raise HTTPException(
            status_code=(status.HTTP_401_UNAUTHORIZED),
            detail=("Invalid Google credential"),
        ) from error

    (
        user,
        tokens,
        is_new_user,
    ) = await service.authenticate_with_google(
        database,
        google=google_identity,
        device_name=(payload.device_name),
        platform=(payload.platform),
        user_agent=(request.headers.get("user-agent")),
    )

    return GoogleAuthResponse(
        user=(UserResponse.from_document(user)),
        tokens=tokens,
        is_new_user=is_new_user,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
async def me(
    user: CurrentUserDep,
) -> UserResponse:
    return UserResponse.from_document(user)
