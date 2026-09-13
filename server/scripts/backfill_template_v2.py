import asyncio
import sys
from pathlib import Path

from pymongo import AsyncMongoClient
from pymongo.server_api import ServerApi

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402


async def main():
    client = AsyncMongoClient(
        settings.mongodb_uri,
        tz_aware=True,
        server_api=ServerApi("1"),
    )
    try:
        database = client[settings.mongodb_database]
        templates = database["workout_templates"]
        users = await templates.distinct("user_id")
        updated = 0

        for user_id in users:
            cursor = templates.find({"user_id": user_id}).sort("created_at", 1)
            position = 0
            async for template in cursor:
                fields = {}
                if not template.get("client_template_id"):
                    fields["client_template_id"] = str(template["_id"])
                if "revision" not in template:
                    fields["revision"] = 1
                if "is_favorite" not in template:
                    fields["is_favorite"] = False
                if "folder_id" not in template:
                    fields["folder_id"] = None
                if "position" not in template:
                    fields["position"] = position
                if fields:
                    await templates.update_one({"_id": template["_id"]}, {"$set": fields})
                    updated += 1
                position += 1

        print(f"Template V2 backfill: {updated} updated")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
