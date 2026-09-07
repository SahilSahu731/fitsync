import {
  apiClient,
} from "@/lib/api/client";

import type {
  UploadResourceType,
  UploadSignature,
} from "./types";


export async function getUploadSignature(
  resourceType: UploadResourceType,
): Promise<UploadSignature> {
  const response =
    await apiClient.post<UploadSignature>(
      "/media/upload-signature",
      {
        purpose:
          "EXERCISE_MEDIA",

        resource_type:
          resourceType,
      },
    );

  return response.data;
}