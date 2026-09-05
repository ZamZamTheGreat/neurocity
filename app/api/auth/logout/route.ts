import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { hashToken, LEGACY_SESSION_COOKIE, SESSION_COOKIE } from "../../../chatgpt-auth";

const expiredCookie = (name: string) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
const safeReturnTo = (value: string | null) => value?.startsWith("/") && !value.startsWith("//") ? value : "/";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? jar.get(LEGACY_SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function GET(request: Request) {
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("return_to"));
  const safeReturn = escapeHtml(returnTo);
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign out · NeuroCity</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 0,#d4af3720,transparent 30%),#0b0b09;color:#f8f4e9;font-family:Arial,sans-serif}.shell{width:min(100%,470px)}.brand{display:flex;align-items:center;gap:11px;width:max-content;margin:0 auto 24px;color:#fff;text-decoration:none;font-size:19px;font-weight:900;letter-spacing:.08em}.mark{display:grid;width:42px;height:42px;place-items:center;border:1px solid #d4af3744;border-radius:12px;background:#17140e;color:#e4bd52;font-size:22px}.brand em{color:#d4af37;font-style:normal}.card{padding:34px;border:1px solid #d4af3738;border-radius:22px;background:#14130f;box-shadow:0 28px 80px #0008;text-align:center}.icon{display:grid;width:52px;height:52px;margin:0 auto 20px;place-items:center;border-radius:15px;background:#d4af3718;color:#efcb65;font-size:22px}.eyebrow{margin:0;color:#d7b755;font-size:9px;font-weight:900;letter-spacing:.15em}.card h1{margin:8px 0 12px;font-size:32px;letter-spacing:-1.2px}.card>p:last-of-type{margin:0;color:#aaa38e;font-size:13px;line-height:1.6}.actions{display:grid;gap:9px;margin-top:26px}.actions button,.actions a{display:grid;min-height:48px;place-items:center;border-radius:10px;font-size:12px;font-weight:900;text-decoration:none}.actions button{border:0;background:linear-gradient(135deg,#e2bf4b,#b88a17);color:#090909;cursor:pointer}.actions a{border:1px solid #ffffff1d;background:#ffffff07;color:#eee9dc}.note{display:block;margin-top:18px;color:#777366;font-size:9px;line-height:1.5}@media(max-width:520px){.card{padding:28px 20px}}</style></head><body><main class="shell"><a class="brand" href="/"><span class="mark">N</span><span>NEURO<em>CITY</em></span></a><section class="card"><div class="icon" aria-hidden="true">↗</div><p class="eyebrow">ACCOUNT SECURITY</p><h1>Sign out of NeuroCity?</h1><p>Your shopping bag will stay saved, but you’ll need to sign in again to view your account, orders and workspaces.</p><form class="actions" method="post" action="/api/auth/logout?return_to=${encodeURIComponent(returnTo)}"><button type="submit">Yes, sign me out</button><a href="${safeReturn}">Stay signed in</a></form><small class="note">This signs you out of NeuroCity on this browser.</small></section></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  await endSession();
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  headers.append("set-cookie", expiredCookie(SESSION_COOKIE));
  if (SESSION_COOKIE !== LEGACY_SESSION_COOKIE)
    headers.append("set-cookie", expiredCookie(LEGACY_SESSION_COOKIE));
  if (request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    headers.set("location", safeReturnTo(new URL(request.url).searchParams.get("return_to")));
    return new Response(null, { status: 303, headers });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
