import asyncio
import sys
from pathlib import Path

from pymongo import AsyncMongoClient
from pymongo.server_api import (
    ServerApi,
)

# Direct execution puts scripts/, rather than server/, on the import path.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.modules.progress import (  # noqa: E402
    service as progress_service,
)


async def main() -> None:
    client = AsyncMongoClient(
        settings.mongodb_uri,
        tz_aware=True,
        server_api=ServerApi("1"),
    )

    try:
        database = client[settings.mongodb_database]

        cursor = (
            database["workout_sessions"]
            .find(
                {
                    "status": "COMPLETED",
                }
            )
            .sort(
                "completed_at",
                1,
            )
        )

        sessions = await cursor.to_list(length=100_000)

        print(f"Found {len(sessions)} completed workouts")

        created_total = 0

        for index, session in enumerate(
            sessions,
            start=1,
        ):
            records = await progress_service.detect_personal_records_for_workout(
                database,
                user_id=session["user_id"],
                session_id=str(session["_id"]),
            )

            created_total += len(records)

            print(
                f"[{index}/{len(sessions)}] "
                f"{session.get('name', 'Workout')} "
                f"→ {len(records)} PR events"
            )

        print(f"Created {created_total} PR events")

    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
