
import type {
  NextFunction,
  Request,
  Response
} from "express";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { db } from "../config/supabase.js";
import { ApiError, checkDbError } from "../common/errors.js";

export type AuthContext = {
  userId: string;
  sessionId: string;
};

type AuthRequest = Request & {
  auth?: AuthContext;
};

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication required.");
    }

    const payload = jwt.verify(
      header.substring(7),
      env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "fitsync-api",
        audience: "fitsync-mobile"
      }
    );

    if (
      typeof payload === "string" ||
      !payload.sub ||
      typeof payload.sid !== "string"
    ) {
      throw new ApiError(401, "Invalid access token.");
    }

    const { data, error } = await db
      .from("auth_sessions")
      .select("id")
      .eq("id", payload.sid)
      .eq("user_id", payload.sub)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    checkDbError(error, "validate session");

    if (!data) {
      throw new ApiError(401, "Session expired or revoked.");
    }

    (req as AuthRequest).auth = {
      userId: payload.sub,
      sessionId: payload.sid
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, "Invalid access token."));
      return;
    }

    next(error);
  }
}

export function getAuth(req: Request): AuthContext {
  const auth = (req as AuthRequest).auth;

  if (!auth) {
    throw new ApiError(401, "Authentication required.");
  }

  return auth;
}
