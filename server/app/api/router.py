from fastapi import APIRouter

from app.modules.auth.router import (
    router as auth_router,
)
from app.modules.exercises.router import (
    router as exercises_router,
)
from app.modules.health.router import (
    router as health_router,
)
from app.modules.media.router import (
    router as media_router,
)
from app.modules.users.router import (
    router as users_router,
)
from app.modules.workouts.router import (
    router as workouts_router,
)


api_router = APIRouter()

api_router.include_router(
    health_router
)

api_router.include_router(
    auth_router
)

api_router.include_router(
    users_router
)

api_router.include_router(
    media_router
)

api_router.include_router(
    exercises_router
)

api_router.include_router(
    workouts_router
)