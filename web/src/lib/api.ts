export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
let refreshing: Promise<boolean> | null = null;
async function refresh() {
  if (!refreshing) refreshing = fetch("/api/auth/refresh", { method: "POST" }).then(response => response.ok).catch(() => false).finally(() => { refreshing = null; });
  return refreshing;
}
export async function api<T>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...init } = options;
  const headers = new Headers(init.headers);
  if (json !== undefined) headers.set("Content-Type", "application/json");
  const request = () => fetch(`/api/backend${path}`, { ...init, headers, body: json !== undefined ? JSON.stringify(json) : init.body, cache: "no-store" });
  let response = await request();
  if (response.status === 401) {
    // Coordinate refresh-token rotation between tabs as well as concurrent requests.
    const retry = async () => {
      const probe = await request();
      if (probe.status !== 401) return probe;
      return await refresh() ? request() : probe;
    };
    response = navigator.locks ? await navigator.locks.request("fitsync-session", retry) : await retry();
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({ message: "Could not read the server response." }));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("fitsync-session-expired"));
    const details = data.errors?.map((item: { field: string; message: string }) => `${item.field}: ${item.message}`).join(" · ");
    throw new ApiError(details || data.message || "Something went wrong. Please try again.", response.status);
  }
  return data as T;
}
export function pretty(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
