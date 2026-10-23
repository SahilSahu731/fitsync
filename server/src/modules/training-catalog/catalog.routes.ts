import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../common/async-handler.js";
import { requireAuth, getAuth } from "../../middleware/auth.js";
import * as service from "./catalog.service.js";

const router = Router();

const filtersSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  goal: z.enum([
    "muscle", "strength", "fat_loss", "endurance", "general"
  ]).optional(),
  equipment: z.enum([
    "gym", "dumbbells", "bodyweight", "bands", "mixed"
  ]).optional()
});

router.get("/programs", asyncHandler(async (req, res) => {
  res.json(
    await service.listPrograms(filtersSchema.parse(req.query))
  );
}));

router.get("/programs/:id", asyncHandler(async (req, res) => {
  res.json(
    await service.getProgram(z.uuid().parse(req.params.id))
  );
}));

router.get("/categories", asyncHandler(async (_req, res) => {
  res.json(await service.listCategories());
}));

router.get("/routines", asyncHandler(async (req, res) => {
  const query = z.object({
    category: z.string().max(80).optional()
  }).parse(req.query);

  res.json(await service.listRoutines(query.category));
}));

router.get("/routines/:id", asyncHandler(async (req, res) => {
  res.json(
    await service.getRoutine(z.uuid().parse(req.params.id))
  );
}));

router.use(requireAuth);

router.get("/my-routines", asyncHandler(async (req, res) => {
  res.json(await service.myRoutines(getAuth(req).userId));
}));

router.delete("/my-programs/:id", asyncHandler(async (req, res) => {
  await service.deleteSavedProgram(getAuth(req).userId, z.uuid().parse(req.params.id));
  res.status(204).end();
}));

router.get("/my-programs", asyncHandler(async (req, res) => {
  res.json(await service.myPrograms(getAuth(req).userId));
}));

router.post("/programs/:id/save", asyncHandler(async (req, res) => {
  res.json(
    await service.saveProgram(
      getAuth(req).userId,
      z.uuid().parse(req.params.id)
    )
  );
}));

router.post("/routines/:id/save", asyncHandler(async (req, res) => {
  res.json(
    await service.saveRoutine(
      getAuth(req).userId,
      z.uuid().parse(req.params.id)
    )
  );
}));

export default router;