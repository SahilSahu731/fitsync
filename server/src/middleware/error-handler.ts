import type { ErrorRequestHandler, RequestHandler } from "express";

import { ZodError } from "zod";
import multer from "multer";

import { ApiError } from "../common/errors.js";
import { reportError } from "../common/monitoring.js";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({
    message: "Route not found.",
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (res.headersSent) {
    _next(error);
    return;
  }
  // body-parser errors can carry the rejected request body. Classify only its
  // known input failures and never report or return the original error.
  const parserFailure = error as { type?: unknown; status?: unknown } | null;
  const parserErrors: Record<string, { status: number; message: string }> = {
    "entity.parse.failed": { status: 400, message: "Invalid JSON request body." },
    "entity.too.large": { status: 413, message: "Request body is too large." },
    "encoding.unsupported": { status: 415, message: "Unsupported request encoding." },
    "charset.unsupported": { status: 415, message: "Unsupported request charset." },
    "request.aborted": { status: 400, message: "Request body was interrupted." },
    "request.size.invalid": { status: 400, message: "Request body length is invalid." },
  };
  if (typeof parserFailure?.type === "string") {
    const failure = Object.hasOwn(parserErrors, parserFailure.type)
      ? parserErrors[parserFailure.type]
      : undefined;
    if (failure && parserFailure.status === failure.status) {
      res.status(failure.status).json({ message: failure.message });
      return;
    }
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request.",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? req.originalUrl.startsWith("/api/exercises")
            ? "Media exceeds the 25 MB limit."
            : "Image exceeds the 3 MB limit."
          : "Invalid file upload.",
    });
    return;
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) reportError(error, "http", res.locals.requestId);
    res.status(error.status).json({
      message: error.message,
    });
    return;
  }

  reportError(error, "http", res.locals.requestId);

  res.status(500).json({
    message: "An unexpected error occurred.",
    requestId: res.locals.requestId,
  });
};
