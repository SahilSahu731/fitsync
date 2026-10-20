
import type {
  ErrorRequestHandler,
  RequestHandler
} from "express";

import { ZodError } from "zod";
import multer from "multer";

import { ApiError } from "../common/errors.js";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({
    message: "Route not found."
  });
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request.",
      errors: error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Image exceeds the 3 MB limit."
        : "Invalid file upload."
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      message: error.message
    });
    return;
  }

  console.error("[UNHANDLED ERROR]", error);

  res.status(500).json({
    message: "An unexpected error occurred."
  });
};
