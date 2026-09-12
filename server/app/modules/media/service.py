import time
from typing import Any
from urllib.parse import quote

import cloudinary
import cloudinary.api
import cloudinary.utils
from anyio import to_thread

from app.core.config import settings


def configure_cloudinary() -> None:
    cloudinary.config(
        cloud_name=(settings.cloudinary_cloud_name),
        api_key=(settings.cloudinary_api_key),
        api_secret=(settings.cloudinary_api_secret.get_secret_value()),
        secure=True,
    )


def exercise_media_folder(
    user_id: str,
) -> str:
    return f"fitsync/users/{user_id}/exercise-media"


def create_upload_signature(
    *,
    user_id: str,
    resource_type: str,
) -> dict[
    str,
    Any,
]:
    timestamp = int(time.time())

    folder = exercise_media_folder(user_id)

    parameters = {
        "folder": folder,
        "timestamp": timestamp,
    }

    signature = cloudinary.utils.api_sign_request(
        parameters,
        settings.cloudinary_api_secret.get_secret_value(),
    )

    upload_url = (
        f"https://api.cloudinary.com/v1_1/{settings.cloudinary_cloud_name}/{resource_type}/upload"
    )

    return {
        "cloud_name": settings.cloudinary_cloud_name,
        "api_key": settings.cloudinary_api_key,
        "timestamp": timestamp,
        "signature": signature,
        "folder": folder,
        "resource_type": resource_type,
        "upload_url": upload_url,
    }


def _get_cloudinary_resource(
    public_id: str,
    resource_type: str,
) -> dict[
    str,
    Any,
]:
    configure_cloudinary()

    result = cloudinary.api.resource(
        public_id,
        resource_type=resource_type,
    )

    return dict(result)


async def verify_owned_asset(
    *,
    user_id: str,
    public_id: str,
    resource_type: str,
) -> dict[
    str,
    Any,
]:
    expected_prefix = exercise_media_folder(user_id) + "/"

    if not public_id.startswith(expected_prefix):
        raise ValueError("Media does not belong to this user")

    resource = await to_thread.run_sync(
        _get_cloudinary_resource,
        public_id,
        resource_type,
    )

    returned_public_id = resource.get("public_id")

    if returned_public_id != public_id:
        raise ValueError("Cloudinary asset mismatch")

    return resource


def image_delivery_url(
    public_id: str,
) -> str:
    encoded = quote(
        public_id,
        safe="/",
    )

    return (
        "https://res.cloudinary.com/"
        f"{settings.cloudinary_cloud_name}/"
        "image/upload/"
        "q_auto,f_auto/"
        f"{encoded}"
    )


def image_thumbnail_url(
    public_id: str,
) -> str:
    encoded = quote(
        public_id,
        safe="/",
    )

    return (
        "https://res.cloudinary.com/"
        f"{settings.cloudinary_cloud_name}/"
        "image/upload/"
        "w_900,h_900,c_fill,"
        "g_auto,q_auto,f_auto/"
        f"{encoded}"
    )


def video_delivery_url(
    public_id: str,
    format_name: str,
) -> str:
    encoded = quote(
        public_id,
        safe="/",
    )

    return (
        "https://res.cloudinary.com/"
        f"{settings.cloudinary_cloud_name}/"
        "video/upload/"
        "q_auto/"
        f"{encoded}."
        f"{format_name}"
    )


def video_thumbnail_url(
    public_id: str,
) -> str:
    encoded = quote(
        public_id,
        safe="/",
    )

    return (
        "https://res.cloudinary.com/"
        f"{settings.cloudinary_cloud_name}/"
        "video/upload/"
        "so_0,w_900,h_900,"
        "c_fill,g_auto,q_auto/"
        f"{encoded}.jpg"
    )


# =========================================================
# DELETION
# =========================================================


def _delete_resources(
    public_ids: list[str],
    resource_type: str,
) -> None:
    configure_cloudinary()

    cloudinary.api.delete_resources(
        public_ids,
        resource_type=resource_type,
        type="upload",
        invalidate=True,
    )


def _chunks(
    values: list[str],
    size: int = 100,
):
    for index in range(
        0,
        len(values),
        size,
    ):
        yield values[index : index + size]


async def delete_owned_assets(
    *,
    user_id: str,
    assets: list[
        tuple[
            str,
            str,
        ]
    ],
) -> None:
    """
    Delete only Cloudinary assets living under the
    authenticated user's FitSync exercise-media folder.

    Ownership is checked again here because this is
    destructive.
    """

    expected_prefix = exercise_media_folder(user_id) + "/"

    images: list[str] = []

    videos: list[str] = []

    for (
        public_id,
        media_type,
    ) in assets:
        if not public_id.startswith(expected_prefix):
            continue

        if media_type == "VIDEO":
            videos.append(public_id)

        elif media_type == "IMAGE":
            images.append(public_id)

    for batch in _chunks(images):
        await to_thread.run_sync(
            _delete_resources,
            batch,
            "image",
        )

    for batch in _chunks(videos):
        await to_thread.run_sync(
            _delete_resources,
            batch,
            "video",
        )
