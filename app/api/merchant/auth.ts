import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchantMemberships } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function requirePilotMerchant(roles?: string[]) {
  const user = await getChatGPTUser();
  if (!user) return null;
  const [membership] = await getDb().select().from(merchantMemberships).where(and(eq(merchantMemberships.userRef, user.userId), eq(merchantMemberships.status, "active"))).limit(1);
  if (!membership || (roles && !roles.includes(membership.role))) return null;
  return { user, merchantId: membership.merchantId, membership };
}
