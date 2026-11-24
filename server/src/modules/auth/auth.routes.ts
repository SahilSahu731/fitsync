import { Router } from "express";
import { apiRateLimit } from "../../middleware/rate-limit.js";
import { z } from "zod";
import { authRateLimitKey } from "../../common/client-ip.js";

import { asyncHandler } from "../../common/async-handler.js";
import { requireAuth, getAuth } from "../../middleware/auth.js";

import { loginWithGoogle } from "./auth.service.js";
import { rotateRefreshToken, revokeSession } from "./tokens.js";

const router = Router();

const limiter = apiRateLimit("auth-1", {
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: authRateLimitKey,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// Background recovery must not consume the interactive Google sign-in budget.
const refreshLimiter = apiRateLimit("auth-refresh", {
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyGenerator: authRateLimitKey,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post(
  "/google",
  limiter,
  asyncHandler(async (req, res) => {
    const { idToken } = z
      .object({
        idToken: z.string().min(50),
      })
      .parse(req.body);

    res.json(await loginWithGoogle(idToken));
  }),
);

router.post(
  "/refresh",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const { refreshToken } = z
      .object({
        refreshToken: z.string().min(50),
      })
      .parse(req.body);

    res.json(await rotateRefreshToken(refreshToken));
  }),
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId, sessionId } = getAuth(req);

    await revokeSession(userId, sessionId);

    res.json({ message: "Signed out successfully." });
  }),
);

export default router;
