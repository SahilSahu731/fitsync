from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)

from app.modules.users.schemas import (
    UserResponse,
)


class ClientInfo(BaseModel):
    device_name: str | None = Field(
        default=None,
        max_length=100,
    )

    platform: Literal[
        "android",
        "ios",
        "web",
        "unknown",
    ] = "unknown"


class EmailStartRequest(BaseModel):
    email: EmailStr


class EmailStartResponse(BaseModel):
    challenge_id: str

    expires_in: int

    resend_after: int


class EmailVerifyRequest(ClientInfo):
    challenge_id: str

    code: str = Field(
        pattern=r"^\d{6}$",
    )


class TokenPair(BaseModel):
    access_token: str

    refresh_token: str

    token_type: Literal["bearer"] = "bearer"

    expires_in: int


class EmailAuthResponse(BaseModel):
    user: UserResponse

    tokens: TokenPair

    is_new_user: bool


class RefreshRequest(BaseModel):
    refresh_token: str = Field(
        min_length=32,
        max_length=512,
    )


class MessageResponse(BaseModel):
    message: str


class GoogleAuthRequest(ClientInfo):
    id_token: str = Field(
        min_length=100,
        max_length=10_000,
    )


class GoogleAuthResponse(BaseModel):
    user: UserResponse

    tokens: TokenPair

    is_new_user: bool
