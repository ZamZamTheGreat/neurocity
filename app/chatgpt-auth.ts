import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";

export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null; platformRole: string };
export const SESSION_COOKIE = "neurocity_session";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newSessionToken = () => randomBytes(32).toString("base64url");

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb().select({ id: users.id, displayName: users.displayName, email: users.email, platformRole: users.platformRole }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.status, "active"))).limit(1);
  return row ? { userId: String(row.id), displayName: row.displayName, email: row.email, fullName: row.displayName, platformRole: row.platformRole } : null;
}

export async function createSession(userId: number) {
  const token = newSessionToken(); const expiresAt = new Date(Date.now() + 30 * 86400000);
  await getDb().insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function requireChatGPTUser(returnTo: string) { const user = await getChatGPTUser(); if (user) return user; redirect(`/login?return_to=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/")}`); }
export function chatGPTSignInPath(returnTo: string) { return `/login?return_to=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/")}`; }
export function chatGPTSignOutPath(returnTo = "/") { return `/api/auth/logout?return_to=${encodeURIComponent(returnTo)}`; }
