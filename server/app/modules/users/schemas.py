from datetime import datetime

from pydantic import BaseModel

from app.modules.users.models import (
    UserDocument,
)


class UserResponse(BaseModel):
    id: str

    email: str

    display_name: str | None

    username: str | None

    avatar_url: str | None

    email_verified: bool

    onboarding_complete: bool

    created_at: datetime

    @classmethod
    def from_document(
        cls,
        user: UserDocument,
    ) -> "UserResponse":
        return cls(
            id=str(user["_id"]),
            email=user["email"],
            display_name=user["display_name"],
            username=user["username"],
            avatar_url=user["avatar_url"],
            email_verified=user["email_verified"],
            onboarding_complete=user["onboarding_complete"],
            created_at=user["created_at"],
        )
