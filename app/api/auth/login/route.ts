import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "../../../chatgpt-auth";
import { rateLimitResponse } from "../../../../lib/security-rate-limit";
import { turnstileFailure, verifyTurnstile } from "../../../../lib/turnstile";

const DUMMY_HASH = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
export async function POST(request: Request) {
  try {
    const { email, password, turnstileToken } = await request.json();
    if (typeof email !== "string" || email.length > 320 || typeof password !== "string" || !password || new TextEncoder().encode(password).length > 72) return Response.json({ error: "Invalid email or password." }, { status: 401 });
    const normalized = email.trim().toLowerCase();
    const limited = await rateLimitResponse("login-account", normalized, 10);
    if (limited) return limited;
    const challenge = await verifyTurnstile(request, turnstileToken, "login");
    if (!challenge.ok) return turnstileFailure(challenge);
    const [user] = await getDb().select().from(users).where(eq(users.email, normalized)).limit(1);
    const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!valid || !user?.passwordHash || user.status !== "active") return Response.json({ error: "Invalid email or password." }, { status: 401 });
    const session = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return Response.json({ user: { email: user.email, displayName: user.displayName, platformRole: user.platformRole } }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Login is temporarily unavailable." }, { status: 500 }); }
}
