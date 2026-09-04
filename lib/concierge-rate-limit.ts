type Bucket = { count: number; resetsAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 10 * 60 * 1000;
const LIMITS = { search: 20, visual: 5 } as const;

function clientAddress(request: Request) {
  return (request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 80);
}

export function checkConciergeRateLimit(request: Request, kind: keyof typeof LIMITS) {
  const now = Date.now();
  if (buckets.size > 5_000) for (const [key, bucket] of buckets) if (bucket.resetsAt <= now) buckets.delete(key);
  const key = `${kind}:${clientAddress(request)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetsAt <= now ? { count: 0, resetsAt: now + WINDOW_MS } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  const retryAfter = Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000));
  return { allowed: bucket.count <= LIMITS[kind], remaining: Math.max(0, LIMITS[kind] - bucket.count), retryAfter };
}

export function rateLimitHeaders(result: ReturnType<typeof checkConciergeRateLimit>) {
  return { "x-ratelimit-remaining": String(result.remaining), "retry-after": String(result.retryAfter) };
}
