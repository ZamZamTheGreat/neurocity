import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";
import { createUuidV7 } from "../lib/neuroedge/uuid-v7";

export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null; platformRole: string };
export type LegacyAuthenticatedSession = { sessionId: number; coreActorSessionId: string | null; expiresAt: Date; user: ChatGPTUser };
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-neurocity_session" : "neurocity_session";
export const LEGACY_SESSION_COOKIE = "neurocity_session";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newSessionToken = () => randomBytes(32).toString("base64url");

export async function getAuthenticatedSession(): Promise<LegacyAuthenticatedSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? (SESSION_COOKIE !== LEGACY_SESSION_COOKIE ? jar.get(LEGACY_SESSION_COOKIE)?.value : undefined);
  if (!token) return null;
  const db = getDb();
  const [row] = await db.select({ sessionId: sessions.id, coreActorSessionId: sessions.coreActorSessionId, expiresAt: sessions.expiresAt, id: users.id, displayName: users.displayName, email: users.email, platformRole: users.platformRole }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.status, "active"))).limit(1);
  if (!row) return null;
  return { sessionId: row.sessionId, coreActorSessionId: row.coreActorSessionId, expiresAt: row.expiresAt, user: { userId: String(row.id), displayName: row.displayName, email: row.email, fullName: row.displayName, platformRole: row.platformRole } };
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  return (await getAuthenticatedSession())?.user ?? null;
}

export async function createSession(userId: number) {
  const token = newSessionToken(); const expiresAt = new Date(Date.now() + 7 * 86400000);
  await getDb().delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  await getDb().insert(sessions).values({ userId, tokenHash: hashToken(token), coreActorSessionId: process.env.NEUROEDGE_IDENTITY_SHADOW_ENABLED === "true" ? createUuidV7() : null, expiresAt });
  return { token, expiresAt };
}

export const sessionCookieOptions = (expires: Date) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", expires, priority: "high" as const });

export async function requireChatGPTUser(returnTo: string) { const user = await getChatGPTUser(); if (user) return user; redirect(`/login?return_to=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/")}`); }
export function chatGPTSignInPath(returnTo: string) { return `/login?return_to=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/")}`; }
export function chatGPTSignOutPath(returnTo = "/") { return `/api/auth/logout?return_to=${encodeURIComponent(returnTo)}`; }
