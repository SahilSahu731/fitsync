
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
  return new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
}

function createAccessToken(userId: string, sessionId: string) {
  return jwt.sign(
    { sid: sessionId },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      subject: userId,
      audience: "fitsync-mobile",
      issuer: "fitsync-api",
      expiresIn: "15m"
    }
  );
}

export async function createSession(userId: string) {
  const sessionId = randomUUID();
  const refreshToken = `${sessionId}.${createRefresh()}`;

  const { error } = await db
    .from("auth_sessions")
    .insert({
      id: sessionId,
      user_id: userId,
      refresh_hash: hash(refreshToken),
      expires_at: expirationDate()
    });

  checkDbError(error, "create auth session");

  return {
    accessToken: createAccessToken(userId, sessionId),
    refreshToken
  };
}

export async function rotateRefreshToken(refreshToken: string) {
  const [sessionId, secret, extra] = refreshToken.split(".");

  if (
    !sessionId ||
    !secret ||
    extra !== undefined ||
    !/^[0-9a-f-]{36}$/i.test(sessionId) ||
    secret.length < 40
  ) {
    throw new ApiError(401, "Invalid refresh token.");
  }

  const nextToken = `${sessionId}.${createRefresh()}`;
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("auth_sessions")
    .update({
      refresh_hash: hash(nextToken),
      expires_at: expirationDate(),
      updated_at: now
    })
    .eq("id", sessionId)
    .eq("refresh_hash", hash(refreshToken))
    .is("revoked_at", null)
    .gt("expires_at", now)
    .select("user_id")
    .maybeSingle();

  checkDbError(error, "rotate auth token");

  if (!data) {
    throw new ApiError(
      401,
      "Session expired or refresh token already used."
    );
  }

  return {
    accessToken: createAccessToken(data.user_id, sessionId),
    refreshToken: nextToken
  };
}

export async function revokeSession(
  userId: string,
  sessionId: string
) {
  const { error } = await db
    .from("auth_sessions")
    .update({
      revoked_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("id", sessionId);

  checkDbError(error, "revoke auth session");
}
