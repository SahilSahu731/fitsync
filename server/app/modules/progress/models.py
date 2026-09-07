from datetime import datetime
from typing import TypedDict

from bson import ObjectId

from app.modules.progress.constants import (
    PersonalRecordType,
)


class PersonalRecordDocument(TypedDict):
    _id: ObjectId

    user_id: ObjectId

    exercise_id: ObjectId

    workout_session_id: ObjectId

    set_id: str

    record_type: PersonalRecordType

    value: float

    weight_kg: float

    reps: int

    estimated_1rm_kg: float | None

    set_volume_kg: float | None

    created_at: datetime
