import { NextRequest, NextResponse } from "next/server";
import { accessToken, unavailable, upstream, validOrigin } from "@/lib/server-api";

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (request.method !== "GET" && !validOrigin(request)) return NextResponse.json({ message: "Request origin not allowed." }, { status: 403 });
  const { path } = await context.params;
  if (!["exercises", "me"].includes(path[0]) || path.some(part => !/^[a-zA-Z0-9_-]+$/.test(part))) return new NextResponse(null, { status: 404 });
  const token = await accessToken();
  if (!token) return NextResponse.json({ message: "Please sign in to continue." }, { status: 401 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 26 * 1024 * 1024) return NextResponse.json({ message: "Media exceeds the 25 MB limit." }, { status: 413 });
  try {
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    const body = request.method === "GET" ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 26 * 1024 * 1024) return NextResponse.json({ message: "Media exceeds the 25 MB limit." }, { status: 413 });
    const result = await upstream(`/${path.join("/")}${request.nextUrl.search}`, { method: request.method, headers, body });
    return new NextResponse(result.status === 204 ? null : result.body, { status: result.status, headers: { "Content-Type": result.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" } });
  } catch { return unavailable(); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
