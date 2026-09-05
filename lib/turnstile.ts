import { clientAddress } from "./security-rate-limit";
import { requestOrigin } from "./request-security";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(request: Request, token: unknown, expectedAction: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return { ok: true as const };
    return { ok: false as const, status: 503, error: "Human verification is temporarily unavailable." };
  }
  if (typeof token !== "string" || !token || token.length > 2048) {
    return { ok: false as const, status: 403, error: "Complete the human verification challenge." };
  }
  try {
    const body = new URLSearchParams({ secret, response: token, idempotency_key: crypto.randomUUID() });
    const address = clientAddress(request);
    if (address !== "unknown") body.set("remoteip", address);
    const response = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
    const expectedHost = requestOrigin(request) ? new URL(requestOrigin(request)!).hostname : null;
    if (!response.ok || !result.success || result.action !== expectedAction || !expectedHost || result.hostname !== expectedHost) {
      return { ok: false as const, status: 403, error: "Human verification failed. Please try again." };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, status: 503, error: "Human verification is temporarily unavailable." };
  }
}

export function turnstileFailure(result: Exclude<Awaited<ReturnType<typeof verifyTurnstile>>, { ok: true }>) {
  return Response.json({ error: result.error }, { status: result.status, headers: { "cache-control": "no-store" } });
}
