import { clientAddress, consumeRateLimit } from "./security-rate-limit";
const LIMITS = { search: 20, visual: 5 } as const;
export async function checkConciergeRateLimit(request: Request, kind: keyof typeof LIMITS) {
  return consumeRateLimit(`concierge:${kind}`, clientAddress(request), LIMITS[kind]);
}

export function rateLimitHeaders(result: Awaited<ReturnType<typeof checkConciergeRateLimit>>) {
  return { "x-ratelimit-remaining": String(result.remaining), "retry-after": String(result.retryAfter) };
}
