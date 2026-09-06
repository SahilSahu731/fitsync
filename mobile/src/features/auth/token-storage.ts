import * as SecureStore from "expo-secure-store";

import * as z from "zod";

import type { TokenPair } from "./types";

const TOKEN_STORAGE_KEY = "fitsync.auth.tokens.v1";

const storedTokensSchema = z.object({
  access_token: z.string().min(1),

  refresh_token: z.string().min(1),
});

export type StoredTokens = z.infer<typeof storedTokensSchema>;

let memoryTokens: StoredTokens | null = null;

export function getAccessToken(): string | null {
  return memoryTokens?.access_token ?? null;
}

export function getRefreshToken(): string | null {
  return memoryTokens?.refresh_token ?? null;
}

export function getMemoryTokens(): StoredTokens | null {
  return memoryTokens;
}

export async function hydrateTokens(): Promise<StoredTokens | null> {
  let raw: string | null;

  try {
    raw = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  } catch {
    memoryTokens = null;

    return null;
  }

  if (!raw) {
    memoryTokens = null;

    return null;
  }

  try {
    const parsed = storedTokensSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);

      memoryTokens = null;

      return null;
    }

    memoryTokens = parsed.data;

    return parsed.data;
  } catch {
    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    } finally {
      memoryTokens = null;
    }

    return null;
  }
}

export async function saveTokens(tokens: TokenPair): Promise<void> {
  const value: StoredTokens = {
    access_token: tokens.access_token,

    refresh_token: tokens.refresh_token,
  };

  /*
   * Persist first.
   *
   * If storage fails, don't claim
   * that authentication succeeded.
   */
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(value));

  memoryTokens = value;
}

export async function clearTokens(): Promise<void> {
  memoryTokens = null;

  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}
