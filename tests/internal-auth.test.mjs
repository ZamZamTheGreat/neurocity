import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { timingSafeEqual } from "node:crypto";

const source = await readFile(new URL("../lib/internal-auth.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const auth = {};
new Function("require", "exports", "Buffer", "process", code)((name) => name === "node:crypto" ? { timingSafeEqual } : {}, auth, Buffer, process);

test("operations endpoint requires the exact bearer token", () => {
  const previous = process.env.ORDER_OPERATIONS_TOKEN;
  process.env.ORDER_OPERATIONS_TOKEN = "test-secret-value";
  try {
    assert.equal(auth.hasValidOperationsToken(new Request("https://neurocity.city", { headers: { authorization: "Bearer test-secret-value" } })), true);
    assert.equal(auth.hasValidOperationsToken(new Request("https://neurocity.city", { headers: { authorization: "Bearer wrong-secret" } })), false);
    assert.equal(auth.hasValidOperationsToken(new Request("https://neurocity.city")), false);
  } finally {
    if (previous === undefined) delete process.env.ORDER_OPERATIONS_TOKEN; else process.env.ORDER_OPERATIONS_TOKEN = previous;
  }
});
