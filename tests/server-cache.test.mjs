import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/server-cache.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const cache = {};
new Function("exports", "globalThis", code)(cache, globalThis);

test("repeated and concurrent public reads share one loader result", async () => {
  let calls = 0;
  const load = async () => { calls += 1; return { value: calls }; };
  const [first, second] = await Promise.all([cache.cachedPublicData("test:coalesce", 60, load), cache.cachedPublicData("test:coalesce", 60, load)]);
  assert.deepEqual(first, { value: 1 });
  assert.deepEqual(second, { value: 1 });
  assert.equal(calls, 1);
});

test("cache invalidation makes the next request load fresh data", async () => {
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await cache.cachedPublicData("test:invalidate", 60, load), 1);
  cache.invalidatePublicCache("test:invalidate");
  assert.equal(await cache.cachedPublicData("test:invalidate", 60, load), 2);
});

test("public headers separate browser and shared-cache lifetimes", () => {
  assert.deepEqual(cache.publicCacheHeaders(30, 120), { "cache-control": "public, max-age=10, s-maxage=30, stale-while-revalidate=120", vary: "Host" });
});
