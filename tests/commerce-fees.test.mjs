import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/commerce-fees.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const fees = {};
new Function("exports", code)(fees);

test("splits each merchant allocation into PayToday, NeuroCity and merchant net", () => {
  assert.deepEqual(fees.calculateMerchantAllocation(100), { grossAmount: 100, providerFee: 2.5, platformFee: 1.5, netAmount: 96 });
  assert.deepEqual(fees.calculateMerchantAllocation(123.45), { grossAmount: 123.45, providerFee: 3.09, platformFee: 1.85, netAmount: 118.51 });
});

test("fee components reconcile exactly to the rounded gross amount", () => {
  for (const gross of [0.01, 9.99, 199.95, 12345.67]) {
    const allocation = fees.calculateMerchantAllocation(gross);
    assert.equal(fees.roundMoney(allocation.providerFee + allocation.platformFee + allocation.netAmount), allocation.grossAmount);
  }
});
