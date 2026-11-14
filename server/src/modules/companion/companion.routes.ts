import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { asyncHandler } from "../../common/async-handler.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";
import { requirePro } from "../billing/billing.middleware.js";
import {
  recordIdSchema,
  reportSchema,
  saveRecordSchema,
  shareSchema,
  shareTokenSchema,
} from "./companion.schema.js";
import * as service from "./companion.service.js";
import { listPhotos, photoUpload, uploadPhoto, deletePhoto } from "./companion.photos.js";
import { monthlyReport } from "./companion.reports.js";

const router = Router();
router.use((_req, res, next) => {
  res.set({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  next();
});
router.get(
  "/shared/:token",
  rateLimit({ windowMs: 60000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }),
  asyncHandler(async (req, res) => {
    res.json(await service.readShare(shareTokenSchema.parse(req.params.token)));
  }),
);
router.use(requireAuth);
router.get(
  "/exercise-usage",
  asyncHandler(async (req, res) => {
    res.json(await service.exerciseUsage(getAuth(req).userId));
  }),
);
router.get(
  "/state",
  asyncHandler(async (req, res) => {
    const userId = getAuth(req).userId;
    const [records, photos, shares] = await Promise.all([
      service.listRecords(userId),
      listPhotos(userId),
      service.listShares(userId),
    ]);
    res.json({ records, photos, shares });
  }),
);
router.put(
  "/records/:id",
  requirePro,
  asyncHandler(async (req, res) => {
    res.json(
      await service.saveRecord(
        getAuth(req).userId,
        recordIdSchema.parse(req.params.id),
        saveRecordSchema.parse(req.body),
      ),
    );
  }),
);
router.delete(
  "/records/:id",
  asyncHandler(async (req, res) => {
    const revision = z.coerce.number().int().positive().max(2147483646).parse(req.query.revision);
    res.json(
      await service.deleteRecord(
        getAuth(req).userId,
        recordIdSchema.parse(req.params.id),
        revision,
      ),
    );
  }),
);
router.post(
  "/photos",
  requirePro,
  rateLimit({ windowMs: 60000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }),
  photoUpload,
  asyncHandler(async (req, res) => {
    res.status(201).json(await uploadPhoto(getAuth(req).userId, req.file, req.body));
  }),
);
router.delete(
  "/photos/:id",
  asyncHandler(async (req, res) => {
    res.json(await deletePhoto(getAuth(req).userId, z.uuid().parse(req.params.id)));
  }),
);
router.post(
  "/shares",
  requirePro,
  rateLimit({ windowMs: 60000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await service.createShare(getAuth(req).userId, shareSchema.parse(req.body)));
  }),
);
router.delete(
  "/shares/:id",
  asyncHandler(async (req, res) => {
    res.json(await service.revokeShare(getAuth(req).userId, z.uuid().parse(req.params.id)));
  }),
);
router.get(
  "/reports",
  asyncHandler(async (req, res) => {
    const input = reportSchema.parse(req.query);
    res.json(await monthlyReport(getAuth(req).userId, input.month, input.timezone));
  }),
);
export default router;
