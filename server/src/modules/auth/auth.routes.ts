
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { asyncHandler } from "../../common/async-handler.js";
import { requireAuth, getAuth } from "../../middleware/auth.js";

import { loginWithGoogle } from "./auth.service.js";
import { rotateRefreshToken, revokeSession } from "./tokens.js";

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

router.post("/google", limiter, asyncHandler(async (req, res) => {
  const { idToken } = z.object({
    idToken: z.string().min(50)
  }).parse(req.body);

  res.json(await loginWithGoogle(idToken));
}));

router.post("/refresh", limiter, asyncHandler(async (req, res) => {
  const { refreshToken } = z.object({
    refreshToken: z.string().min(50)
  }).parse(req.body);

  res.json(await rotateRefreshToken(refreshToken));
}));

router.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  const { userId, sessionId } = getAuth(req);

  await revokeSession(userId, sessionId);

  res.json({ message: "Signed out successfully." });
}));

export default router;
