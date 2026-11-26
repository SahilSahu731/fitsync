import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../common/async-handler.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { db } from "../../config/supabase.js";
import { requireAdmin } from "../../middleware/admin.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const linkSchema = z.object({
  url: z.url({ protocol: /^https?$/, normalize: true }).pipe(
    z
      .string()
      .max(2000)
      .refine((value) => {
        const { username, password } = new URL(value);
        return !username && !password;
      }, "Use a link without a username or password."),
  ),
  revision: z.int().positive(),
});

function publicSetting(row: { url: string; revision: number }) {
  const url = new URL(row.url);
  const isPlaceholder =
    url.hostname === "play.google.com" &&
    url.pathname === "/store/apps/details" &&
    url.searchParams.get("id") === "com.google.android.apps.healthdata";
  return { url: row.url, isPlaceholder, revision: row.revision };
}

router.get(
  "/mobile-download",
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from("site_mobile_download")
      .select("url, revision")
      .eq("id", true)
      .single();
    checkDbError(error, "read mobile download link");
    res.set("Cache-Control", "no-store").json(publicSetting(data!));
  }),
);

router.put(
  "/mobile-download",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { url, revision } = linkSchema.parse(req.body);
    const { data, error } = await db
      .from("site_mobile_download")
      .update({ url, revision: revision + 1 })
      .eq("id", true)
      .eq("revision", revision)
      .select("url, revision")
      .maybeSingle();
    checkDbError(error, "update mobile download link");
    if (!data) throw new ApiError(409, "The download link changed. Reload it before saving.");
    res.set("Cache-Control", "no-store").json(publicSetting(data));
  }),
);

export default router;
