import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accessToken, clearTokens, refreshCookie, setTokens, unavailable, upstream, validOrigin } from "@/lib/server-api";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if (!validOrigin(request)) return NextResponse.json({ message: "Request origin not allowed." }, { status: 403 });
  const { action } = await context.params;
  if (!["google", "refresh", "logout"].includes(action)) return new NextResponse(null, { status: 404 });
  try {
    let body: object;
    if (action === "google") {
      const input = await request.json().catch(() => null);
      if (typeof input?.idToken !== "string" || input.idToken.length < 50 || input.idToken.length > 16000) {
        return NextResponse.json({ message: "Invalid Google credential." }, { status: 400 });
      }
      body = { idToken: input.idToken };
    } else if (action === "refresh") {
      const token = (await cookies()).get(refreshCookie)?.value;
      if (!token) return NextResponse.json({ message: "Please sign in to continue." }, { status: 401 });
      body = { refreshToken: token };
    } else {
      const token = await accessToken();
      // Logout is best-effort upstream; always clear this browser's cookies.
      try {
        if (token) await upstream("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        else {
          const refreshToken = (await cookies()).get(refreshCookie)?.value;
          if (refreshToken) {
            const rotated = await upstream("/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
            if (rotated.ok) {
              const tokens = await rotated.json();
              await upstream("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${tokens.accessToken}` } });
            }
          }
        }
      } catch { /* Clear browser session even if the API is offline. */ }
      const response = NextResponse.json({ message: "Signed out." });
      clearTokens(response);
      return response;
    }
    const result = await upstream(`/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await result.json();
    if (!result.ok) {
      const response = NextResponse.json(data, { status: result.status });
      if (action === "refresh" && result.status === 401) clearTokens(response);
      return response;
    }
    const { accessToken: access, refreshToken: refresh, ...publicData } = data;
    const response = NextResponse.json(publicData);
    response.headers.set("Cache-Control", "no-store");
    setTokens(response, { accessToken: access, refreshToken: refresh });
    return response;
  } catch { return unavailable(); }
}
