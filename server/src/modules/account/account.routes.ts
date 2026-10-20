
import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../../common/errors.js";
import { asyncHandler } from "../../common/async-handler.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";

import { deleteUserAccount } from "./account.service.js";

const router = Router();

router.delete("/", requireAuth, asyncHandler(async (req, res) => {
  const parsed = z.object({
    confirmation: z.literal("DELETE")
  }).safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(
      400,
      'Type "DELETE" to confirm account deletion.'
    );
  }

  res.json(await deleteUserAccount(getAuth(req).userId));
}));

export default router;
