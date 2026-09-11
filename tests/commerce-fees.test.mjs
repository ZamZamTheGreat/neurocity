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

test("multi-merchant fees reconcile to the exact checkout-level PayToday and NeuroCity fees", () => {
  const rows = fees.calculateMerchantAllocations([10.01, 10.01, 10.01]);
  assert.equal(fees.sumMoney(rows.map((row) => row.grossAmount)), 30.03);
  assert.equal(fees.sumMoney(rows.map((row) => row.providerFee)), 0.75);
  assert.equal(fees.sumMoney(rows.map((row) => row.platformFee)), 0.45);
  assert.equal(fees.sumMoney(rows.map((row) => row.netAmount)), 28.83);
  for (const row of rows) assert.equal(fees.sumMoney([row.providerFee, row.platformFee, row.netAmount]), row.grossAmount);
});
