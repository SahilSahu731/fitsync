import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";
import sharp from "sharp";
import type { Request, Response } from "express";

// Deliberately fake credentials: these tests never contact a live service.
Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test"
});
const { db } = await import("../src/config/supabase.js");
const { cloudinary } = await import("../src/config/cloudinary.js");
const { requireAdmin } = await import("../src/middleware/admin.js");
const { requireAuth } = await import("../src/middleware/auth.js");
const { uploadExerciseAsset, deleteStoredExerciseMedia } = await import("../src/modules/exercises/exercise.media.js");
const { ApiError } = await import("../src/common/errors.js");

function file(buffer: Buffer, mimetype: string) { return { buffer, mimetype } as Express.Multer.File; }

test("unauthenticated exercise requests are rejected", async () => {
  let failure: unknown;
  await requireAuth({ headers: {} } as Request, {} as Response, error => { failure = error; });
  assert.ok(failure instanceof ApiError);
  assert.equal(failure.status, 401);
});

test("only database-assigned admins can manage exercises", async t => {
  let role = "user";
  t.mock.method(db, "from", () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role }, error: null }) }) }) }));
  const request = { auth: { userId: "user-id", sessionId: "session-id" } } as unknown as Request;
  let failure: unknown;
  await requireAdmin(request, {} as Response, error => { failure = error; });
  assert.ok(failure instanceof ApiError);
  assert.equal(failure.status, 403);
  role = "admin";
  failure = "not-called";
  await requireAdmin(request, {} as Response, error => { failure = error; });
  assert.equal(failure, undefined);
});

test("new images use Cloudinary and GIF frames remain animated", async t => {
  let resourceType: string | undefined;
  let uploaded: Buffer = Buffer.alloc(0);
  t.mock.method(cloudinary.uploader, "upload_stream", (options: { resource_type: string }, callback: Function) => {
    resourceType = options.resource_type;
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => { uploaded = Buffer.concat(chunks); callback(null, { public_id: "fitsync/exercises/test/image", secure_url: "https://res.cloudinary.com/test/image.webp" }); });
    return stream;
  });
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "blue" } }).png().toBuffer();
  const result = await uploadExerciseAsset("test", file(png, "image/png"));
  assert.equal(result.provider, "cloudinary"); assert.equal(result.kind, "image"); assert.equal(resourceType, "image");
  assert.equal((await sharp(uploaded).metadata()).format, "webp");
  // Two distinct frames, stacked vertically with an explicit page height.
  const pixels = Buffer.concat([Buffer.alloc(4 * 4 * 3, 0), Buffer.alloc(4 * 4 * 3, 255)]);
  const gif = await sharp(pixels, { raw: { width: 4, height: 8, channels: 3, pageHeight: 4 } }).gif({ delay: [100, 100], loop: 0 }).toBuffer();
  assert.equal((await sharp(gif, { animated: true }).metadata()).pages, 2);
  await uploadExerciseAsset("test", file(gif, "image/gif"));
  assert.equal((await sharp(uploaded, { animated: true }).metadata()).pages, 2);
});

test("invalid image and MP4 payloads are rejected before upload", async t => {
  const upload = t.mock.method(cloudinary.uploader, "upload_stream", () => { throw new Error("should not upload"); });
  await assert.rejects(uploadExerciseAsset("test", file(Buffer.from("not an image"), "image/png")), /Invalid image file/);
  await assert.rejects(uploadExerciseAsset("test", file(Buffer.alloc(16), "video/mp4")), /Invalid MP4/);
  assert.equal(upload.mock.callCount(), 0);
});

test("Cloudinary deletion uses the correct resource type for both media kinds", async t => {
  const types: string[] = [];
  t.mock.method(cloudinary.uploader, "destroy", async (_path: string, options: { resource_type: string }) => { types.push(options.resource_type); return { result: "ok" }; });
  await deleteStoredExerciseMedia({ provider: "cloudinary", path: "test/photo", kind: "image" });
  await deleteStoredExerciseMedia({ provider: "cloudinary", path: "test/video", kind: "video" });
  assert.deepEqual(types, ["image", "video"]);
});

test("legacy Supabase images can still be deleted", async t => {
  let bucket = ""; let paths: string[] = [];
  t.mock.method(db.storage, "from", (name: string) => { bucket = name; return { remove: async (values: string[]) => { paths = values; return { error: null }; } }; });
  await deleteStoredExerciseMedia({ provider: "supabase", path: "old/image.webp", kind: "image" });
  assert.equal(bucket, "exercise-images"); assert.deepEqual(paths, ["old/image.webp"]);
});
