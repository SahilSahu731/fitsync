import { isAxiosError } from "axios";

interface ValidationIssue {
  msg?: string;
}

interface StructuredDetail {
  code?: string;

  message?: string;

  retry_after?: number;
}

interface ApiErrorBody {
  detail?: string | StructuredDetail | ValidationIssue[];
}

export interface ParsedApiError {
  message: string;

  code?: string;

  retryAfter?: number;

  status?: number;
}

export function parseApiError(
  error: unknown,
  fallback = "Something went wrong.",
): ParsedApiError {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return {
      message: fallback,
    };
  }

  if (!error.response) {
    return {
      message: "Unable to reach FitSync. Check your connection.",
    };
  }

  const status = error.response.status;

  const detail = error.response.data?.detail;

  if (typeof detail === "string") {
    return {
      message: detail,

      status,
    };
  }

  if (detail && !Array.isArray(detail) && typeof detail === "object") {
    return {
      message: detail.message ?? fallback,

      code: detail.code,

      retryAfter: detail.retry_after,

      status,
    };
  }

  if (Array.isArray(detail)) {
    const first = detail[0];

    if (first && typeof first.msg === "string") {
      return {
        message: first.msg,

        status,
      };
    }
  }

  return {
    message: fallback,

    status,
  };
}
