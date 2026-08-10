import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchantMemberships, merchants } from "../../../../db/schema";
import { sendMail } from "../../../../lib/mail";
import { getChatGPTUser } from "../../../chatgpt-auth";

const allowedStatuses = new Set(["active", "suspended", "removed"]);

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const { merchantId, status, reason, confirmation } = await request.json() as { merchantId?: number; status?: string; reason?: string; confirmation?: string };
  if (!Number.isInteger(merchantId) || !status || !allowedStatuses.has(status)) return Response.json({ error: "Valid merchant and lifecycle status required." }, { status: 400 });
  if ((status === "suspended" || status === "removed") && !reason?.trim()) return Response.json({ error: "A reason is required for suspension or removal." }, { status: 400 });
  if (status === "removed" && confirmation !== "REMOVE") return Response.json({ error: "Removal confirmation is required." }, { status: 400 });

  const db = getDb();
  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantId!)).limit(1);
  if (!merchant) return Response.json({ error: "Merchant not found." }, { status: 404 });
  const membershipStatus = status === "active" ? "active" : status;
  await db.transaction(async (tx) => {
    await tx.update(merchants).set({ status }).where(and(eq(merchants.id, merchant.id), inArray(merchants.status, [merchant.status])));
    await tx.update(merchantMemberships).set({ status: membershipStatus }).where(eq(merchantMemberships.merchantId, merchant.id));
    await tx.insert(auditEvents).values({ actorRef: user.userId, action: `merchant.${status}`, resourceType: "merchant", resourceId: String(merchant.id), metadata: { previousStatus: merchant.status, reason: reason?.trim() || null } });
  });

  if (merchant.contactEmail) {
    const message = status === "active" ? "Your NeuroCity merchant account and dashboard access are active." : status === "suspended" ? `Your NeuroCity merchant account has been suspended. Reason: ${reason!.trim()}` : `Your NeuroCity merchant account has been removed. Reason: ${reason!.trim()}`;
    await sendMail({ to: merchant.contactEmail, subject: `NeuroCity merchant account: ${status}`, text: `Hello ${merchant.contactName ?? merchant.name},\n\n${message}\n\nContact NeuroCity if you need further information.` }).catch((error) => console.error("merchant lifecycle email failed", error));
  }
  return Response.json({ merchant: { ...merchant, status } });
}
