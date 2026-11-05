import { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { getBackendURL } from "@/lib/backend";

async function handleRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const method = request.method;
  const isRead = method === "GET" || method === "HEAD";
  const facilityRoot = path.length === 1 && path[0] === "facilities";
  const facilityId = path.length === 2 && path[0] === "facilities" && /^[a-f0-9]{24}$/i.test(path[1]);
  const mine = path.length === 2 && path[0] === "facilities" && ["mine", "my"].includes(path[1]);
  const bookings = path.length === 2 && path[0] === "facilities" && path[1] === "booking";
  const bookingId = path.length === 3 && path[0] === "facilities" && path[1] === "booking" && /^[a-f0-9]{24}$/i.test(path[2]);
  const featured = path.length === 2 && path[0] === "facilities" && path[1] === "featured";
  const publicRead = isRead && (facilityRoot || facilityId || featured);
  const allowed = publicRead || (facilityRoot && method === "POST") || (mine && isRead) ||
    (bookings && (isRead || method === "POST")) || (facilityId && ["PATCH", "PUT", "DELETE"].includes(method)) ||
    (bookingId && (isRead || method === "DELETE"));
  if (!allowed) return Response.json({ message: "Route not found." }, { status: 404 });

  const privateHeaders = { "Cache-Control": "private, no-store" };

  let stage = "configuration";
  try {
    const backendURL = getBackendURL();
    const upstreamHeaders = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) upstreamHeaders.set("content-type", contentType);

    if (!publicRead) {
      stage = "authentication";
      const { auth, trustedOrigins, jwtEnabled } = getAuth();
      // Keep origin and session checks on every protected operation.
      if (!isRead && !trustedOrigins.includes(request.headers.get("origin") || "")) {
        return Response.json({ message: "This request origin is not allowed." }, { status: 403, headers: privateHeaders });
      }
      const session = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
      if (!session) return Response.json({ message: "Please log in to continue." }, { status: 401, headers: privateHeaders });
      upstreamHeaders.set("cookie", request.headers.get("cookie") || "");
      if (jwtEnabled) {
        const { token } = await auth.api.getToken({ headers: request.headers });
        upstreamHeaders.set("authorization", `Bearer ${token}`);
      }
    }

    stage = "backend";
    const url = new URL(`/${path.map(encodeURIComponent).join("/")}`, backendURL);
    url.search = request.nextUrl.search;
    const response = await fetch(url, {
      method,
      headers: upstreamHeaders,
      ...(!isRead ? { body: await request.text() } : {}),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if (response.status >= 300 && response.status < 400) {
      return Response.json({ message: "The API redirected instead of returning data. Check its URL and Vercel Deployment Protection." }, { status: 502, headers: privateHeaders });
    }
    if (method !== "HEAD" && response.status !== 204 && !response.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ message: "The API returned an invalid response. Check its URL and deployment access." }, { status: 502, headers: privateHeaders });
    }
    return new Response(method === "HEAD" || response.status === 204 ? null : await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        ...privateHeaders,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // Keep diagnostics server-side and never log cookies, JWTs, or request bodies.
      const cause = error instanceof Error && error.cause && typeof error.cause === "object"
        ? error.cause as { code?: string }
        : undefined;
      console.error("Backend proxy request failed", {
        backend: process.env.BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || "(development default)",
        stage,
        method,
        path: path.join("/"),
        error: error instanceof Error ? error.message : "Unknown error",
        code: cause?.code,
      });
    }
    const message = stage === "authentication"
      ? "Sign-in verification is temporarily unavailable. Please try again."
      : stage === "configuration"
        ? "The API connection is not configured correctly. Please contact support."
        : "The studio API is temporarily unavailable. Please try again.";
    return Response.json({ message }, { status: 503, headers: privateHeaders });
  }
}

export { handleRequest as GET, handleRequest as POST, handleRequest as PATCH, handleRequest as PUT, handleRequest as DELETE, handleRequest as HEAD };
