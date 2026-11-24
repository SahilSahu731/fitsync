import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { errorHandler } from "../src/middleware/error-handler.js";
import {
  addSessionSetSchema,
  finishWorkoutSchema,
  updateSetSchema,
  workoutSetSchema,
} from "../src/modules/workouts/workout.schema.js";

Object.assign(process.env, {
  NODE_ENV: "test",
  SENTRY_DSN: "",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
});

function respond(error: unknown) {
  let status = 0;
  let body: unknown;
  const response = {
    headersSent: false,
    locals: { requestId: "123e4567-e89b-42d3-a456-426614174000" },
    status(value: number) {
      status = value;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  };
  errorHandler(error, { originalUrl: "/api/auth/refresh" } as Request, response as Response, () => {
    assert.fail("Headers were not sent");
  });
  return { status, body };
}

test("parser charset, interruption and size failures stay safe client errors", (t) => {
  const logs = t.mock.method(console, "error", () => {});
  for (const [type, status] of [
    ["charset.unsupported", 415],
    ["request.aborted", 400],
    ["request.size.invalid", 400],
  ] as const) {
    const failure = Object.assign(new Error("private-token"), {
      type,
      status,
      body: '{"refreshToken":"secret"}',
    });
    const result = respond(failure);
    assert.equal(result.status, status);
    assert.equal(typeof (result.body as { message: unknown }).message, "string");
    assert.doesNotMatch(JSON.stringify(result.body), /private-token|refreshToken|secret|stack/);
  }
  assert.equal(logs.mock.callCount(), 0);
});

test("unrecognized errors and parser types with wrong status remain server failures", (t) => {
  const logs = t.mock.method(console, "error", () => {});
  for (const error of [
    new SyntaxError("private data"),
    { type: "entity.parse.failed", status: 500, body: "secret" },
    { type: "__proto__", status: 400, body: "secret" },
  ]) {
    const result = respond(error);
    assert.equal(result.status, 500);
    assert.doesNotMatch(JSON.stringify(result.body), /private|secret|body/);
  }
  assert.equal(logs.mock.callCount(), 3);
});

test("workout numeric inputs are rejected before exceeding database column bounds", () => {
  assert.equal(workoutSetSchema.safeParse({ targetDurationSeconds: 2147483647 }).success, true);
  assert.equal(workoutSetSchema.safeParse({ targetDurationSeconds: 2147483648 }).success, false);
  assert.equal(
    updateSetSchema.safeParse({ durationSeconds: 2147483647, distanceMeters: 99999999.99 }).success,
    true,
  );
  for (const patch of [{ durationSeconds: 2147483648 }, { distanceMeters: 100000000 }])
    assert.equal(updateSetSchema.safeParse(patch).success, false);
  assert.equal(addSessionSetSchema.safeParse({ weightKg: 100000, reps: 1000 }).success, true);
  for (const patch of [{ weightKg: 100001 }, { reps: 1001 }])
    assert.equal(addSessionSetSchema.safeParse(patch).success, false);
  assert.equal(finishWorkoutSchema.safeParse({ elapsedSeconds: 2147483647 }).success, true);
  assert.equal(finishWorkoutSchema.safeParse({ elapsedSeconds: 2147483648 }).success, false);
});

test("malformed refresh session UUIDs are rejected without a database request", async (t) => {
  const { db } = await import("../src/config/supabase.js");
  const { rotateRefreshToken } = await import("../src/modules/auth/tokens.js");
  const rpc = t.mock.method(db, "rpc", () => {
    throw new Error("must not query invalid IDs");
  });
  for (const sessionId of ["-".repeat(36), "f".repeat(36), "123e4567-e89b-42d3-a456426614174000-"])
    await assert.rejects(
      rotateRefreshToken(`${sessionId}.${"a".repeat(64)}`),
      (error: any) => error.status === 401,
    );
  assert.equal(rpc.mock.callCount(), 0);
});
