import { cookies } from "next/headers";
import { codeChallenge, encodeGoogleFlow, flowCookieOptions, GOOGLE_FLOW_COOKIE, googleConfigured, googleRedirectUri, oauthValue, safeReturnTo } from "../../../../lib/google-auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = safeReturnTo(requestUrl.searchParams.get("return_to"));
  if (!googleConfigured()) return Response.redirect(new URL(`/login?oauth_error=google_unavailable&return_to=${encodeURIComponent(returnTo)}`, request.url));
  const state = oauthValue(), verifier = oauthValue();
  (await cookies()).set(GOOGLE_FLOW_COOKIE, encodeGoogleFlow({ state, verifier, returnTo, create: requestUrl.searchParams.get("create") === "1" }), flowCookieOptions);
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleRedirectUri(request), response_type: "code", scope: "openid email profile", state, code_challenge: codeChallenge(verifier), code_challenge_method: "S256", prompt: "select_account" }).toString();
  return Response.redirect(authorization);
}
