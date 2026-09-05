import assert from "node:assert/strict";
import test from "node:test";
import { default as worker } from "../dist/server/index.js";

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };
const request = (path, init) => worker.fetch(new Request(`https://security.example${path}`, init), env, context);

test("built middleware blocks forged and missing origins before reaching database", async () => {
  for (const headers of [{}, { origin: "https://evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" }]) {
    const response = await request("/api/auth/register", { method: "POST", headers, body: "{}" });
    assert.equal(response.status, 403);
  }
});

test("built HTML supplies a fresh nonce to every executable inline script", async () => {
  const response = await request("/login");
  assert.equal(response.status, 200);
  const csp = response.headers.get("content-security-policy");
  const scriptPolicy = csp.split(";").find(v => v.trim().startsWith("script-src"));
  assert.doesNotMatch(scriptPolicy, /unsafe-inline/);
  const nonce = scriptPolicy.match(/'nonce-([^']+)'/)[1];
  const html = await response.text();
  const inlineScripts = [...html.matchAll(/<script([^>]*)>/g)].filter(m => !/\bsrc=|type="application\/(?:json|ld\+json)"/.test(m[1]));
  assert.ok(inlineScripts.length > 0);
  for (const script of inlineScripts) assert.ok(script[1].includes(`nonce="${nonce}"`), script[0]);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const second = await request("/login");
  assert.ok(!second.headers.get("content-security-policy").includes(`nonce-${nonce}`));
});

test("built GET logout is a confirmation page and never sets a session cookie", async () => {
  const response = await request("/api/auth/logout?return_to=//evil.example");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("location"), null);
  assert.match(await response.text(), /method="post"/);
});
