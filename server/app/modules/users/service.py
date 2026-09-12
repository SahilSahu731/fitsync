import logging

from fastapi import (
    HTTPException,
    status,
)
from pymongo.errors import (
    DuplicateKeyError,
)

from app.db.mongo import Database
from app.modules.auth.security import (
    utc_now,
)
from app.modules.media import (
    service as media_service,
)
from app.modules.users import (
    repository,
)
from app.modules.users.constants import (
    RESERVED_USERNAMES,
)
from app.modules.users.models import (
    UserDocument,
)
from app.modules.users.schemas import (
    OnboardingRequest,
    PreferencesUpdateRequest,
    ProfileUpdateRequest,
)

logger = logging.getLogger(__name__)


def username_unavailable_error():
    return HTTPException(
        status_code=(status.HTTP_409_CONFLICT),
        detail={
            "code": "USERNAME_UNAVAILABLE",
            "message": "That username is already taken.",
        },
    )


async def username_is_available(
    database: Database,
    *,
    username: str,
    current_user_id=None,
) -> bool:
    username = username.strip().lower()

    if username in RESERVED_USERNAMES:
        return False

    existing = await repository.get_user_by_username(
        database,
        username,
    )

    if existing is None:
        return True

    if current_user_id is not None and existing["_id"] == current_user_id:
        return True

    return False


async def complete_user_onboarding(
    database: Database,
    *,
    user: UserDocument,
    payload: OnboardingRequest,
) -> UserDocument:
    available = await username_is_available(
        database,
        username=payload.username,
        current_user_id=user["_id"],
    )

    if not available:
        raise (username_unavailable_error())

    now = utc_now()

    try:
        await repository.complete_onboarding(
            database,
            user["_id"],
            display_name=payload.display_name,
            username=payload.username,
            fitness_goal=payload.fitness_goal,
            experience_level=payload.experience_level,
            weight_unit=payload.weight_unit,
            weekly_workout_target=payload.weekly_workout_target,
            timestamp=now,
        )

    except DuplicateKeyError as error:
        raise (username_unavailable_error()) from error

    updated = await repository.get_user_by_id(
        database,
        user["_id"],
    )

    if updated is None:
        raise RuntimeError("User disappeared during onboarding")

    return updated


async def update_user_profile_details(
    database: Database,
    *,
    user: UserDocument,
    payload: ProfileUpdateRequest,
) -> UserDocument:
    available = await username_is_available(
        database,
        username=payload.username,
        current_user_id=user["_id"],
    )

    if not available:
        raise (username_unavailable_error())

    now = utc_now()

    try:
        await repository.update_profile(
            database,
            user["_id"],
            display_name=payload.display_name,
            username=payload.username,
            timestamp=now,
        )

    except DuplicateKeyError as error:
        raise (username_unavailable_error()) from error

    updated = await repository.get_user_by_id(
        database,
        user["_id"],
    )

    if updated is None:
        raise RuntimeError("User disappeared during profile update")

    return updated


async def update_user_preferences(
    database: Database,
    *,
    user: UserDocument,
    payload: PreferencesUpdateRequest,
) -> UserDocument:
    await repository.update_preferences(
        database,
        user["_id"],
        fitness_goal=payload.fitness_goal,
        experience_level=payload.experience_level,
        weight_unit=payload.weight_unit,
        weekly_workout_target=payload.weekly_workout_target,
        timestamp=utc_now(),
    )

    updated = await repository.get_user_by_id(
        database,
        user["_id"],
    )

    if updated is None:
        raise RuntimeError("User disappeared during preferences update")

    return updated


async def delete_user_account(
    database: Database,
    *,
    user: UserDocument,
) -> None:
    assets = await repository.list_owned_exercise_media(
        database,
        user_id=user["_id"],
    )

    await repository.delete_user_data(
        database,
        user_id=user["_id"],
        email=user["email"],
    )

    if not assets:
        return

    try:
        await media_service.delete_owned_assets(
            user_id=str(user["_id"]),
            assets=assets,
        )

    except Exception:
        logger.exception(
            "Account %s was deleted, but Cloudinary cleanup failed.",
            user["_id"],
        )
