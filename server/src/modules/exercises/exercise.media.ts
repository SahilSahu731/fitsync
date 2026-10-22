
import multer from "multer";
import sharp from "sharp";

import { cloudinary } from "../../config/cloudinary.js";
import { db } from "../../config/supabase.js";
import { ApiError } from "../../common/errors.js";

const IMAGE_BUCKET = "exercise-images";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

export type StoredExerciseMedia = {
  kind: "image" | "video";
  provider: "supabase" | "cloudinary";
  path: string;
  url: string | null;
};

export const exerciseUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 1
  },

  fileFilter: (_req, file, callback) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4"
    ];

    if (!allowed.includes(file.mimetype)) {
      callback(
        new ApiError(
          400,
          "Upload a JPEG, PNG, WebP, GIF image or an MP4 video."
        )
      );
      return;
    }

    callback(null, true);
  }
}).single("media");

async function uploadImage(
  exerciseId: string,
  file: Express.Multer.File
): Promise<StoredExerciseMedia> {
  let buffer: Buffer;

  try {
    const image = sharp(file.buffer, {
      limitInputPixels: 25_000_000,
      animated: true
    });

    const info = await image.metadata();

    if (!["jpeg", "png", "webp", "gif"].includes(info.format || "")) {
      throw new Error("Unsupported image");
    }

    buffer = await image
      .rotate()
      .resize({
        width: 1000,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new ApiError(400, "Invalid image file.");
  }

  if (buffer.length > 3 * 1024 * 1024) {
    throw new ApiError(413, "Processed image is too large.");
  }

  return uploadToCloudinary(exerciseId, buffer, "image");
}

async function uploadToCloudinary(
  exerciseId: string,
  buffer: Buffer,
  kind: "image" | "video"
): Promise<StoredExerciseMedia> {
  const result = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: kind, folder: `fitsync/exercises/${exerciseId}`, overwrite: false },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Cloudinary returned no upload."));
          return;
        }
        resolve(uploaded);
      }
    );
    stream.end(buffer);
  }).catch(() => {
    throw new ApiError(502, "Cloudinary media upload failed. Please try again.");
  });
  return { kind, provider: "cloudinary", path: result.public_id, url: result.secure_url };
}

async function uploadVideo(
  exerciseId: string,
  file: Express.Multer.File
): Promise<StoredExerciseMedia> {
  // Basic MP4 signature check.
  if (
    file.buffer.length < 12 ||
    file.buffer.toString("ascii", 4, 8) !== "ftyp"
  ) {
    throw new ApiError(400, "Invalid MP4 video.");
  }

  return uploadToCloudinary(exerciseId, file.buffer, "video");
}

export async function uploadExerciseAsset(
  exerciseId: string,
  file: Express.Multer.File
): Promise<StoredExerciseMedia> {
  if (file.mimetype === "video/mp4") {
    return uploadVideo(exerciseId, file);
  }

  return uploadImage(exerciseId, file);
}

export async function deleteStoredExerciseMedia(
  media: Pick<
    StoredExerciseMedia,
    "provider" | "path" | "kind"
  >
) {
  if (media.provider === "cloudinary") {
    const result = await cloudinary.uploader.destroy(
      media.path,
      {
        resource_type: media.kind,
        invalidate: true
      }
    );

    if (!["ok", "not found"].includes(result.result)) {
      throw new Error("Cloudinary deletion failed.");
    }

    return;
  }

  const { error } = await db.storage
    .from(IMAGE_BUCKET)
    .remove([media.path]);

  if (error) {
    throw error;
  }
}
