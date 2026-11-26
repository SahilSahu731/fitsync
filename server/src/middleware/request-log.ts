import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { createApiTracing } from "../common/api-tracing.js";

const tracing = createApiTracing({
  projectToken: env.POSTHOG_PROJECT_TOKEN,
  host: env.POSTHOG_HOST,
  sampleRate: env.POSTHOG_TRACE_SAMPLE_RATE,
  environment: env.POSTHOG_ENVIRONMENT ?? env.NODE_ENV,
});

export const flushApiTracing = () => tracing.flush();

// Only these static mount paths can become telemetry attributes.
const apiMount =
  /^\/api\/(auth|me|exercises|workouts|billing|coaching|wellness|companion|progress|program-follow|catalog(?:\/admin)?|explore(?:\/admin)?)(?=[/?]|$)/i;

export const requestLog: RequestHandler = (req, res, next) => {
  // Generate at the trusted boundary; never echo arbitrary caller-controlled text.
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  const started = performance.now();
  let logged = false;
  const log = (aborted: boolean) => {
    if (logged) return;
    logged = true;
    // Route templates omit IDs, share tokens, queries, credentials and health data.
    const mount = apiMount.exec(req.originalUrl)?.[0].toLowerCase();
    const template = typeof req.route?.path === "string" ? req.route.path : "/unmatched";
    const route = mount ? mount + template : "other";
    const status = aborted ? 499 : res.statusCode;
    const durationMs = performance.now() - started;
    // Uncomment to restore one structured console line per request.
    // console.log(JSON.stringify({ event: "http_request", requestId, method: req.method, route, status, durationMs }));
    if (mount) tracing.record({ method: req.method, route, status, durationMs });
  };
  res.once("finish", () => log(false));
  res.once("close", () => log(!res.writableFinished));
  next();
};
