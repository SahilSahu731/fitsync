import { parseApiError } from "@/lib/api/errors";

import type { SyncFailure } from "./types";

export function classifySyncError(error: unknown): SyncFailure {
  const parsed = parseApiError(error, "Unable to sync workout.");

  if (!parsed.status) {
    return {
      kind: "NETWORK",

      message: parsed.message,
    };
  }

  if (parsed.status === 401) {
    return {
      kind: "AUTH",

      message: parsed.message,

      status: parsed.status,
    };
  }

  if (parsed.status === 409 || parsed.code === "WORKOUT_REVISION_CONFLICT") {
    return {
      kind: "CONFLICT",

      message: parsed.message,

      status: parsed.status,

      currentRevision: parsed.currentRevision,
    };
  }

  if (parsed.status >= 500) {
    return {
      kind: "SERVER",

      message: parsed.message,

      status: parsed.status,
    };
  }

  if (parsed.status === 400 || parsed.status === 422) {
    return {
      kind: "VALIDATION",

      message: parsed.message,

      status: parsed.status,
    };
  }

  return {
    kind: "UNKNOWN",

    message: parsed.message,

    status: parsed.status,
  };
}
