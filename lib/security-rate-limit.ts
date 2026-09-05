import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export function clientAddress(request: Request) {
  // Enable only a header overwritten by the ingress. Unset safely shares a bucket.
  const header = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase();
  return header && ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"].includes(header)
    ? (request.headers.get(header)?.split(",").at(-1)?.trim().slice(0, 80) || "unknown") : "unknown";
}

export async function consumeRateLimit(scope: string, identity: string, limit: number, windowSeconds = 600) {
  const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  const result = await getDb().execute(sql`
    INSERT INTO security_rate_limits (key, count, expires_at)
    VALUES (${key}, 1, now() + ${windowSeconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN security_rate_limits.expires_at <= now() THEN 1 ELSE LEAST(security_rate_limits.count + 1, ${limit + 1}) END,
      expires_at = CASE WHEN security_rate_limits.expires_at <= now() THEN now() + ${windowSeconds} * interval '1 second' ELSE security_rate_limits.expires_at END
    RETURNING count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM expires_at - now()))) AS retry_after
  `);
  const row = result.rows[0] as { count: number; retry_after: number };
  if (Math.random() < 0.01) await getDb().execute(sql`DELETE FROM security_rate_limits WHERE key IN (SELECT key FROM security_rate_limits WHERE expires_at < now() LIMIT 500)`);
  return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count), retryAfter: Number(row.retry_after) };
}

export async function rateLimitResponse(scope: string, identity: string, limit: number) {
  try {
    const result = await consumeRateLimit(scope, identity, limit);
    if (!result.allowed) return Response.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "retry-after": String(result.retryAfter), "cache-control": "no-store" } });
    return null;
  } catch {
    return Response.json({ error: "This service is temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
