import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);

async function render(path = "/") {
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the NeuroCity network gateway", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /NeuroCity/);
  assert.match(html, /shopping world/);
  assert.match(html, /NeuroCity Marketplace/);
  assert.match(html, /Digital malls/);
  assert.match(html, /James/);
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Review your order/);
  assert.match(source, /Pay on collection/);
  assert.match(source, /\/api\/orders/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("keeps the commerce experience at the marketplace route", async () => {
  const response = await render("/marketplace");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sell on NeuroCity/);
  assert.match(html, /How it works/);
  assert.match(html, /Search approved stores/);
});
