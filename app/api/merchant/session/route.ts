import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { merchantMemberships, merchants } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false }, { status: 401 });
  const db = getDb();
  const memberships = await db.select({ id: merchantMemberships.id, merchantId: merchantMemberships.merchantId, userRef: merchantMemberships.userRef, email: merchantMemberships.email, displayName: merchantMemberships.displayName, role: merchantMemberships.role, status: merchantMemberships.status, createdAt: merchantMemberships.createdAt }).from(merchantMemberships).innerJoin(merchants, eq(merchants.id, merchantMemberships.merchantId)).where(and(eq(merchantMemberships.userRef, user.userId), eq(merchantMemberships.status, "active"), inArray(merchants.status, ["pilot", "onboarding", "active"])));
  const [total] = await db.select({ value: count() }).from(merchantMemberships);
  return Response.json({ authenticated: true, user, memberships, canBootstrap: total.value === 0 });
}
