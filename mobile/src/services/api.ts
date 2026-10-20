
import { loadSecureStore } from "./native-modules";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

const REFRESH_KEY = "fitsync.refresh-token.v1";

let accessToken: string | null = null;

let refreshInFlight: Promise<boolean> | null = null;

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

async function readResponse<T>(
  response: Response
): Promise<T> {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new HttpError(
      response.status,
      result.message || "Request failed."
    );
  }

  return result as T;
}

export async function storeSessionTokens(
  tokens: SessionTokens
) {
  const SecureStore = await loadSecureStore();

  await SecureStore.setItemAsync(
    REFRESH_KEY,
    tokens.refreshToken
  );
  accessToken = tokens.accessToken;
}

export async function clearSessionTokens() {
  accessToken = null;
  const SecureStore = await loadSecureStore();

  await SecureStore.deleteItemAsync(
    REFRESH_KEY
  );
}

export async function googleBackendLogin(
  idToken: string
) {
  const response = await fetch(
    `${baseUrl()}/api/auth/google`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ idToken })
    }
  );

  return readResponse<
    SessionTokens & {
      user: unknown;
      profile: unknown;
      settings: unknown;
    }
  >(response);
}

async function performRefresh(): Promise<boolean> {
  const SecureStore = await loadSecureStore();
  const savedToken = await SecureStore.getItemAsync(
    REFRESH_KEY
  );

  if (!savedToken) return false;

  try {
    const response = await fetch(
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

    if (response.status === 401) {
      await clearSessionTokens();
      return false;
    }

    const tokens =
      await readResponse<SessionTokens>(response);

    await storeSessionTokens(tokens);
    return true;
  } catch (error) {
    // Do not destroy a locally stored session on a
    // temporary network failure.
    if (error instanceof HttpError && error.status === 401) {
      await clearSessionTokens();
      return false;
    }

    throw error;
  }
}

export async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function restoreBackendSession() {
  return refreshAccessToken();
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const makeRequest = async () => {
    const headers: Record<string, string> = {
      Accept: "application/json"
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    if (options.json !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(`${baseUrl()}/api${path}`, {
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

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      throw new HttpError(
        401,
        "Please sign in again."
      );
    }

    response = await makeRequest();
  }

  return readResponse<T>(response);
}
