from typing import Any

from pymongo import IndexModel
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.errors import OperationFailure


async def ensure_index(
    collection: AsyncCollection[dict[str, Any]],
    keys: str | list[tuple[str, int]],
    **options: Any,
) -> None:
    """Reuse equivalent indexes with legacy names without weakening constraints."""
    try:
        await collection.create_index(keys, **options)
    except OperationFailure as error:
        if error.code != 85:
            raise

        expected = dict(IndexModel(keys, **options).document)
        indexes = await collection.index_information()

        def definition(index: dict[str, Any]) -> dict[str, Any]:
            result = dict(index)
            key = result.pop("key")
            result["key"] = list(key.items()) if isinstance(key, dict) else list(key)
            # Server metadata and build options do not change index semantics.
            for field in ("name", "v", "ns", "background"):
                result.pop(field, None)
            for field in ("unique", "sparse", "hidden"):
                if result.get(field) is False:
                    result.pop(field)
            return result

        if not any(definition(index) == definition(expected) for index in indexes.values()):
            raise
