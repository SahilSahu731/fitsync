import { reportError } from "./monitoring.js";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function checkDbError(error: { message: string } | null, action: string) {
  if (!error) return;

  reportError(new Error("Database operation failed"), "database");

  throw new ApiError(500, "A database operation failed.");
}
