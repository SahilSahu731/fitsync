from datetime import datetime
from typing import Any, cast

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


async def get_user_by_username(
    database: Database,
    username: str,
) -> UserDocument | None:
    document = await database["users"].find_one(
        {
            "username": username,
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


async def complete_onboarding(
    database: Database,
    user_id: ObjectId,
    *,
    display_name: str,
    username: str,
    fitness_goal: str,
    experience_level: str,
    weight_unit: str,
    weekly_workout_target: int,
    timestamp: datetime,
) -> None:
    await database["users"].update_one(
        {
            "_id": user_id,
        },
        {
            "$set": {
                "display_name": display_name,
                "username": username,
                "fitness_goal": fitness_goal,
                "experience_level": experience_level,
                "weight_unit": weight_unit,
                "weekly_workout_target": weekly_workout_target,
                "onboarding_complete": True,
                "updated_at": timestamp,
                "last_seen_at": timestamp,
            }
        },
    )


async def update_profile(
    database: Database,
    user_id: ObjectId,
    *,
    display_name: str,
    username: str,
    timestamp: datetime,
) -> None:
    await database["users"].update_one(
        {
            "_id": user_id,
        },
        {
            "$set": {
                "display_name": display_name,
                "username": username,
                "updated_at": timestamp,
            }
        },
    )


async def update_preferences(
    database: Database,
    user_id: ObjectId,
    *,
    fitness_goal: str,
    experience_level: str,
    weight_unit: str,
    weekly_workout_target: int,
    timestamp: datetime,
) -> None:
    await database["users"].update_one(
        {
            "_id": user_id,
        },
        {
            "$set": {
                "fitness_goal": fitness_goal,
                "experience_level": experience_level,
                "weight_unit": weight_unit,
                "weekly_workout_target": weekly_workout_target,
                "updated_at": timestamp,
            }
        },
    )


async def update_user_profile(
    database: Database,
    user_id: ObjectId,
    *,
    display_name: str | None = None,
    avatar_url: str | None = None,
    mark_email_verified: bool = False,
    timestamp: datetime,
) -> None:
    fields: dict[str, Any] = {
        "last_seen_at": timestamp,
        "updated_at": timestamp,
    }

    if display_name is not None:
        fields["display_name"] = display_name

    if avatar_url is not None:
        fields["avatar_url"] = avatar_url

    if mark_email_verified:
        fields["email_verified"] = True

    await database["users"].update_one(
        {
            "_id": user_id,
        },
        {
            "$set": fields,
        },
    )


async def mark_email_verified(
    database: Database,
    user_id: ObjectId,
    *,
    updated_at: datetime,
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
    timestamp: datetime,
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


async def delete_user_data(
    database: Database,
    *,
    user_id: ObjectId,
    email: str,
) -> None:
    await database["refresh_tokens"].delete_many(
        {
            "user_id": user_id,
        }
    )

    await database["sessions"].delete_many(
        {
            "user_id": user_id,
        }
    )

    await database["auth_identities"].delete_many(
        {
            "user_id": user_id,
        }
    )

    await database["auth_challenges"].delete_many(
        {
            "email": email,
        }
    )

    await database["users"].delete_one(
        {
            "_id": user_id,
        }
    )
