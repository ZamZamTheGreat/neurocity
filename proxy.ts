import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function publicRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return Response.json({ error: "Cross-site request blocked." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== publicRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
