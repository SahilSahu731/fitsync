from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Request
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.server_api import ServerApi

from app.core.config import settings

Document = dict[str, Any]
Database = AsyncDatabase[Document]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    client: AsyncMongoClient[Document] = AsyncMongoClient(
        settings.mongodb_uri,
        server_api=ServerApi("1"),
    )

    try:
        await client.admin.command("ping")

        app.state.mongo_client = client
        app.state.db = client[settings.mongodb_database]

        yield
    finally:
        await client.close()


def get_database(request: Request) -> Database:
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
