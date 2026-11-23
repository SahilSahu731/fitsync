import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";

// Messages can contain fake stack lines. Only deployed code filenames may be sent.
const codeFiles = new Set(
  readdirSync(new URL("../", import.meta.url), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.[cm]?[jt]s$/.test(entry.name))
    .flatMap((entry) => [entry.name, entry.name.replace(/\.ts$/, ".js")]),
);

type Failure = "http" | "database" | "reminders" | "uncaughtException" | "unhandledRejection";
const pending = new Set<Promise<void>>();
let windowStart = 0;
let windowCount = 0;

// Send the documented Sentry envelope protocol directly. Deliberately omit SDK
// auto-instrumentation, request data, breadcrumbs, error messages and local variables:
// any of those can contain credentials or health records.
export function reportError(error: unknown, category: Failure) {
  const eventId = randomUUID().replaceAll("-", "");
  console.error(JSON.stringify({ level: "error", eventId, category }));
  const sentryDsn = process.env.SENTRY_DSN;
  if (!sentryDsn) return eventId;
  if (Date.now() - windowStart >= 60_000) {
    windowStart = Date.now();
    windowCount = 0;
  }
  if (windowCount++ >= 10) return eventId;

  // Startup validates configuration. Keep the reporter safe in isolated jobs/tests too.
  let dsn: URL;
  try {
    dsn = new URL(sentryDsn);
  } catch {
    return eventId;
  }
  if (
    dsn.protocol !== "https:" ||
    !/^[a-zA-Z0-9]+$/.test(dsn.username) ||
    dsn.password ||
    !/\/\d+$/.test(dsn.pathname) ||
    dsn.search ||
    dsn.hash
  )
    return eventId;
  const project = dsn.pathname.split("/").pop()!;
  const prefix = dsn.pathname.slice(0, -(project.length + 1));
  const endpoint = `${dsn.origin}${prefix}/api/${project}/envelope/`;
  const safeType =
    error instanceof Error &&
    ["Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError"].includes(error.name)
      ? error.name
      : "Error";
  const frames =
    error instanceof Error
      ? (error.stack ?? "")
          .split("\n")
          .slice(1)
          .flatMap((line) => {
            // Only code file basenames and line/column numbers, never the message or function arguments.
            const match = line.match(/[/\\]([\w.-]+\.[cm]?[jt]s):(\d+):(\d+)\)?$/);
            return match && codeFiles.has(match[1])
              ? [{ filename: match[1], lineno: Number(match[2]), colno: Number(match[3]) }]
              : [];
          })
          .reverse()
      : [];
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
    ...(/^[\w.@+-]{1,200}$/.test(process.env.SENTRY_RELEASE ?? "")
      ? { release: process.env.SENTRY_RELEASE }
      : {}),
    tags: { service: "fitsync-api", category },
    exception: {
      values: [
        {
          type: safeType,
          value: "Server operation failed; sensitive details omitted.",
          stacktrace: { frames },
        },
      ],
    },
  };
  const body =
    [
      JSON.stringify({ event_id: eventId, dsn: sentryDsn }),
      JSON.stringify({ type: "event" }),
      JSON.stringify(event),
    ].join("\n") + "\n";
  const task = fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body,
    signal: AbortSignal.timeout(2_000),
  })
    .then((response) => {
      if (!response.ok)
        console.error(
          JSON.stringify({
            level: "error",
            category: "monitoring_delivery",
            status: response.status,
          }),
        );
    })
    .catch(() => {
      console.error(JSON.stringify({ level: "error", category: "monitoring_delivery" }));
    })
    .finally(() => {
      pending.delete(task);
    });
  pending.add(task);
  return eventId;
}

export async function flushMonitoring() {
  await Promise.allSettled([...pending]);
}
