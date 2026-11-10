import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { asyncHandler } from "../../common/async-handler.js";
import { requireAuth, getAuth } from "../../middleware/auth.js";
import { billingService } from "./billing.service.js";

const router = Router();

// Store notifications authenticate using their configured header, not user JWTs.
router.post("/webhook", asyncHandler(async (req, res) => {
  res.json(await billingService.processWebhook(req.headers.authorization, req.body));
}));

router.use(requireAuth);
router.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
router.get("/status", asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await billingService.getStatus(getAuth(req).userId));
}));
router.post("/sync", asyncHandler(async (req, res) => {
  // The client can request reconciliation, but cannot submit premium state,
  // receipts, user IDs, product IDs or expiry dates for the server to trust.
  z.object({}).strict().parse(req.body ?? {});
  res.set("Cache-Control", "no-store");
  res.json(await billingService.getStatus(getAuth(req).userId));
}));

export default router;
