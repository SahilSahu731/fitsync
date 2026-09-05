from datetime import datetime
from typing import TypedDict

from bson import ObjectId


class UserDocument(TypedDict):
    _id: ObjectId

    email: str

    display_name: str | None

    username: str | None

    avatar_url: str | None

    email_verified: bool

    onboarding_complete: bool

    created_at: datetime

    updated_at: datetime

    last_seen_at: datetime
