from fastapi import APIRouter

from app.modules.auth.dependencies import (
    CurrentUserDep,
)
from app.modules.media.schemas import (
    UploadSignatureRequest,
    UploadSignatureResponse,
)
from app.modules.media.service import (
    create_upload_signature,
)

router = APIRouter(
    prefix="/media",
    tags=[
        "Media",
    ],
)


@router.post(
    "/upload-signature",
    response_model=UploadSignatureResponse,
)
async def create_signature(
    payload: UploadSignatureRequest,
    user: CurrentUserDep,
) -> UploadSignatureResponse:
    result = create_upload_signature(
        user_id=str(user["_id"]),
        resource_type=(payload.resource_type),
    )

    return UploadSignatureResponse(**result)
