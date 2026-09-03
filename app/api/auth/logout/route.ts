import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { hashToken, LEGACY_SESSION_COOKIE, SESSION_COOKIE } from "../../../chatgpt-auth";

const expiredCookie = (name: string) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? jar.get(LEGACY_SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function GET(request: Request) {
  await endSession();
  const requested = new URL(request.url).searchParams.get("return_to") ?? "/";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const headers = new Headers({
    location: new URL(returnTo, request.url).toString(),
    "cache-control": "no-store",
  });
  headers.append("set-cookie", expiredCookie(SESSION_COOKIE));
  if (SESSION_COOKIE !== LEGACY_SESSION_COOKIE)
    headers.append("set-cookie", expiredCookie(LEGACY_SESSION_COOKIE));
  return new Response(null, { status: 303, headers });
}

export async function POST() {
  await endSession();
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  headers.append("set-cookie", expiredCookie(SESSION_COOKIE));
  if (SESSION_COOKIE !== LEGACY_SESSION_COOKIE)
    headers.append("set-cookie", expiredCookie(LEGACY_SESSION_COOKIE));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
