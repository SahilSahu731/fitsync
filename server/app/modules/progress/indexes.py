from typing import Any

from pymongo import (
    ASCENDING,
    DESCENDING,
)
from pymongo.asynchronous.database import (
    AsyncDatabase,
)

from app.db.index_utils import ensure_index


async def ensure_progress_indexes(
    database: AsyncDatabase[dict[str, Any]],
) -> None:
    records = database["personal_records"]

    sessions = database["workout_sessions"]

    await ensure_index(
        records,
        [
            (
                "workout_session_id",
                ASCENDING,
            ),
            (
                "set_id",
                ASCENDING,
            ),
            (
                "record_type",
                ASCENDING,
            ),
        ],
        unique=True,
        name=("uq_personal_record_event"),
    )

    await ensure_index(
        records,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "created_at",
                DESCENDING,
            ),
        ],
        name=("idx_records_user_recent"),
    )

    await ensure_index(
        records,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "exercise_id",
                ASCENDING,
            ),
            (
                "record_type",
                ASCENDING,
            ),
            (
                "value",
                DESCENDING,
            ),
        ],
        name=("idx_records_exercise_best"),
    )

    await ensure_index(
        sessions,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "status",
                ASCENDING,
            ),
            (
                "completed_at",
                DESCENDING,
            ),
        ],
        name=("idx_progress_completed"),
    )

    await ensure_index(
        sessions,
        [
            (
                "user_id",
                ASCENDING,
            ),
            (
                "status",
                ASCENDING,
            ),
            (
                "exercises.exercise_id",
                ASCENDING,
            ),
            (
                "completed_at",
                DESCENDING,
            ),
        ],
        name=("idx_progress_exercise"),
    )
