
import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";

import { asyncHandler } from "../../common/async-handler.js";
import { ApiError } from "../../common/errors.js";

import {
  requireAuth,
  getAuth
} from "../../middleware/auth.js";

import {
  requireAdmin,
  isUserAdmin
} from "../../middleware/admin.js";

import {
  getTaxonomies,
  listExercises,
  listExercisePicker,
  getExercise,
  saveExercise,
  patchExercise,
  addExerciseMedia,
  removeExerciseMedia,
  deleteExercise
} from "./exercise.service.js";

import {
  exerciseInputSchema,
  exercisePatchSchema,
  exerciseListSchema,
  mediaMetadataSchema
} from "./exercise.schema.js";

import {
  exerciseUpload,
  uploadExerciseAsset
} from "./exercise.media.js";

const router = Router();
const uuid = z.uuid();

router.use(requireAuth);

// Used by mobile to decide whether to show the admin button.
router.get(
  "/permissions",
  asyncHandler(async (req, res) => {
    const admin = await isUserAdmin(getAuth(req).userId);

    res.json({
      canManageExercises: admin
    });
  })
);

// All exercise types come from PostgreSQL.
router.get(
  "/taxonomies",
  asyncHandler(async (_req, res) => {
    res.json(await getTaxonomies());
  })
);

// Published catalog, or drafts when requested by admin.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = exerciseListSchema.parse(req.query);

    const admin = filters.includeDrafts === "true"
      ? await isUserAdmin(getAuth(req).userId)
      : false;

    res.json(await listExercises(filters, admin));
  })
);

router.get("/picker", asyncHandler(async (req, res) => {
  const page = z.coerce.number().int().min(1).max(1000).default(1).parse(req.query.page);
  res.json(await listExercisePicker(page));
}));

// Full exercise details.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const admin = await isUserAdmin(getAuth(req).userId);

    res.json(
      await getExercise(req.params.id as string, admin)
    );
  })
);

// Create exercise. Admin only.
router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = exerciseInputSchema.parse(req.body);

    const exercise = await saveExercise(
      getAuth(req).userId,
      input
    );

    res.status(201).json(exercise);
  })
);

// Edit, publish, archive or unpublish exercise.
router.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = uuid.parse(req.params.id);
    const input = exercisePatchSchema.parse(req.body);

    res.json(
      await patchExercise(
        getAuth(req).userId,
        id,
        input
      )
    );
  })
);

const uploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

// Admin media upload.
router.post(
  "/:id/media",
  requireAdmin,
  uploadLimiter,
  exerciseUpload,
  asyncHandler(async (req, res) => {
    const id = uuid.parse(req.params.id);

    await getExercise(id, true);

    if (!req.file) {
      throw new ApiError(
        400,
        "Choose an image or video."
      );
    }

    const meta = mediaMetadataSchema.parse(req.body);

    const asset = await uploadExerciseAsset(
      id,
      req.file
    );

    const exercise = await addExerciseMedia(
      id,
      asset,
      meta
    );

    res.status(201).json(exercise);
  })
);

// Remove media from both database and provider.
router.delete(
  "/:id/media/:mediaId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = uuid.parse(req.params.id);
    const mediaId = uuid.parse(req.params.mediaId);

    await getExercise(id, true);

    res.json(
      await removeExerciseMedia(id, mediaId)
    );
  })
);

router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  await deleteExercise(uuid.parse(req.params.id));
  res.status(204).end();
}));

export default router;
