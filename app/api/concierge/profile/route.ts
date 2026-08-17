import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { customerCompanionProfiles } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function profileFor(userId: number) {
  const db = getDb();
  const [profile] = await db.insert(customerCompanionProfiles).values({ userId, companionName: "James" }).onConflictDoNothing().returning();
  if (profile) return profile;
  const [existing] = await db.select().from(customerCompanionProfiles).where(eq(customerCompanionProfiles.userId, userId)).limit(1);
  return existing;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to meet your shopping companion." }, { status: 401 });
  const profile = await profileFor(Number(user.userId));
  return Response.json({ profile: { companionName: profile.companionName, memoryEnabled: profile.memoryEnabled }, customer: { displayName: user.displayName } }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { companionName } = await request.json() as { companionName?: string };
  const name = companionName?.trim().replace(/\s+/g, " ") ?? "";
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ' -]{1,38}$/u.test(name)) return Response.json({ error: "Choose a name between 2 and 40 characters using letters, numbers, spaces, apostrophes or hyphens." }, { status: 400 });
  await profileFor(Number(user.userId));
  const [profile] = await getDb().update(customerCompanionProfiles).set({ companionName: name, updatedAt: new Date() }).where(eq(customerCompanionProfiles.userId, Number(user.userId))).returning();
  return Response.json({ profile: { companionName: profile.companionName, memoryEnabled: profile.memoryEnabled } });
}
