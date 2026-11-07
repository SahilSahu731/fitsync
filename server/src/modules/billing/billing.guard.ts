import type { Request, RequestHandler } from "express";
import { ApiError } from "../../common/errors.js";
import type { Entitlement } from "./billing.types.js";

export function createProGuard(options: {
  configured: boolean;
  userId: (request: Request) => string;
  getEntitlement: (userId: string) => Promise<Entitlement>;
}): RequestHandler {
  return async (req, _res, next) => {
    try {
      const userId = options.userId(req);
      if (!options.configured) throw new ApiError(503, "FitSync Pro is not configured yet.");
      const entitlement = await options.getEntitlement(userId);
      if (!entitlement.active || entitlement.tier !== "pro") throw new ApiError(402, "FitSync Pro is required for this feature.");
      next();
    } catch (error) { next(error); }
  };
}
