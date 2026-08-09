import { count, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { merchantMemberships } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false }, { status: 401 });
  const db = getDb();
  const memberships = await db.select().from(merchantMemberships).where(eq(merchantMemberships.userRef, user.userId));
  const [total] = await db.select({ value: count() }).from(merchantMemberships);
  return Response.json({ authenticated: true, user, memberships, canBootstrap: total.value === 0 });
}
