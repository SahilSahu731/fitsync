export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let refreshing: Promise<boolean> | null = null;
async function refresh() {
  if (!refreshing)
    refreshing = fetch("/api/auth/refresh", { method: "POST" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...init } = options;
  const headers = new Headers(init.headers);
  if (json !== undefined) headers.set("Content-Type", "application/json");
  const request = () =>
    fetch(`/api/backend${path}`, {
      ...init,
      headers,
      body: json !== undefined ? JSON.stringify(json) : init.body,
      cache: "no-store",
    });
  let response = await request();
  if (response.status === 401) {
    // Coordinate refresh-token rotation between tabs as well as concurrent requests.
    const retry = async () => {
      const probe = await request();
      if (probe.status !== 401) return probe;
      return (await refresh()) ? request() : probe;
    };
    response = navigator.locks
      ? await navigator.locks.request("fitsync-session", retry)
      : await retry();
  }
  if (response.status === 204) return undefined as T;
  if (response.status === 401) window.dispatchEvent(new Event("fitsync-session-expired"));
  const data = await response.json().catch(() => {
    throw new ApiError(
      "Could not read the server response. Please try again.",
      response.ok ? 502 : response.status,
    );
  });
  if (!response.ok) {
    const details = Array.isArray(data?.errors)
      ? data.errors
          .map((item: { field: string; message: string }) => `${item.field}: ${item.message}`)
          .join(" · ")
      : "";
    throw new ApiError(
      details || data?.message || "Something went wrong. Please try again.",
      response.status,
    );
  }
  return data as T;
}

// Capture the account when an editor renders. A later cookie change in another
// tab must not redirect an existing save/delete/upload to a different account.
export function apiForAccount(ownerId: string | undefined): typeof api {
  return <T>(path: string, options: RequestInit & { json?: unknown } = {}) => {
    if (!ownerId) return Promise.reject(new ApiError("Please sign in to continue.", 401));
    const headers = new Headers(options.headers);
    headers.set("X-FitSync-Owner", ownerId);
    return api<T>(path, { ...options, headers });
  };
}
export function pretty(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
