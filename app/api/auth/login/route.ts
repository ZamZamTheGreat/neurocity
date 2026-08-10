import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { createSession, SESSION_COOKIE } from "../../../chatgpt-auth";
export async function POST(request: Request) { try { const { email, password } = await request.json() as { email?: string; password?: string }; const [user] = await getDb().select().from(users).where(eq(users.email, email?.trim().toLowerCase() ?? "")).limit(1); if (!user?.passwordHash || !password || !(await compare(password, user.passwordHash))) return Response.json({ error: "Invalid email or password." }, { status: 401 }); const session = await createSession(user.id); (await cookies()).set(SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: session.expiresAt }); return Response.json({ user: { email: user.email, displayName: user.displayName, platformRole: user.platformRole } }); } catch { return Response.json({ error: "Login is temporarily unavailable." }, { status: 500 }); } }
