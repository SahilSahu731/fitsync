from fastapi import (
    APIRouter,
)

from app.db.mongo import (
    DatabaseDep,
)
from app.modules.auth.dependencies import (
    CurrentUserDep,
)
from app.modules.users import (
    repository,
    service,
)
from app.modules.users.schemas import (
    DeleteAccountRequest,
    MessageResponse,
    OnboardingRequest,
    PreferencesUpdateRequest,
    ProfileUpdateRequest,
    UsernameAvailabilityResponse,
    UserResponse,
)

router = APIRouter(
    prefix="/users",
    tags=[
        "Users",
    ],
)


@router.get(
    "/usernames/{username}/availability",
    response_model=(UsernameAvailabilityResponse),
)
async def username_availability(
    username: str,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> UsernameAvailabilityResponse:
    normalized = username.strip().lower()

    available = await service.username_is_available(
        database,
        username=normalized,
        current_user_id=(user["_id"]),
    )

    return UsernameAvailabilityResponse(
        username=normalized,
        available=available,
    )


@router.patch(
    "/me/onboarding",
    response_model=UserResponse,
)
async def complete_onboarding(
    payload: OnboardingRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> UserResponse:
    updated = await service.complete_user_onboarding(
        database,
        user=user,
        payload=payload,
    )

    return UserResponse.from_document(updated)


@router.patch(
    "/me/profile",
    response_model=UserResponse,
)
async def update_profile(
    payload: ProfileUpdateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> UserResponse:
    updated = await service.update_user_profile_details(
        database,
        user=user,
        payload=payload,
    )

    return UserResponse.from_document(updated)


@router.patch(
    "/me/preferences",
    response_model=UserResponse,
)
async def update_preferences(
    payload: PreferencesUpdateRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> UserResponse:
    updated = await service.update_user_preferences(
        database,
        user=user,
        payload=payload,
    )

    return UserResponse.from_document(updated)


@router.delete(
    "/me",
    response_model=MessageResponse,
)
async def delete_account(
    payload: DeleteAccountRequest,
    database: DatabaseDep,
    user: CurrentUserDep,
) -> MessageResponse:
    await repository.delete_user_data(
        database,
        user_id=user["_id"],
        email=user["email"],
    )

    return MessageResponse(message=("Account deleted successfully"))
