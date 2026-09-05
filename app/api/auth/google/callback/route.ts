import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../../db";
import { users } from "../../../../../db/schema";
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from "../../../../../lib/privacy";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "../../../../chatgpt-auth";
import { decodeGoogleFlow, GOOGLE_FLOW_COOKIE, googleConfigured, googleRedirectUri } from "../../../../../lib/google-auth";

const loginError = (request: Request, error: string, returnTo = "/") => Response.redirect(new URL(`/login?oauth_error=${error}&return_to=${encodeURIComponent(returnTo)}`, request.url));

export async function GET(request: Request) {
  const jar = await cookies();
  const flow = decodeGoogleFlow(jar.get(GOOGLE_FLOW_COOKIE)?.value);
  jar.delete(GOOGLE_FLOW_COOKIE);
  const url = new URL(request.url), code = url.searchParams.get("code");
  if (!googleConfigured() || !flow || !code || url.searchParams.get("state") !== flow.state) return loginError(request, "invalid_google_response", flow?.returnTo);
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: googleRedirectUri(request), grant_type: "authorization_code", code_verifier: flow.verifier }) });
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokens.access_token) return loginError(request, "google_signin_failed", flow.returnTo);
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json() as { email?: string; email_verified?: boolean; name?: string };
    const email = profile.email?.trim().toLowerCase();
    if (!profileResponse.ok || !email || profile.email_verified !== true) return loginError(request, "google_email_unverified", flow.returnTo);
    const db = getDb();
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user && !flow.create) return loginError(request, "account_not_found", flow.returnTo);
    if (!user) {
      const acceptedAt = new Date();
      [user] = await db.insert(users).values({ email, displayName: profile.name?.trim() || email.split("@")[0], passwordHash: null, emailVerifiedAt: acceptedAt, platformRole: "customer", privacyNoticeVersion: PRIVACY_NOTICE_VERSION, privacyAcceptedAt: acceptedAt, termsVersion: TERMS_VERSION, termsAcceptedAt: acceptedAt }).returning();
    } else if (!user.emailVerifiedAt) {
      [user] = await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id)).returning();
    }
    if (user.status !== "active") return loginError(request, "account_unavailable", flow.returnTo);
    const session = await createSession(user.id);
    jar.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return Response.redirect(new URL(flow.create && flow.returnTo === "/" ? "/account?welcome=1" : flow.returnTo, request.url));
  } catch (error) {
    console.error("Google sign-in failed", { incident: crypto.randomUUID(), error });
    return loginError(request, "google_signin_failed", flow.returnTo);
  }
}
