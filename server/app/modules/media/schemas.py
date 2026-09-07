from typing import Literal

from pydantic import BaseModel


MediaPurpose = Literal[
    "EXERCISE_MEDIA",
]

MediaResourceType = Literal[
    "image",
    "video",
]


class UploadSignatureRequest(BaseModel):
    purpose: MediaPurpose

    resource_type: MediaResourceType


class UploadSignatureResponse(BaseModel):
    cloud_name: str

    api_key: str

    timestamp: int

    signature: str

    folder: str

    resource_type: MediaResourceType

    upload_url: str