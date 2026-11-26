import { randomBytes } from "node:crypto";

type Options = {
  projectToken?: string;
  host: string;
  sampleRate: number;
  environment: string;
};

type RequestTiming = {
  method: string;
  // The caller supplies an Express route template, never a request URL.
  route: string;
  status: number;
  durationMs: number;
};

const hosts = new Set(["https://us.i.posthog.com", "https://eu.i.posthog.com"]);
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const maxBatch = 32;
const flushIntervalMs = 10_000;

function stringAttribute(key: string, stringValue: string) {
  return { key, value: { stringValue } };
}

function serverSpan({ method, route, status, durationMs }: RequestTiming) {
  const verb = methods.has(method) ? method : "_OTHER";
  const template =
    /^\/api(?:\/(:?[a-zA-Z][a-zA-Z0-9_-]*))*\/?$/.test(route) && route.length <= 160
      ? route
      : "/api/unmatched";
  const end = BigInt(Date.now()) * 1_000_000n;
  const duration = BigInt(Math.round(durationMs * 1_000_000));
  return {
    traceId: randomBytes(16).toString("hex"),
    spanId: randomBytes(8).toString("hex"),
    kind: 2, // SERVER
    flags: 1,
    name: `${verb} ${template}`,
    startTimeUnixNano: String(end - duration),
    endTimeUnixNano: String(end),
    attributes: [
      stringAttribute("http.request.method", verb),
      stringAttribute("http.route", template),
      { key: "http.response.status_code", value: { intValue: String(status) } },
    ],
    status: { code: status >= 500 || status === 499 ? 2 : 0 },
  };
}

export function createApiTracing({ projectToken, host, sampleRate, environment }: Options) {
  const enabled = !!projectToken && hosts.has(host) && sampleRate > 0 && sampleRate <= 1;
  const attributes = [
    stringAttribute("service.name", "fitsync-api"),
    stringAttribute("deployment.environment", environment),
  ];
  let spans: ReturnType<typeof serverSpan>[] = [];
  let timer: NodeJS.Timeout | undefined;
  let sending: Promise<void> | undefined;
  let warned = false;

  async function send(batch: typeof spans) {
    try {
      const response = await fetch(`${host}/i/v1/traces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${projectToken}` },
        redirect: "error",
        signal: AbortSignal.timeout(2_000),
        body: JSON.stringify({
          resourceSpans: [
            {
              resource: { attributes },
              scopeSpans: [{ scope: { name: "fitsync-api" }, spans: batch }],
            },
          ],
        }),
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error();
      warned = false;
    } catch {
      if (!warned) console.warn("PostHog API trace export failed.");
      warned = true;
    }
  }

  async function flush(): Promise<void> {
    clearTimeout(timer);
    timer = undefined;
    if (sending) {
      await sending;
      return flush();
    }
    if (!spans.length) return;
    const batch = spans;
    spans = [];
    sending = send(batch).finally(() => {
      sending = undefined;
    });
    await sending;
  }

  function record(timing: RequestTiming) {
    if (!enabled || spans.length >= maxBatch || Math.random() >= sampleRate) return;
    if (!Number.isSafeInteger(Math.round(timing.durationMs * 1_000_000)) || timing.durationMs < 0)
      return;
    if (!Number.isInteger(timing.status) || timing.status < 100 || timing.status > 599) return;
    spans.push(serverSpan(timing));
    timer ??= setTimeout(() => void flush(), flushIntervalMs).unref();
  }

  return { record, flush };
}
