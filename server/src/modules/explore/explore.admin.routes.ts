import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/supabase.js";
import { asyncHandler } from "../../common/async-handler.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/admin.js";
import { exerciseUpload, uploadExerciseAsset } from "../exercises/exercise.media.js";
import { resourceSchema, toolSchema } from "./explore.schema.js";

import { TOOL_TAG, TOOL_TAG_FILTER, storeTool, readTool } from "./explore.tools.js";

const router = Router();
router.use(requireAuth, requireAdmin);
function config(kind: unknown) {
  const value = z.enum(["mobility", "learn", "tools"]).parse(kind);
  return { table: "explore_resources", tool: value === "tools", resourceKind: value === "mobility" ? "mobility" : "guide" };
}
function checked(error: { code?: string; message: string } | null) {
  if (error?.code === "23505") throw new ApiError(409, "That URL slug is already in use.");
  checkDbError(error, "manage Explore content");
}
router.post("/media", exerciseUpload, asyncHandler(async (req, res) => {
  if (!req.file || req.file.mimetype === "video/mp4") throw new ApiError(400, "Choose a JPEG, PNG, WebP or GIF image.");
  const asset = await uploadExerciseAsset("explore", req.file);
  res.status(201).json({ url: asset.url });
}));
router.get("/:kind", asyncHandler(async (req, res) => {
  const c = config(req.params.kind); const rows = [];
  for (let offset = 0; ; offset += 500) {
    let query = db.from(c.table).select("*").order("title").order("id").range(offset, offset + 499);
    query = query.eq("kind", c.resourceKind);
    query = c.tool ? query.contains("tags", [TOOL_TAG]) : query.not("tags", "cs", TOOL_TAG_FILTER);
    const { data, error } = await query; checked(error); rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  res.json(c.tool ? rows.map(readTool) : rows);
}));
for (const method of ["post", "patch"] as const) {
  router[method](method === "post" ? "/:kind" : "/:kind/:id", asyncHandler(async (req, res) => {
    const c = config(req.params.kind);
    const input: Record<string, unknown> = c.tool ? storeTool(toolSchema.parse(req.body)) : resourceSchema.parse({ ...req.body, kind: c.resourceKind });
    let query;
    if (method === "post") {
      query = db.from(c.table).insert(input);
    } else {
      const id = z.uuid().parse(req.params.id);
      // updated_at is an optimistic lock: stale browser tabs cannot overwrite newer edits.
      const version = z.iso.datetime({ offset: true }).parse(req.body.updated_at);
      query = db.from(c.table).update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).eq("updated_at", version);
      query = query.eq("kind", c.resourceKind);
      query = c.tool ? query.contains("tags", [TOOL_TAG]) : query.not("tags", "cs", TOOL_TAG_FILTER);
    }
    const { data, error } = await query.select("*").maybeSingle(); checked(error);
    if (!data) throw new ApiError(409, "This record changed or is no longer available. Reload the list before editing again.");
    res.status(method === "post" ? 201 : 200).json(c.tool ? readTool(data) : data);
  }));
}
// Content is unpublished instead of deleted; no destructive content endpoint.
export default router;
