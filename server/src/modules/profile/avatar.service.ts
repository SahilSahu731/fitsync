
import { randomUUID } from "node:crypto";
import multer from "multer";
import sharp from "sharp";

import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";

import { getFullUser } from "./profile.service.js";

const BUCKET = "profile-images";

export const uploadAvatarMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new ApiError(400, "Unsupported image format."));
      return;
    }

    callback(null, true);
  }
}).single("avatar");

export async function uploadAvatar(
  userId: string,
  file: Express.Multer.File
) {
  let optimized: Buffer;

  try {
    const image = sharp(file.buffer, {
      limitInputPixels: 25_000_000
    });

    const metadata = await image.metadata();

    if (!["jpeg", "png", "webp"].includes(metadata.format || "")) {
      throw new Error("Invalid image.");
    }

    optimized = await image
      .rotate()
      .resize(512, 512, {
        fit: "cover",
        position: "centre"
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new ApiError(400, "Invalid image file.");
  }

  const existing = await db
    .from("app_users")
    .select("avatar_path")
    .eq("id", userId)
    .single();

  checkDbError(existing.error, "find old avatar");

  const oldPath = existing.data?.avatar_path;
  const newPath = `${userId}/${randomUUID()}.webp`;

  const uploaded = await db.storage
    .from(BUCKET)
    .upload(newPath, optimized, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false
    });

  if (uploaded.error) {
    throw new ApiError(502, "Could not upload image.");
  }

  const { error } = await db
    .from("app_users")
    .update({
      avatar_path: newPath,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (error) {
    await db.storage.from(BUCKET).remove([newPath]);
    checkDbError(error, "save avatar path");
  }

  if (oldPath) {
    const removed = await db.storage
      .from(BUCKET)
      .remove([oldPath]);

    if (removed.error) {
      console.error("Avatar cleanup failed:", removed.error.message);
    }
  }

  return getFullUser(userId);
}

export async function deleteAvatar(userId: string) {
  const result = await db
    .from("app_users")
    .select("avatar_path")
    .eq("id", userId)
    .single();

  checkDbError(result.error, "find avatar");

  const path = result.data?.avatar_path;

  if (path) {
    const { error } = await db.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      throw new ApiError(502, "Could not remove image.");
    }
  }

  const { error } = await db
    .from("app_users")
    .update({
      avatar_path: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  checkDbError(error, "remove avatar");

  return getFullUser(userId);
}
