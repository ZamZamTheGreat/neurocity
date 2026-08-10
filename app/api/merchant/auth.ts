import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchantMemberships, merchants } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function requirePilotMerchant(roles?: string[]) {
  const user = await getChatGPTUser();
  if (!user) return null;
  const [row] = await getDb().select({ membership: merchantMemberships, merchantStatus: merchants.status }).from(merchantMemberships).innerJoin(merchants, eq(merchants.id, merchantMemberships.merchantId)).where(and(eq(merchantMemberships.userRef, user.userId), eq(merchantMemberships.status, "active"), inArray(merchants.status, ["pilot", "onboarding", "active"]))).limit(1);
  const membership = row?.membership;
  if (!membership || (roles && !roles.includes(membership.role))) return null;
  return { user, merchantId: membership.merchantId, membership };
}
