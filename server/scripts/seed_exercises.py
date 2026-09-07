import asyncio
import sys
from datetime import (
    UTC,
    datetime,
)
from pathlib import Path

from pymongo import AsyncMongoClient
from pymongo.server_api import (
    ServerApi,
)

# Direct script execution adds scripts/, rather than server/, to sys.path.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.modules.exercises.schemas import (  # noqa: E402
    normalize_exercise_name,
)

EXERCISES = [
    {
        "name": "Barbell Bench Press",
        "description": "Horizontal barbell press for chest, triceps and anterior delts.",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [
            "TRICEPS",
            "FRONT_DELTS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PUSH",
        "instructions": [
            "Set your shoulder blades back and down.",
            "Lower the bar under control toward the lower chest.",
            "Press the bar upward while maintaining your upper-back position.",
        ],
        "tips": [
            "Keep your feet planted.",
            "Avoid excessively flaring your elbows.",
        ],
    },
    {
        "name": "Incline Barbell Bench Press",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [
            "FRONT_DELTS",
            "TRICEPS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PUSH",
    },
    {
        "name": "Dumbbell Bench Press",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [
            "TRICEPS",
            "FRONT_DELTS",
        ],
        "equipment": ["DUMBBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PUSH",
    },
    {
        "name": "Incline Dumbbell Press",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [
            "FRONT_DELTS",
            "TRICEPS",
        ],
        "equipment": ["DUMBBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PUSH",
    },
    {
        "name": "Machine Chest Press",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [
            "TRICEPS",
            "FRONT_DELTS",
        ],
        "equipment": ["MACHINE"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PUSH",
    },
    {
        "name": "Cable Fly",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [],
        "equipment": ["CABLE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "HORIZONTAL_PUSH",
    },
    {
        "name": "Pec Deck",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [],
        "equipment": ["MACHINE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "HORIZONTAL_PUSH",
    },
    {
        "name": "Push-Up",
        "primary_muscles": ["CHEST"],
        "secondary_muscles": [
            "TRICEPS",
            "FRONT_DELTS",
        ],
        "equipment": ["BODYWEIGHT"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PUSH",
    },
    {
        "name": "Pull-Up",
        "primary_muscles": ["LATS"],
        "secondary_muscles": [
            "BICEPS",
            "BACK",
        ],
        "equipment": ["BODYWEIGHT"],
        "mechanic": "COMPOUND",
        "movement_pattern": "VERTICAL_PULL",
    },
    {
        "name": "Chin-Up",
        "primary_muscles": ["LATS"],
        "secondary_muscles": [
            "BICEPS",
            "BACK",
        ],
        "equipment": ["BODYWEIGHT"],
        "mechanic": "COMPOUND",
        "movement_pattern": "VERTICAL_PULL",
    },
    {
        "name": "Lat Pulldown",
        "primary_muscles": ["LATS"],
        "secondary_muscles": [
            "BICEPS",
            "BACK",
        ],
        "equipment": ["CABLE"],
        "mechanic": "COMPOUND",
        "movement_pattern": "VERTICAL_PULL",
    },
    {
        "name": "Barbell Row",
        "primary_muscles": ["BACK"],
        "secondary_muscles": [
            "LATS",
            "BICEPS",
            "REAR_DELTS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PULL",
    },
    {
        "name": "One-Arm Dumbbell Row",
        "primary_muscles": ["BACK"],
        "secondary_muscles": [
            "LATS",
            "BICEPS",
        ],
        "equipment": ["DUMBBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PULL",
    },
    {
        "name": "Chest-Supported Row",
        "primary_muscles": ["BACK"],
        "secondary_muscles": [
            "LATS",
            "BICEPS",
            "REAR_DELTS",
        ],
        "equipment": [
            "MACHINE",
        ],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PULL",
    },
    {
        "name": "Seated Cable Row",
        "primary_muscles": ["BACK"],
        "secondary_muscles": [
            "LATS",
            "BICEPS",
        ],
        "equipment": ["CABLE"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HORIZONTAL_PULL",
    },
    {
        "name": "Face Pull",
        "primary_muscles": ["REAR_DELTS"],
        "secondary_muscles": [
            "TRAPS",
            "BACK",
        ],
        "equipment": ["CABLE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "HORIZONTAL_PULL",
    },
    {
        "name": "Barbell Overhead Press",
        "primary_muscles": ["SHOULDERS"],
        "secondary_muscles": [
            "TRICEPS",
            "FRONT_DELTS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "VERTICAL_PUSH",
    },
    {
        "name": "Dumbbell Shoulder Press",
        "primary_muscles": ["SHOULDERS"],
        "secondary_muscles": [
            "TRICEPS",
        ],
        "equipment": ["DUMBBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "VERTICAL_PUSH",
    },
    {
        "name": "Dumbbell Lateral Raise",
        "primary_muscles": ["SIDE_DELTS"],
        "secondary_muscles": [],
        "equipment": ["DUMBBELL"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Cable Lateral Raise",
        "primary_muscles": ["SIDE_DELTS"],
        "secondary_muscles": [],
        "equipment": ["CABLE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Reverse Pec Deck",
        "primary_muscles": ["REAR_DELTS"],
        "secondary_muscles": [
            "TRAPS",
        ],
        "equipment": ["MACHINE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "HORIZONTAL_PULL",
    },
    {
        "name": "Barbell Curl",
        "primary_muscles": ["BICEPS"],
        "secondary_muscles": [
            "FOREARMS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Dumbbell Curl",
        "primary_muscles": ["BICEPS"],
        "secondary_muscles": [],
        "equipment": ["DUMBBELL"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Hammer Curl",
        "primary_muscles": ["BICEPS"],
        "secondary_muscles": [
            "FOREARMS",
        ],
        "equipment": ["DUMBBELL"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Cable Curl",
        "primary_muscles": ["BICEPS"],
        "secondary_muscles": [],
        "equipment": ["CABLE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Preacher Curl",
        "primary_muscles": ["BICEPS"],
        "secondary_muscles": [],
        "equipment": [
            "EZ_BAR",
            "MACHINE",
        ],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Triceps Pushdown",
        "primary_muscles": ["TRICEPS"],
        "secondary_muscles": [],
        "equipment": ["CABLE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Overhead Triceps Extension",
        "primary_muscles": ["TRICEPS"],
        "secondary_muscles": [],
        "equipment": [
            "CABLE",
        ],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "EZ-Bar Skull Crusher",
        "primary_muscles": ["TRICEPS"],
        "secondary_muscles": [],
        "equipment": ["EZ_BAR"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Back Squat",
        "primary_muscles": ["QUADS"],
        "secondary_muscles": [
            "GLUTES",
            "HAMSTRINGS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "SQUAT",
    },
    {
        "name": "Front Squat",
        "primary_muscles": ["QUADS"],
        "secondary_muscles": [
            "GLUTES",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "SQUAT",
    },
    {
        "name": "Hack Squat",
        "primary_muscles": ["QUADS"],
        "secondary_muscles": [
            "GLUTES",
        ],
        "equipment": ["MACHINE"],
        "mechanic": "COMPOUND",
        "movement_pattern": "SQUAT",
    },
    {
        "name": "Leg Press",
        "primary_muscles": ["QUADS"],
        "secondary_muscles": [
            "GLUTES",
            "HAMSTRINGS",
        ],
        "equipment": ["MACHINE"],
        "mechanic": "COMPOUND",
        "movement_pattern": "SQUAT",
    },
    {
        "name": "Bulgarian Split Squat",
        "primary_muscles": ["QUADS"],
        "secondary_muscles": [
            "GLUTES",
            "HAMSTRINGS",
        ],
        "equipment": ["DUMBBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "LUNGE",
    },
    {
        "name": "Walking Lunge",
        "primary_muscles": ["QUADS"],
        "secondary_muscles": [
            "GLUTES",
            "HAMSTRINGS",
        ],
        "equipment": [
            "DUMBBELL",
        ],
        "mechanic": "COMPOUND",
        "movement_pattern": "LUNGE",
    },
    {
        "name": "Leg Extension",
        "primary_muscles": ["QUADS"],
        "secondary_muscles": [],
        "equipment": ["MACHINE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Romanian Deadlift",
        "primary_muscles": ["HAMSTRINGS"],
        "secondary_muscles": [
            "GLUTES",
            "LOWER_BACK",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HINGE",
    },
    {
        "name": "Conventional Deadlift",
        "primary_muscles": [
            "HAMSTRINGS",
            "GLUTES",
        ],
        "secondary_muscles": [
            "LOWER_BACK",
            "BACK",
            "TRAPS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HINGE",
    },
    {
        "name": "Seated Leg Curl",
        "primary_muscles": ["HAMSTRINGS"],
        "secondary_muscles": [],
        "equipment": ["MACHINE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Lying Leg Curl",
        "primary_muscles": ["HAMSTRINGS"],
        "secondary_muscles": [],
        "equipment": ["MACHINE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Barbell Hip Thrust",
        "primary_muscles": ["GLUTES"],
        "secondary_muscles": [
            "HAMSTRINGS",
        ],
        "equipment": ["BARBELL"],
        "mechanic": "COMPOUND",
        "movement_pattern": "HINGE",
    },
    {
        "name": "Standing Calf Raise",
        "primary_muscles": ["CALVES"],
        "secondary_muscles": [],
        "equipment": ["MACHINE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Seated Calf Raise",
        "primary_muscles": ["CALVES"],
        "secondary_muscles": [],
        "equipment": ["MACHINE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "OTHER",
    },
    {
        "name": "Cable Crunch",
        "primary_muscles": ["ABS"],
        "secondary_muscles": [],
        "equipment": ["CABLE"],
        "mechanic": "ISOLATION",
        "movement_pattern": "CORE",
    },
    {
        "name": "Hanging Leg Raise",
        "primary_muscles": ["ABS"],
        "secondary_muscles": [],
        "equipment": ["BODYWEIGHT"],
        "mechanic": "ISOLATION",
        "movement_pattern": "CORE",
    },
    {
        "name": "Plank",
        "primary_muscles": ["ABS"],
        "secondary_muscles": [
            "OBLIQUES",
        ],
        "equipment": ["BODYWEIGHT"],
        "mechanic": "ISOLATION",
        "movement_pattern": "CORE",
    },
    {
        "name": "Ab Wheel Rollout",
        "primary_muscles": ["ABS"],
        "secondary_muscles": [],
        "equipment": ["OTHER"],
        "mechanic": "COMPOUND",
        "movement_pattern": "CORE",
    },
]


async def main() -> None:
    client = AsyncMongoClient(
        settings.mongodb_uri,
        server_api=ServerApi("1"),
        tz_aware=True,
    )

    try:
        database = client[settings.mongodb_database]

        now = datetime.now(UTC)

        for raw in EXERCISES:
            name = raw["name"]

            fields = {
                "source": "SYSTEM",
                "owner_user_id": None,
                "name": name,
                "normalized_name": normalize_exercise_name(name),
                "description": raw.get("description"),
                "primary_muscles": raw["primary_muscles"],
                "secondary_muscles": raw.get(
                    "secondary_muscles",
                    [],
                ),
                "equipment": raw.get(
                    "equipment",
                    [],
                ),
                "mechanic": raw["mechanic"],
                "movement_pattern": raw["movement_pattern"],
                "instructions": raw.get(
                    "instructions",
                    [],
                ),
                "tips": raw.get(
                    "tips",
                    [],
                ),
                "is_archived": False,
                "updated_at": now,
            }

            await database["exercises"].update_one(
                {
                    "source": "SYSTEM",
                    "normalized_name": fields["normalized_name"],
                },
                {
                    "$set": fields,
                    "$setOnInsert": {
                        "media": [],
                        "created_at": now,
                    },
                },
                upsert=True,
            )

            print(f"Seeded: {name}")

    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
