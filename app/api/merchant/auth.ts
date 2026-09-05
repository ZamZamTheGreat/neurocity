import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchantMemberships, merchants } from "../../../db/schema";
import { getAuthenticatedSession } from "../../chatgpt-auth";
import { identityShadowEnabled, resolveShadowCurrentActor } from "../../../lib/neuroedge/identity-shadow";

export async function requirePilotMerchant(roles?: string[]) {
  const session = await getAuthenticatedSession();
  if (!session) return null;
  const user = session.user;
  const [row] = await getDb().select({ membership: merchantMemberships, merchantStatus: merchants.status }).from(merchantMemberships).innerJoin(merchants, eq(merchants.id, merchantMemberships.merchantId)).where(and(eq(merchantMemberships.userRef, user.userId), eq(merchantMemberships.status, "active"), inArray(merchants.status, ["pilot", "onboarding", "active"]))).limit(1);
  const membership = row?.membership;
  if (!membership || (roles && !roles.includes(membership.role))) return null;
  const currentActor = identityShadowEnabled()
    ? await resolveShadowCurrentActor(session, { id: membership.id, merchantId: membership.merchantId, role: membership.role })
    : null;
  return { user, merchantId: membership.merchantId, membership, currentActor };
}
