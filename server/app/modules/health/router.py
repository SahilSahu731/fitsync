from fastapi import APIRouter

from app.core.config import settings
from app.db.mongo import DatabaseDep
from app.modules.health.schemas import (
    DatabaseHealthResponse,
    HealthResponse,
)

router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="fitsync-api",
        version="0.1.0",
    )


@router.get(
    "/database",
    response_model=DatabaseHealthResponse,
)
async def database_health(
    database: DatabaseDep,
) -> DatabaseHealthResponse:
    await database.command("ping")

    return DatabaseHealthResponse(
        status="ok",
        database=settings.mongodb_database,
    )
