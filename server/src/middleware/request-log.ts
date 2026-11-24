import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

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
    const route = req.route?.path;
    const area = req.originalUrl.split("?")[0].split("/")[2];
    const service = [
      "auth",
      "me",
      "exercises",
      "workouts",
      "billing",
      "coaching",
      "wellness",
      "companion",
      "progress",
      "program-follow",
      "catalog",
      "explore",
    ].includes(area)
      ? area
      : "other";
    console.log(
      JSON.stringify({
        level: "info",
        event: "http_request",
        requestId,
        method: req.method,
        service,
        route: typeof route === "string" ? route : "unmatched",
        status: aborted ? 499 : res.statusCode,
        aborted,
        durationMs: Math.round(performance.now() - started),
      }),
    );
  };
  res.once("finish", () => log(false));
  res.once("close", () => log(!res.writableFinished));
  next();
};
