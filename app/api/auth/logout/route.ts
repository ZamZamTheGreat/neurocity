import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { hashToken, SESSION_COOKIE } from "../../../chatgpt-auth";

const expiredCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function GET(request: Request) {
  await endSession();
  const requested = new URL(request.url).searchParams.get("return_to") ?? "/";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const response = Response.redirect(new URL(returnTo, request.url), 303);
  response.headers.append("set-cookie", expiredCookie());
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function POST() {
  await endSession();
  const response = Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.headers.append("set-cookie", expiredCookie());
  return response;
}
