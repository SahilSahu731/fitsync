import {
  getUploadSignature,
} from "./api";

import type {
  LocalMediaAsset,
  UploadedCloudinaryAsset,
} from "./types";


interface CloudinaryUploadResponse {
  public_id: string;

  resource_type:
    "image" | "video";

  format?: string;

  width?: number;

  height?: number;

  duration?: number;
}


interface UploadOptions {
  onProgress?: (
    progress: number,
  ) => void;
}


export async function uploadMediaAsset(
  asset: LocalMediaAsset,
  options: UploadOptions = {},
): Promise<UploadedCloudinaryAsset> {
  const resourceType =
    asset.type;

  const signature =
    await getUploadSignature(
      resourceType,
    );

  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open(
        "POST",
        signature.upload_url,
      );

      xhr.upload.onprogress = (
        event,
      ) => {
        if (
          !event.lengthComputable
        ) {
          return;
        }

        const progress =
          event.loaded /
          event.total;

        options
          .onProgress
          ?.(
            progress,
          );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            "Media upload failed.",
          ),
        );
      };

      xhr.onload = () => {
        if (
          xhr.status < 200 ||
          xhr.status >= 300
        ) {
          reject(
            new Error(
              "Cloudinary rejected the upload.",
            ),
          );

          return;
        }

        try {
          const result =
            JSON.parse(
              xhr.responseText,
            ) as
              CloudinaryUploadResponse;

          resolve({
            publicId:
              result.public_id,

            resourceType:
              result.resource_type,

            format:
              result.format ??
              null,

            width:
              result.width ??
              null,

            height:
              result.height ??
              null,

            durationSeconds:
              result.duration ??
              null,
          });
        } catch {
          reject(
            new Error(
              "Invalid media upload response.",
            ),
          );
        }
      };

      const data =
        new FormData();

      data.append(
        "file",
        {
          uri:
            asset.uri,

          name:
            asset.fileName ??
            (
              asset.type ===
              "video"
                ? "exercise.mp4"
                : "exercise.jpg"
            ),

          type:
            asset.mimeType ??
            (
              asset.type ===
              "video"
                ? "video/mp4"
                : "image/jpeg"
            ),
        } as never,
      );

      data.append(
        "api_key",
        signature.api_key,
      );

      data.append(
        "timestamp",
        String(
          signature.timestamp,
        ),
      );

      data.append(
        "signature",
        signature.signature,
      );

      data.append(
        "folder",
        signature.folder,
      );

      xhr.send(
        data,
      );
    },
  );
}