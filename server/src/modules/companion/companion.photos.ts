import { randomUUID } from "node:crypto";
import multer from "multer";
import sharp from "sharp";
import { db } from "../../config/supabase.js";
import { ApiError } from "../../common/errors.js";
import { cropSchema, photoSchema } from "./companion.schema.js";
import { checked } from "./companion.service.js";

export const PHOTO_BUCKET = "progress-photos";
export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 5, fieldSize: 4096 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      return callback(new ApiError(400, "Choose a JPEG, PNG, or WebP image."));
    callback(null, true);
  },
}).single("image");

/** Re-encoding strips EXIF/GPS metadata and rejects animated or oversized decoded images. */
export async function sanitizePhoto(buffer: Buffer, crop?: unknown) {
  try {
    const metadata = await sharp(buffer, { limitInputPixels: 25_000_000 }).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1)
      throw new Error("Unsupported image");
    const rotated = await sharp(buffer, { limitInputPixels: 25_000_000 }).rotate().toBuffer();
    let image = sharp(rotated, { limitInputPixels: 25_000_000 });
    if (crop !== undefined) {
      const selected = cropSchema.parse(crop);
      const size = await image.metadata();
      if (
        selected.left + selected.width > (size.width ?? 0) ||
        selected.top + selected.height > (size.height ?? 0)
      )
        throw new Error("Crop outside image");
      image = image.extract(selected);
    }
    const { data, info } = await image
      .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > 3 * 1024 * 1024) throw new Error("Optimized image too large");
    return { data, width: info.width, height: info.height };
  } catch {
    throw new ApiError(
      400,
      "This image or crop could not be processed. Choose a still JPEG, PNG, or WebP photo under 3 MB.",
    );
  }
}
async function present(row: any) {
  const result = await db.storage.from(PHOTO_BUCKET).createSignedUrl(row.storage_path, 300);
  if (result.error || !result.data?.signedUrl)
    throw new ApiError(502, "Could not open your private photo. Refresh to try again.");
  return {
    id: row.id,
    date: row.date,
    view: row.view,
    caption: row.caption,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    url: result.data.signedUrl,
    urlExpiresAt: new Date(Date.now() + 300000).toISOString(),
  };
}
export async function listPhotos(userId: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await db
      .from("companion_photos")
      .select("id,date,view,caption,width,height,storage_path,created_at")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("id")
      .range(offset, offset + 99);
    checked(result.error);
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 100) break;
  }
  // Keep signing batches bounded without silently dropping older photos.
  const result = [];
  for (let i = 0; i < rows.length; i += 20)
    result.push(...(await Promise.all(rows.slice(i, i + 20).map(present))));
  return result;
}
export async function uploadPhoto(
  userId: string,
  file: Express.Multer.File | undefined,
  body: Record<string, unknown>,
) {
  if (!file) throw new ApiError(400, "Choose an image to upload.");
  const { crop: rawCrop, ...fields } = body;
  const input = photoSchema.parse(fields);
  let crop: unknown;
  try {
    crop = rawCrop === undefined ? undefined : JSON.parse(String(rawCrop));
  } catch {
    throw new ApiError(400, "Invalid crop selection.");
  }
  const optimized = await sanitizePhoto(file.buffer, crop);
  const id = randomUUID();
  const path = `${userId}/${id}.webp`;
  const uploaded = await db.storage
    .from(PHOTO_BUCKET)
    .upload(path, optimized.data, { contentType: "image/webp", cacheControl: "0", upsert: false });
  if (uploaded.error) throw new ApiError(502, "Could not save your private photo.");
  const saved = await db
    .from("companion_photos")
    .insert({
      id,
      user_id: userId,
      ...input,
      width: optimized.width,
      height: optimized.height,
      storage_path: path,
    })
    .select("*")
    .single();
  if (saved.error) {
    await db.storage.from(PHOTO_BUCKET).remove([path]);
    checked(saved.error);
  }
  return present(saved.data);
}
export async function deletePhoto(userId: string, id: string) {
  const found = await db
    .from("companion_photos")
    .select("storage_path")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  checked(found.error);
  if (!found.data) return { deleted: true };
  const removed = await db.storage.from(PHOTO_BUCKET).remove([found.data.storage_path]);
  if (removed.error)
    throw new ApiError(502, "Could not delete the private photo. Please try again.");
  const result = await db.from("companion_photos").delete().eq("user_id", userId).eq("id", id);
  checked(result.error);
  return { deleted: true };
}
