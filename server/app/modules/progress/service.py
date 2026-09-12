"""Public progress service facade.

The implementation is split by responsibility while
routers keep the same service import surface.
"""

from app.modules.progress.activity_service import (
    activity_calendar,
)
from app.modules.progress.exercise_service import (
    exercise_progress,
    exercise_sessions,
)
from app.modules.progress.muscle_service import (
    muscle_groups,
)
from app.modules.progress.overview_service import (
    overview,
)
from app.modules.progress.preferences_service import (
    get_preferences,
    update_preferences,
)
from app.modules.progress.records_service import (
    detect_personal_records_for_workout,
    list_personal_records,
    workout_personal_records,
)

__all__ = [
    "activity_calendar",
    "detect_personal_records_for_workout",
    "exercise_progress",
    "exercise_sessions",
    "get_preferences",
    "list_personal_records",
    "muscle_groups",
    "overview",
    "update_preferences",
    "workout_personal_records",
]
