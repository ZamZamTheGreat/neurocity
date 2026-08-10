import { hash } from "bcryptjs";
import { and, eq, isNotNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { merchantApplications, merchantMemberships, users } from "../../../../db/schema";
import { createSession, SESSION_COOKIE } from "../../../chatgpt-auth";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json() as { name?: string; email?: string; password?: string };
    const normalized = email?.trim().toLowerCase();
    if (!name?.trim() || !normalized?.includes("@") || !password || password.length < 10) return Response.json({ error: "Name, valid email and a password of at least 10 characters are required." }, { status: 400 });
    const db = getDb();
    if ((await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1)).length) return Response.json({ error: "An account already exists for this email." }, { status: 409 });
    const adminEmail = (process.env.ADMIN_EMAIL ?? "sergejwitbooi@gmail.com").toLowerCase();
    const [user] = await db.insert(users).values({ email: normalized, displayName: name.trim(), passwordHash: await hash(password, 12), platformRole: normalized === adminEmail ? "administrator" : "customer" }).returning();
    const [approved] = await db.select().from(merchantApplications).where(and(eq(merchantApplications.email, normalized), eq(merchantApplications.status, "approved"), isNotNull(merchantApplications.merchantId))).limit(1);
    if (approved?.merchantId) await db.insert(merchantMemberships).values({ merchantId: approved.merchantId, userRef: String(user.id), email: user.email, displayName: user.displayName, role: "owner", status: "active" }).onConflictDoNothing();
    const session = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: session.expiresAt });
    return Response.json({ user: { email: user.email, displayName: user.displayName, platformRole: user.platformRole } }, { status: 201 });
  } catch (error) {
    const incident = crypto.randomUUID();
    console.error("administrator registration failed", { incident, error });
    return Response.json({ error: `Registration is temporarily unavailable. Reference: ${incident}` }, { status: 500 });
  }
}
