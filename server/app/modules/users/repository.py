from typing import cast

from bson import ObjectId

from app.db.mongo import Database
from app.modules.users.models import (
    UserDocument,
)


async def get_user_by_id(
    database: Database,
    user_id: ObjectId,
) -> UserDocument | None:
    document = await database["users"].find_one(
        {
            "_id": user_id,
        }
    )

    return cast(
        UserDocument | None,
        document,
    )


async def get_user_by_email(
    database: Database,
    email: str,
) -> UserDocument | None:
    document = await database["users"].find_one(
        {
            "email": email,
        }
    )

    return cast(
        UserDocument | None,
        document,
    )


async def insert_user(
    database: Database,
    user: UserDocument,
) -> None:
    await database["users"].insert_one(user)


async def mark_email_verified(
    database: Database,
    user_id: ObjectId,
    *,
    updated_at,
) -> None:
    await database["users"].update_one(
        {
            "_id": user_id,
        },
        {
            "$set": {
                "email_verified": True,
                "updated_at": updated_at,
                "last_seen_at": updated_at,
            }
        },
    )


async def update_last_seen(
    database: Database,
    user_id: ObjectId,
    *,
    timestamp,
) -> None:
    await database["users"].update_one(
        {
            "_id": user_id,
        },
        {
            "$set": {
                "last_seen_at": timestamp,
            }
        },
    )
