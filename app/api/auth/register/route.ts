import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "../../../chatgpt-auth";
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from "../../../../lib/privacy";
import { turnstileFailure, verifyTurnstile } from "../../../../lib/turnstile";

export async function POST(request: Request) {
  try {
    const { name, email, password, privacyAccepted, termsAccepted, turnstileToken } = await request.json() as { name?: string; email?: string; password?: string; privacyAccepted?: boolean; termsAccepted?: boolean; turnstileToken?: string };
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || name.length > 160 || email.length > 320 || new TextEncoder().encode(password).length > 72) return Response.json({ error: "Invalid registration details." }, { status: 400 });
    const normalized = email.trim().toLowerCase();
    if (!name?.trim() || !normalized?.includes("@") || !password || password.length < 10) return Response.json({ error: "Name, valid email and a password of at least 10 characters are required." }, { status: 400 });
    const db = getDb();
    if ((await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1)).length) return Response.json({ error: "An account already exists for this email." }, { status: 409 });
    if (privacyAccepted !== true) return Response.json({ error: "Accept the NeuroCity privacy notice to create an account." }, { status: 400 });
    if (termsAccepted !== true) return Response.json({ error: "Accept the NeuroCity Terms & Conditions to create an account." }, { status: 400 });
    const challenge = await verifyTurnstile(request, turnstileToken, "register");
    if (!challenge.ok) return turnstileFailure(challenge);
    const acceptedAt = new Date();
    const [user] = await db.insert(users).values({ email: normalized, displayName: name.trim(), passwordHash: await hash(password, 12), platformRole: "customer", privacyNoticeVersion: PRIVACY_NOTICE_VERSION, privacyAcceptedAt: acceptedAt, termsVersion: TERMS_VERSION, termsAcceptedAt: acceptedAt }).returning();
    const session = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return Response.json({ user: { email: user.email, displayName: user.displayName, platformRole: user.platformRole } }, { status: 201 });
  } catch (error) {
    const incident = crypto.randomUUID();
    console.error("administrator registration failed", { incident, error });
    return Response.json({ error: `Registration is temporarily unavailable. Reference: ${incident}` }, { status: 500 });
  }
}
