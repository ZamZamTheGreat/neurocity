import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchantInvitations, merchantMemberships } from "../../../../db/schema";
import { turnstileFailure, verifyTurnstile } from "../../../../lib/turnstile";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const { code, turnstileToken } = await request.json() as { code?: string; turnstileToken?: string };
    const challenge = await verifyTurnstile(request, turnstileToken, "merchant_claim");
    if (!challenge.ok) return turnstileFailure(challenge);
    const hash = createHash("sha256").update(code?.trim().toUpperCase() ?? "").digest("hex");
    const db = getDb();
    const [invite] = await db.select().from(merchantInvitations).where(and(eq(merchantInvitations.codeHash, hash), isNull(merchantInvitations.acceptedAt), gt(merchantInvitations.expiresAt, new Date()))).limit(1);
    if (!invite || (invite.invitedEmail && invite.invitedEmail.toLowerCase() !== user.email.toLowerCase())) return Response.json({ error: "Invitation is invalid, expired, or assigned to another email." }, { status: 403 });
    await db.insert(merchantMemberships).values({ merchantId: invite.merchantId, userRef: user.userId, email: user.email, displayName: user.displayName, role: invite.role, status: "active", createdAt: new Date() }).onConflictDoNothing();
    await db.update(merchantInvitations).set({ acceptedAt: new Date() }).where(eq(merchantInvitations.id, invite.id));
    await db.insert(auditEvents).values({ actorRef: user.userId, action: "merchant.invitation_accepted", resourceType: "merchant", resourceId: String(invite.merchantId), createdAt: new Date() });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Invitation could not be accepted." }, { status: 400 });
  }
}
