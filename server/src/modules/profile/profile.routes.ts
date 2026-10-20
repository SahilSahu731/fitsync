
import { Router } from "express";

import { ApiError } from "../../common/errors.js";
import { asyncHandler } from "../../common/async-handler.js";
import { requireAuth, getAuth } from "../../middleware/auth.js";

import {
  onboardingSchema,
  editFitnessSchema,
  editUserSchema,
  settingsSchema
} from "./profile.schema.js";

import {
  getFullUser,
  updateAccount,
  saveOnboarding,
  updateFitnessProfile,
  resetOnboarding,
  updateUserSettings
} from "./profile.service.js";

import {
  uploadAvatar,
  deleteAvatar,
  uploadAvatarMiddleware
} from "./avatar.service.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  res.json(await getFullUser(getAuth(req).userId));
}));

router.patch("/", asyncHandler(async (req, res) => {
  const input = editUserSchema.parse(req.body);
  res.json(await updateAccount(getAuth(req).userId, input));
}));

router.put("/profile", asyncHandler(async (req, res) => {
  const input = onboardingSchema.parse(req.body);
  res.json(await saveOnboarding(getAuth(req).userId, input));
}));

router.patch("/profile", asyncHandler(async (req, res) => {
  const input = editFitnessSchema.parse(req.body);
  res.json(await updateFitnessProfile(getAuth(req).userId, input));
}));

router.delete("/profile", asyncHandler(async (req, res) => {
  res.json(await resetOnboarding(getAuth(req).userId));
}));

router.patch("/settings", asyncHandler(async (req, res) => {
  const input = settingsSchema.parse(req.body);
  res.json(await updateUserSettings(getAuth(req).userId, input));
}));

router.post(
  "/avatar",
  uploadAvatarMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Choose an image.");
    }

    res.json(await uploadAvatar(getAuth(req).userId, req.file));
  })
);

router.delete("/avatar", asyncHandler(async (req, res) => {
  res.json(await deleteAvatar(getAuth(req).userId));
}));

export default router;
