import { isPublicCatalogRead } from "@/lib/catalog-access";
import { NextRequest, NextResponse } from "next/server";
import { accessToken, unavailable, upstream, validOrigin } from "@/lib/server-api";
import { readRequestBody, RequestBodyTooLarge } from "@/lib/request-body";

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (request.method !== "GET" && !validOrigin(request))
    return NextResponse.json({ message: "Request origin not allowed." }, { status: 403 });
  const { path } = await context.params;
  if (
    ![
      "exercises",
      "me",
      "catalog",
      "explore",
      "workouts",
      "coaching",
      "companion",
      "site",
    ].includes(path[0]) ||
    path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))
  )
    return new NextResponse(null, { status: 404 });
  const token = await accessToken();
  const publicRead =
    isPublicCatalogRead(request.method, path) ||
    (request.method === "GET" &&
      path.length === 2 &&
      path[0] === "site" &&
      path[1] === "mobile-download") ||
    (request.method === "GET" &&
      path.length === 3 &&
      path[0] === "companion" &&
      path[1] === "shared" &&
      /^[A-Za-z0-9_-]{43}$/.test(path[2]));
  if (!token && !publicRead)
    return NextResponse.json({ message: "Please sign in to continue." }, { status: 401 });
  try {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const expectedOwner = request.headers.get("x-fitsync-owner");
    if (expectedOwner) headers.set("X-FitSync-Owner", expectedOwner);
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    const body =
      request.method === "GET" ? undefined : await readRequestBody(request, 26 * 1024 * 1024);
    const result = await upstream(`/${path.join("/")}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: body?.buffer,
    });
    return new NextResponse(result.status === 204 ? null : result.body, {
      status: result.status,
      headers: {
        "Content-Type": result.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge)
      return NextResponse.json({ message: "Media exceeds the 25 MB limit." }, { status: 413 });
    return unavailable();
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
