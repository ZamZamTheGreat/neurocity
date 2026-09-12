import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditEvents, passwordResetTokens, users } from "../../../../../db/schema";
import { sendMail } from "../../../../../lib/mail";
import { emailPanel, neuroCityEmail } from "../../../../../lib/email-template";
import { rateLimitResponse } from "../../../../../lib/security-rate-limit";
import { siteUrl } from "../../../../../lib/site-url";
import { turnstileFailure, verifyTurnstile } from "../../../../../lib/turnstile";

const genericMessage = "If an account exists for that email, a reset link will arrive shortly.";

export async function POST(request: Request) {
  try {
    const { email, turnstileToken } = await request.json() as { email?: string; turnstileToken?: string };
    if (typeof email !== "string" || email.length > 320 || !email.includes("@")) return Response.json({ message: genericMessage });
    const normalized = email.trim().toLowerCase();
    const limited = await rateLimitResponse("password-reset", normalized, 4);
    if (limited) return limited;
    const challenge = await verifyTurnstile(request, turnstileToken, "password_reset");
    if (!challenge.ok) return turnstileFailure(challenge);
    const db = getDb();
    const [user] = await db.select({ id: users.id, email: users.email, displayName: users.displayName, passwordHash: users.passwordHash }).from(users).where(eq(users.email, normalized)).limit(1);
    if (user?.passwordHash) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db.transaction(async (tx) => {
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
        await tx.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
        await tx.insert(auditEvents).values({ actorRef: `account:${user.id}`, action: "account.password_reset_requested", resourceType: "user", resourceId: String(user.id) });
      });
      const resetUrl = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMail({ to: user.email, subject: "Reset your NeuroCity password", text: `Hello ${user.displayName},\n\nUse this secure link within 30 minutes to reset your NeuroCity password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email. Your password has not changed.`, html: neuroCityEmail({ eyebrow: "ACCOUNT SECURITY", title: "Reset your password", intro: `Hello ${user.displayName}. Use the secure button below within 30 minutes to choose a new password.`, bodyHtml: emailPanel("<b>This link expires in 30 minutes.</b><br>If you did not request this, you can safely ignore the message. Your password has not changed.", true), actionLabel: "Reset password", actionUrl: resetUrl, footerNote: "For your security, NeuroCity will never ask you to send your password by email." }) });
    }
    return Response.json({ message: genericMessage }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("password reset request failed", error);
    return Response.json({ message: genericMessage }, { headers: { "cache-control": "no-store" } });
  }
}
