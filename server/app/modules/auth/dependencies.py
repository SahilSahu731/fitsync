from dataclasses import dataclass
from typing import Annotated

from bson import ObjectId
from fastapi import (
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from jwt.exceptions import (
    InvalidTokenError,
)

from app.db.mongo import DatabaseDep
from app.modules.auth import (
    repository as auth_repository,
)
from app.modules.auth.models import (
    SessionDocument,
)
from app.modules.auth.security import (
    decode_access_token,
    utc_now,
)
from app.modules.users import (
    repository as user_repository,
)
from app.modules.users.models import (
    UserDocument,
)

bearer_scheme = HTTPBearer(
    auto_error=False,
)


@dataclass(slots=True)
class AuthContext:
    user: UserDocument

    session: SessionDocument


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=(status.HTTP_401_UNAUTHORIZED),
        detail=("Authentication required"),
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )


async def get_current_auth(
    database: DatabaseDep,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> AuthContext:
    if credentials is None:
        raise unauthorized()

    try:
        claims = decode_access_token(credentials.credentials)

    except InvalidTokenError as error:
        raise unauthorized() from error

    if claims.get("type") != "access":
        raise unauthorized()

    user_id_value = claims.get("sub")

    session_id_value = claims.get("sid")

    if not isinstance(
        user_id_value,
        str,
    ):
        raise unauthorized()

    if not isinstance(
        session_id_value,
        str,
    ):
        raise unauthorized()

    if not ObjectId.is_valid(user_id_value):
        raise unauthorized()

    if not ObjectId.is_valid(session_id_value):
        raise unauthorized()

    user_id = ObjectId(user_id_value)

    session_id = ObjectId(session_id_value)

    session = await auth_repository.get_session(
        database,
        session_id,
    )

    if session is None:
        raise unauthorized()

    if session["user_id"] != user_id:
        raise unauthorized()

    if session["revoked_at"] is not None:
        raise unauthorized()

    now = utc_now()

    if session["expires_at"] <= now:
        raise unauthorized()

    user = await user_repository.get_user_by_id(
        database,
        user_id,
    )

    if user is None:
        raise unauthorized()

    return AuthContext(
        user=user,
        session=session,
    )


CurrentAuthDep = Annotated[
    AuthContext,
    Depends(get_current_auth),
]


async def get_current_user(
    auth: CurrentAuthDep,
) -> UserDocument:
    return auth.user


CurrentUserDep = Annotated[
    UserDocument,
    Depends(get_current_user),
]
