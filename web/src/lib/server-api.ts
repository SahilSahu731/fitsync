import { cookies, headers as incomingHeaders } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { proxyIdentity } from "./proxy-identity";

const apiOrigin = process.env.API_BASE_URL || "http://localhost:4000";
export const accessCookie = "fitsync_access";
export const refreshCookie = "fitsync_refresh";

export function validOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Next may normalize a loopback hostname internally. Compare the browser's
  // Host as well; use an explicit origin for a deployed reverse proxy.
  const host = request.headers.get("host");
  const directOrigin = host ? `${request.nextUrl.protocol}//${host}` : null;
  return Boolean(origin) && (origin === directOrigin || origin === request.nextUrl.origin ||
    (Boolean(process.env.WEB_ORIGIN) && origin === process.env.WEB_ORIGIN));
}

export async function upstream(path: string, init?: RequestInit) {
  if (process.env.NODE_ENV === "production" && !process.env.WEB_PROXY_SECRET) {
    throw new Error("Production requires the shared web proxy secret.");
  }
  const headers = new Headers(init?.headers);
  if (process.env.WEB_PROXY_SECRET) {
    const identity = proxyIdentity(await incomingHeaders(), process.env.WEB_PROXY_SECRET);
    for (const [key, value] of Object.entries(identity)) headers.set(key, value);
  }
  return fetch(`${apiOrigin.replace(/\/$/, "")}/api${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(60_000) });
}

export function setTokens(response: NextResponse, tokens: { accessToken: string; refreshToken: string }) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(accessCookie, tokens.accessToken, { ...options, maxAge: 15 * 60 });
  response.cookies.set(refreshCookie, tokens.refreshToken, { ...options, maxAge: 30 * 86400 });
}

export function clearTokens(response: NextResponse) {
  response.cookies.set(accessCookie, "", { path: "/", maxAge: 0 });
  response.cookies.set(refreshCookie, "", { path: "/", maxAge: 0 });
}

export async function accessToken() { return (await cookies()).get(accessCookie)?.value; }
export function unavailable() { return NextResponse.json({ message: "FitSync is temporarily unavailable. Please try again." }, { status: 503 }); }
