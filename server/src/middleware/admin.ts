
import type {
  NextFunction,
  Request,
  Response
} from "express";

import { db } from "../config/supabase.js";
import { ApiError, checkDbError } from "../common/errors.js";
import { getAuth } from "./auth.js";

export async function isUserAdmin(
  userId: string
): Promise<boolean> {
  const { data, error } = await db
    .from("app_users")
    .select("role")
    .eq("id", userId)
    .single();

  checkDbError(error, "verify admin role");

  return data?.role === "admin";
}

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const { userId } = getAuth(req);

    if (!(await isUserAdmin(userId))) {
      throw new ApiError(
        403,
        "Admin access required."
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}
