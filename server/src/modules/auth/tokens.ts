import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { db } from "../../config/supabase.js";
import { env } from "../../config/env.js";
import { ApiError, checkDbError } from "../../common/errors.js";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createRefresh() {
  return randomBytes(48).toString("base64url");
}

function expirationDate() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function createAccessToken(userId: string, sessionId: string) {
  return jwt.sign({ sid: sessionId }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    audience: "fitsync-mobile",
    issuer: "fitsync-api",
    expiresIn: "15m",
  });
}

export async function createSession(userId: string) {
  const sessionId = randomUUID();
  const refreshToken = `${sessionId}.${createRefresh()}`;

  const { error } = await db.from("auth_sessions").insert({
    id: sessionId,
    user_id: userId,
    refresh_hash: hash(refreshToken),
    expires_at: expirationDate(),
  });

  checkDbError(error, "create auth session");

  return {
    accessToken: createAccessToken(userId, sessionId),
    refreshToken,
  };
}

export async function rotateRefreshToken(refreshToken: string) {
  const [sessionId, secret, extra] = refreshToken.split(".");

  if (
    !sessionId ||
    !secret ||
    extra !== undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId) ||
    secret.length < 40
  ) {
    throw new ApiError(401, "Invalid refresh token.");
  }

  const nextToken = `${sessionId}.${createRefresh()}`;
  const { data, error } = await db.rpc("rotate_auth_session_refresh", {
    p_session_id: sessionId,
    p_presented_hash: hash(refreshToken),
    p_next_hash: hash(nextToken),
  });
  checkDbError(error, "rotate auth token");
  const rotation = data?.[0];
  if (rotation?.outcome !== "rotated" || !rotation.user_id) {
    throw new ApiError(401, "Session expired or refresh token already used. Please sign in again.");
  }

  return {
    accessToken: createAccessToken(rotation.user_id, sessionId),
    refreshToken: nextToken,
  };
}

export async function revokeSession(userId: string, sessionId: string) {
  const { error } = await db
    .from("auth_sessions")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", sessionId);

  checkDbError(error, "revoke auth session");
}
