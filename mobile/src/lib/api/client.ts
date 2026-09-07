import { create, isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { env } from "@/config/env";

import { emitAuthInvalidated } from "@/features/auth/auth-events";

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/features/auth/token-storage";

import type { TokenPair } from "@/features/auth/types";

const configuration = {
  baseURL: env.apiUrl,

  timeout: 12_000,

  headers: {
    "Content-Type": "application/json",
  },
};

export const publicApiClient = create(configuration);

export const apiClient = create(configuration);

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/*
 * There must never be multiple refresh
 * operations at once because FitSync
 * rotates refresh tokens.
 */
let refreshPromise: Promise<string> | null = null;

async function invalidateSession(): Promise<void> {
  try {
    await clearTokens();
  } finally {
    emitAuthInvalidated();
  }
}

function isRefreshRejected(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  return status === 401 || status === 403;
}

async function performRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    await invalidateSession();

    throw new Error("No refresh token available.");
  }

  try {
    const response = await publicApiClient.post<TokenPair>("/auth/refresh", {
      refresh_token: refreshToken,
    });

    /*
     * Backend rotated BOTH tokens.
     */
    await saveTokens(response.data);

    return response.data.access_token;
  } catch (error) {
    /*
     * 401 / 403:
     * credential is rejected.
     *
     * Network / 5xx:
     * retain local credentials.
     */

    if (isRefreshRejected(error)) {
      await invalidateSession();
    }

    throw error;
  }
}

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;

    if (error.response?.status !== 401 || !request || request._retry) {
      return Promise.reject(error);
    }

    if (!getRefreshToken()) {
      await invalidateSession();

      return Promise.reject(error);
    }

    request._retry = true;

    try {
      const token = await refreshAccessToken();

      request.headers.Authorization = `Bearer ${token}`;

      return apiClient(request);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
