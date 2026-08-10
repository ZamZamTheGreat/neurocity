import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { hashToken, SESSION_COOKIE } from "../../../chatgpt-auth";
export async function POST() { const jar = await cookies(); const token = jar.get(SESSION_COOKIE)?.value; if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token))); jar.delete(SESSION_COOKIE); return Response.json({ ok: true }); }
