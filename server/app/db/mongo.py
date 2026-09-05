from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Request
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.server_api import ServerApi

from app.core.config import settings
from app.db.indexes import ensure_indexes

Document = dict[str, Any]

Database = AsyncDatabase[Document]


@asynccontextmanager
async def lifespan(
    app: FastAPI,
) -> AsyncIterator[None]:
    client: AsyncMongoClient[Document] = AsyncMongoClient(
        settings.mongodb_uri,
        tz_aware=True,
        server_api=ServerApi(
            "1",
            strict=True,
            deprecation_errors=True,
        ),
    )

    try:
        await client.admin.command("ping")

        database = client[settings.mongodb_database]

        await ensure_indexes(database)

        app.state.mongo_client = client

        app.state.db = database

        yield

    finally:
        await client.close()


def get_database(
    request: Request,
) -> Database:
    database: Database | None = getattr(
        request.app.state,
        "db",
        None,
    )

    if database is None:
        raise RuntimeError("MongoDB has not been initialized")

    return database


DatabaseDep = Annotated[
    Database,
    Depends(get_database),
]
