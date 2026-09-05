export function allowedOrigins() {
  const configured = [process.env.PUBLIC_SITE_URL, ...(process.env.SECURITY_ALLOWED_ORIGINS ?? "").split(",")].filter(Boolean) as string[];
  return new Set(configured.map((value) => new URL(value.trim()).origin));
}

export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  if (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return url.origin;
  const hosts = [request.headers.get("host") ?? url.host, request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()].filter(Boolean);
  return [...allowedOrigins()].find((origin) => hosts.includes(new URL(origin).host)) ?? null;
}

export function isSameOriginMutation(request: Request) {
  const expected = requestOrigin(request);
  return Boolean(expected && request.headers.get("origin") === expected && !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? ""));
}

export async function readBoundedBody(request: Request, maxBytes: number) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error("Request too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { void reader.cancel(); throw new Error("Request too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export function contentSecurityPolicy(nonce: string) {
  return `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://admin.today.com.na https://admin.today-ww.net; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com; connect-src 'self' https://admin.today.com.na https://admin.today-ww.net https://*.google-analytics.com https://www.googletagmanager.com${process.env.NODE_ENV === "development" ? " ws: http://localhost:*" : ""};${process.env.NODE_ENV === "production" ? " upgrade-insecure-requests;" : ""}`;
}
