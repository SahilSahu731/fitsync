export type TelemetryPreferences = { analytics: boolean; diagnostics: boolean };
export const TELEMETRY_DEFAULTS: TelemetryPreferences = { analytics: true, diagnostics: true };
export function parseTelemetry(value: string | null): TelemetryPreferences {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return {
      analytics: typeof parsed?.analytics === "boolean" ? parsed.analytics : true,
      diagnostics: typeof parsed?.diagnostics === "boolean" ? parsed.diagnostics : true,
    };
  } catch {
    return { ...TELEMETRY_DEFAULTS };
  }
}
export function safeProperties(
  properties: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const allowed = new Set(["source", "screen", "step", "plan", "result", "action", "membership"]);
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        allowed.has(key) &&
        (typeof value === "boolean" ||
          (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 50) ||
          (typeof value === "string" && /^[a-z0-9_()/-]{1,80}$/i.test(value))),
    ),
  ) as Record<string, string | number | boolean>;
}
export function safeScreen(segments: readonly string[]) {
  return (
    segments
      .map((part) => (part.startsWith("[") ? "_detail" : part))
      .filter((part) => /^[a-z0-9_()-]+$/i.test(part))
      .join("/") || "home"
  );
}
// Allow only code locations and fixed metadata; strip messages, requests, health
// records, breadcrumbs, context source lines and local file-system paths.
export function scrubCrash(event: any) {
  const types = [
    "Error",
    "TypeError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "URIError",
    "EvalError",
  ];
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    user: { ip_address: "0.0.0.0" },
    tags: { service: "fitsync-android", ...safeProperties(event.tags ?? {}) },
    exception: {
      values: (event.exception?.values ?? []).map((value: any) => ({
        type: types.includes(value.type) ? value.type : "Error",
        value: "FitSync operation failed",
        mechanism: value.mechanism
          ? { type: "generic", handled: value.mechanism.handled }
          : undefined,
        stacktrace: {
          frames: (value.stacktrace?.frames ?? []).flatMap((frame: any) => {
            const filename = String(frame.filename ?? "")
              .split(/[\\/]/)
              .pop()
              ?.split("?")[0];
            if (!filename || !/^[\w.-]+\.(?:js|ts|jsx|tsx|bundle)$/.test(filename)) return [];
            return [
              {
                filename,
                lineno: frame.lineno,
                colno: frame.colno,
                in_app: frame.in_app,
                ...(typeof frame.debug_id === "string" ? { debug_id: frame.debug_id } : {}),
              },
            ];
          }),
        },
      })),
    },
    ...(event.debug_meta
      ? {
          debug_meta: {
            images: (event.debug_meta.images ?? []).map((item: any) => ({
              type: item.type,
              debug_id: item.debug_id,
              code_file: String(item.code_file ?? "")
                .split(/[\\/]/)
                .pop()
                ?.split("?")[0],
            })),
          },
        }
      : {}),
  };
}
