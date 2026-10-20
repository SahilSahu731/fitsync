
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function checkDbError(
  error: { message: string } | null,
  action: string
) {
  if (!error) return;

  console.error(`[DATABASE] ${action}:`, error.message);

  throw new ApiError(
    500,
    "A database operation failed."
  );
}
