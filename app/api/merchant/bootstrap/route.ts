import { count } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchantMemberships } from "../../../../db/schema";
import { ensurePilotCatalogue } from "../../../../db/catalogue";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  await ensurePilotCatalogue(); const db = getDb();
  const [total] = await db.select({ value: count() }).from(merchantMemberships);
  if (total.value !== 0) return Response.json({ error: "Workspace activation is already complete." }, { status: 409 });
  await db.insert(merchantMemberships).values({ merchantId: 1, userRef: user.userId, email: user.email, displayName: user.displayName, role: "owner", status: "active", createdAt: new Date() });
  await db.insert(auditEvents).values({ actorRef: user.userId, action: "merchant.workspace_activated", resourceType: "merchant", resourceId: "1", createdAt: new Date() });
  return Response.json({ ok: true });
}
