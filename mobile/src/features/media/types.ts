export type UploadResourceType =
  | "image"
  | "video";

export interface UploadSignature {
  cloud_name: string;

  api_key: string;

  timestamp: number;

  signature: string;

  folder: string;

  resource_type:
    UploadResourceType;

  upload_url: string;
}

export interface LocalMediaAsset {
  uri: string;

  type:
    | "image"
    | "video";

  fileName:
    | string
    | null;

  mimeType:
    | string
    | null;

  width: number;

  height: number;

  duration:
    | number
    | null;

  fileSize:
    | number
    | null;
}

export interface UploadedCloudinaryAsset {
  publicId: string;

  resourceType:
    UploadResourceType;

  format:
    | string
    | null;

  width:
    | number
    | null;

  height:
    | number
    | null;

  durationSeconds:
    | number
    | null;
}