import asyncio
import sys
from pathlib import Path

from pymongo import AsyncMongoClient
from pymongo.server_api import ServerApi

# Direct execution puts scripts/, rather than server/, on the import path.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402

TRACKING_OVERRIDES = {
    "pull-up": "BODYWEIGHT_REPS",
    "pull up": "BODYWEIGHT_REPS",
    "chin-up": "BODYWEIGHT_REPS",
    "chin up": "BODYWEIGHT_REPS",
    "push-up": "BODYWEIGHT_REPS",
    "push up": "BODYWEIGHT_REPS",
    "dip": "BODYWEIGHT_REPS",
    "assisted pull-up": "ASSISTED_REPS",
    "assisted pull up": "ASSISTED_REPS",
    "assisted dip": "ASSISTED_REPS",
    "plank": "DURATION",
    "dead hang": "DURATION",
    "wall sit": "DURATION",
    "running": "DISTANCE_DURATION",
    "walking": "DISTANCE_DURATION",
    "cycling": "DISTANCE_DURATION",
    "rowing": "DISTANCE_DURATION",
    "farmer's carry": "WEIGHT_DISTANCE",
    "farmers carry": "WEIGHT_DISTANCE",
    "sled push": "WEIGHT_DISTANCE",
    "sled pull": "WEIGHT_DISTANCE",
}


async def main():
    client = AsyncMongoClient(
        settings.mongodb_uri,
        tz_aware=True,
        server_api=ServerApi("1"),
    )

    database = client[settings.mongodb_database]

    collection = database["exercises"]

    cursor = collection.find({})

    updated = 0

    async for exercise in cursor:
        normalized_name = (
            exercise.get("normalized_name")
            or exercise.get(
                "name",
                "",
            )
            .strip()
            .lower()
        )

        tracking_type = (
            exercise.get("tracking_type")
            or TRACKING_OVERRIDES.get(normalized_name)
            or "WEIGHT_REPS"
        )

        mechanic = exercise.get(
            "mechanic",
            "ISOLATION",
        )

        default_rest = exercise.get("default_rest_seconds") or (
            180 if mechanic == "COMPOUND" else 90
        )

        fields = {
            "tracking_type": tracking_type,
            "laterality": exercise.get(
                "laterality",
                "BILATERAL",
            ),
            "load_mode": exercise.get(
                "load_mode",
                "TOTAL",
            ),
            "default_rest_seconds": default_rest,
        }

        result = await collection.update_one(
            {"_id": exercise["_id"]},
            {"$set": fields},
        )

        if result.modified_count:
            updated += 1

    print(f"Exercise tracking backfill complete: {updated} updated")

    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
