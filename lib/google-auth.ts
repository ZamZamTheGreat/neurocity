import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_FLOW_COOKIE = "neurocity_google_oauth";
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const oauthValue = () => randomBytes(32).toString("base64url");
export const codeChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
export const safeReturnTo = (value: string | null) => value?.startsWith("/") && !value.startsWith("//") ? value : "/";
export const googleRedirectUri = (request: Request) => `${(process.env.PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "")}/api/auth/google/callback`;
export const flowCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
export type GoogleFlow = { state: string; verifier: string; returnTo: string; create: boolean };
export const encodeGoogleFlow = (flow: GoogleFlow) => Buffer.from(JSON.stringify(flow)).toString("base64url");
export const decodeGoogleFlow = (value?: string): GoogleFlow | null => {
  if (!value) return null;
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as GoogleFlow; } catch { return null; }
};
