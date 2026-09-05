import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy, isSameOriginMutation, readBoundedBody } from "./lib/request-security";
import { clientAddress, rateLimitResponse } from "./lib/security-rate-limit";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    if (!isSameOriginMutation(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
    const limited = await rateLimitResponse("api-mutations", clientAddress(request), 300);
    if (limited) return limited;
    if (["/api/auth/login", "/api/auth/register", "/api/applications", "/api/merchant/claim"].includes(path)) {
      const authLimit = await rateLimitResponse(`auth:${path}`, clientAddress(request), 30);
      if (authLimit) return authLimit;
    }
    if (!path.startsWith("/api/uploads")) {
      try { await readBoundedBody(request.clone(), path.endsWith("/visual-search") ? 6 * 1024 * 1024 : 64 * 1024); }
      catch { return Response.json({ error: "Request too large." }, { status: 413 }); }
    }
  }
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const csp = contentSecurityPolicy(nonce);
  const headers = new Headers(request.headers);
  headers.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: "/((?!assets/|_next/|favicon.ico).*)" };
