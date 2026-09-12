"""Repair duplicate active workouts.

Older FitSync development data may
contain more than one IN_PROGRESS
workout for a user.

Phase 0 adds a partial unique index
that makes this impossible.

Run this script once before starting
the backend after adding that index.
"""

import asyncio
import sys
from datetime import (
    UTC,
    datetime,
)
from pathlib import Path

from pymongo import (
    AsyncMongoClient,
)
from pymongo.server_api import (
    ServerApi,
)

if __package__ in (
    None,
    "",
):
    sys.path.insert(
        0,
        str(Path(__file__).resolve().parents[1]),
    )


from app.core.config import (  # noqa: E402
    settings,
)


async def main() -> None:
    client = AsyncMongoClient(
        settings.mongodb_uri,
        tz_aware=True,
        server_api=ServerApi("1"),
    )

    try:
        database = client[settings.mongodb_database]

        collection = database["workout_sessions"]

        cursor = await collection.aggregate(
            [
                {
                    "$match": {
                        "status": "IN_PROGRESS",
                    }
                },
                {
                    "$sort": {
                        "updated_at": -1,
                        "started_at": -1,
                        "_id": -1,
                    }
                },
                {
                    "$group": {
                        "_id": "$user_id",
                        "session_ids": {
                            "$push": "$_id",
                        },
                        "count": {
                            "$sum": 1,
                        },
                    }
                },
                {
                    "$match": {
                        "count": {
                            "$gt": 1,
                        },
                    }
                },
            ]
        )
        duplicates = await cursor.to_list(length=None)

        if not duplicates:
            print("No duplicate active workouts found.")

            return

        now = datetime.now(UTC)

        repaired = 0

        for duplicate in duplicates:
            keep_id = duplicate["session_ids"][0]

            cancel_ids = duplicate["session_ids"][1:]

            result = await collection.update_many(
                {
                    "_id": {
                        "$in": cancel_ids,
                    },
                    "status": "IN_PROGRESS",
                },
                {
                    "$set": {
                        "status": "CANCELLED",
                        "cancelled_at": now,
                        "updated_at": now,
                    },
                    "$inc": {
                        "revision": 1,
                    },
                },
            )

            repaired += result.modified_count

            print(
                f"User "
                f"{duplicate['_id']}: "
                f"kept {keep_id}; "
                f"cancelled "
                f"{result.modified_count} "
                f"older workout(s)."
            )

        print(f"Repaired {repaired} duplicate active workout(s).")

    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
