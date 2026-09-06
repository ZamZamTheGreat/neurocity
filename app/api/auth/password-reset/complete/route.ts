import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditEvents, passwordResetTokens, sessions, users } from "../../../../../db/schema";
import { rateLimitResponse } from "../../../../../lib/security-rate-limit";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json() as { token?: string; password?: string };
    if (typeof token !== "string" || token.length < 40 || typeof password !== "string" || password.length < 10 || new TextEncoder().encode(password).length > 72 || !/[A-Za-z]/.test(password) || !/[^A-Za-z]/.test(password)) return Response.json({ error: "Use a valid reset link and a password of at least 10 characters containing a letter and a number or symbol." }, { status: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const limited = await rateLimitResponse("password-reset-complete", tokenHash, 6);
    if (limited) return limited;
    const db = getDb();
    const [reset] = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
    if (!reset) return Response.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
    await db.transaction(async (tx) => {
      const [claimed] = await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.id, reset.id), isNull(passwordResetTokens.usedAt))).returning({ id: passwordResetTokens.id });
      if (!claimed) throw new Error("Reset token already used");
      await tx.update(users).set({ passwordHash: await hash(password, 12), updatedAt: new Date() }).where(eq(users.id, reset.userId));
      await tx.delete(sessions).where(eq(sessions.userId, reset.userId));
      await tx.insert(auditEvents).values({ actorRef: `account:${reset.userId}`, action: "account.password_reset_completed", resourceType: "user", resourceId: String(reset.userId) });
    });
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The password could not be reset. Request a new link and try again." }, { status: 500 });
  }
}
