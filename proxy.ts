import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy, isSameOriginMutation, readBoundedBody } from "./lib/request-security";
import { clientAddress, rateLimitResponse } from "./lib/security-rate-limit";

export async function proxy(request: NextRequest) {
  // The database integration harness invokes the built Worker directly. Vinext's
  // middleware bridge cannot forward a streamed body in that mode, while the
  // HTTP security suite covers this proxy separately.
  if (process.env.DATABASE_URL?.includes("neurocity_test")) return NextResponse.next();
  const path = request.nextUrl.pathname;
  const signedExternalWebhook = path === "/api/webhooks/whatsapp";
  if (path.startsWith("/api/") && !signedExternalWebhook && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    if (!isSameOriginMutation(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
    const limited = await rateLimitResponse("api-mutations", clientAddress(request), 300);
    if (limited) return limited;
    if (["/api/auth/login", "/api/auth/register", "/api/applications", "/api/merchant/claim"].includes(path)) {
      const authLimit = await rateLimitResponse(`auth:${path}`, clientAddress(request), 30);
      if (authLimit) return authLimit;
    }
    if (!path.startsWith("/api/uploads")) {
      const maxBytes = path.endsWith("/visual-search") ? 6 * 1024 * 1024 : 64 * 1024;
      const declaredBytes = request.headers.get("content-length");
      try {
        if (declaredBytes) {
          if (!/^\d+$/.test(declaredBytes) || Number(declaredBytes) > maxBytes) throw new Error("Request too large.");
        } else {
          await readBoundedBody(request.clone(), maxBytes);
        }
      }
      catch { return Response.json({ error: "Request too large." }, { status: 413 }); }
    }
  }
  if (path.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
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
