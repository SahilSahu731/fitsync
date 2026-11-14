
import { loadSecureStore } from "./native-modules";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

const REFRESH_KEY = "fitsync.refresh-token.v1";

let accessToken: string | null = null;

let sessionGeneration = 0;
// A non-secret cache scope changes whenever the signed-in identity changes.
export const apiSessionKey = () => sessionGeneration;
let credentialWork: Promise<unknown> = Promise.resolve();
let refreshInFlight: { generation: number; operation: Promise<boolean> } | null = null;

function withCredentials<T>(operation: () => Promise<T>): Promise<T> {
  // SecureStore has no compare-and-swap. Serialize reads/writes, and check the
  // session generation inside the queue so a late old refresh cannot overwrite
  // or delete a newer login's refresh token.
  const next = credentialWork.catch(() => undefined).then(operation);
  credentialWork = next;
  return next;
}

function assertGeneration(generation: number) {
  if (generation !== sessionGeneration) throw new HttpError(409, "The signed-in account changed. Reopen this screen.");
}

async function persistTokens(tokens: SessionTokens, generation: number): Promise<boolean> {
  if (typeof tokens.accessToken !== "string" || !tokens.accessToken || typeof tokens.refreshToken !== "string" || !tokens.refreshToken) throw new HttpError(502, "The server returned an invalid session. Please sign in again.");
  return withCredentials(async () => {
    if (generation !== sessionGeneration) return false;
    const SecureStore = await loadSecureStore();
    if (generation !== sessionGeneration) return false;
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
    // A newer credential operation is queued behind this write. Never expose
    // the old access token while that newer operation is waiting to commit.
    if (generation !== sessionGeneration) return false;
    accessToken = tokens.accessToken;
    return true;
  });
}

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function baseUrl() {
  if (!API_URL) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_URL in mobile/.env"
    );
  }

  return API_URL;
}

type JsonResponse = { ok: boolean; status: number; result: unknown };
const REQUEST_TIMEOUT_MS = 20_000;
const requestTimedOut = () => new HttpError(408, "The request timed out. Check your connection and retry; saved workout updates remain queued.");

async function fetchJson(url: string, init: RequestInit): Promise<JsonResponse> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(requestTimedOut()); }, REQUEST_TIMEOUT_MS);
  });
  try {
    const request = (async () => {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const result: unknown = await response.json().catch(error => {
        if (controller.signal.aborted) throw error;
        return {};
      });
      if (controller.signal.aborted) throw requestTimedOut();
      return { ok: response.ok, status: response.status, result };
    })();
    // Keep a deadline even if a platform fetch/body implementation does not
    // reject promptly after abort. A hung upload must release the offline queue.
    return await Promise.race([request, deadline]);
  } catch (error) {
    if (controller.signal.aborted) throw requestTimedOut();
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function readResponse<T>(response: JsonResponse): Promise<T> {
  const { result } = response;

  if (!response.ok) {
    throw new HttpError(
      response.status,
      result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : "Request failed."
    );
  }

  return result as T;
}

export async function storeSessionTokens(
  tokens: SessionTokens
) {
  const generation = ++sessionGeneration;
  accessToken = null;
  if (!await persistTokens(tokens, generation)) assertGeneration(generation);
}

export async function clearSessionTokens() {
  const generation = ++sessionGeneration;
  accessToken = null;
  await withCredentials(async () => {
    if (generation !== sessionGeneration) return;
    const SecureStore = await loadSecureStore();
    if (generation !== sessionGeneration) return;
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  });
}

export async function googleBackendLogin(
  idToken: string
) {
  const generation = sessionGeneration;
  const response = await fetchJson(
    `${baseUrl()}/api/auth/google`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ idToken })
    }
  );

  assertGeneration(generation);

  const result = await readResponse<
    SessionTokens & {
      user: unknown;
      profile: unknown;
      settings: unknown;
    }
  >(response);
  assertGeneration(generation);
  return result;
}

async function performRefresh(generation: number): Promise<boolean> {
  const savedToken = await withCredentials(async () => {
    if (generation !== sessionGeneration) return null;
    const SecureStore = await loadSecureStore();
    if (generation !== sessionGeneration) return null;
    const value = await SecureStore.getItemAsync(REFRESH_KEY);
    return generation === sessionGeneration ? value : null;
  });

  if (!savedToken) return false;

  try {
    const response = await fetchJson(
      `${baseUrl()}/api/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          refreshToken: savedToken
        })
      }
    );

    if (generation !== sessionGeneration) return false;

    if (response.status === 401) {
      await clearSessionTokens();
      return false;
    }

    const tokens =
      await readResponse<SessionTokens>(response);

    if (generation !== sessionGeneration) return false;
    // Refreshing the same account does not begin a new session generation.
    return await persistTokens(tokens, generation);
  } catch (error) {
    // Do not destroy a locally stored session on a
    // temporary network failure.
    if (error instanceof HttpError && error.status === 401) {
      if (generation === sessionGeneration) await clearSessionTokens();
      return false;
    }

    throw error;
  }
}

export async function refreshAccessToken() {
  const generation = sessionGeneration;
  if (refreshInFlight?.generation !== generation) {
    const operation = performRefresh(generation).finally(() => {
      if (refreshInFlight?.operation === operation) refreshInFlight = null;
    });
    refreshInFlight = { generation, operation };
  }

  return refreshInFlight.operation;
}

export async function restoreBackendSession() {
  return refreshAccessToken();
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
  expectedOwnerId?: string;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const generation = sessionGeneration;
  const makeRequest = async () => {
    assertGeneration(generation);
    const headers: Record<string, string> = {
      Accept: "application/json"
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (options.expectedOwnerId) headers["X-FitSync-Owner"] = options.expectedOwnerId;

    if (options.json !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    return fetchJson(`${baseUrl()}/api${path}`, {
      method: options.method || "GET",
      headers,
      body:
        options.form ??
        (
          options.json !== undefined
            ? JSON.stringify(options.json)
            : undefined
        )
    });
  };

  let response = await makeRequest();
  assertGeneration(generation);

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      if (accessToken) assertGeneration(generation);
      throw new HttpError(
        401,
        "Please sign in again."
      );
    }

    response = await makeRequest();
    assertGeneration(generation);
  }

  const result = await readResponse<T>(response);
  assertGeneration(generation);
  return result;
}
