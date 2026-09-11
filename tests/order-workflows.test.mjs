import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/order-workflows.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const workflow = {};
new Function("exports", code)(workflow);

test("merchant confirmation cannot begin fulfilment before payment", () => {
  assert.deepEqual(workflow.allowedOrderTransitions("pending_merchant_confirmation", "merchant"), ["accepted", "rejected"]);
  assert.deepEqual(workflow.allowedOrderTransitions("accepted", "merchant"), []);
  assert.deepEqual(workflow.allowedOrderTransitions("paid", "merchant"), ["preparing"]);
});

test("customer can cancel before payment and payment provider owns payment state", () => {
  assert.deepEqual(workflow.allowedOrderTransitions("pending_merchant_confirmation", "customer"), ["cancelled"]);
  assert.deepEqual(workflow.allowedOrderTransitions("accepted", "customer"), ["payment_processing", "cancelled"]);
  assert.deepEqual(workflow.allowedOrderTransitions("payment_processing", "payment_provider"), ["paid", "accepted"]);
});

test("invalid actors and skipped workflow stages are rejected", () => {
  assert.throws(() => workflow.assertOrderTransition("accepted", "preparing", "merchant"), /Cannot move/);
  assert.throws(() => workflow.assertOrderTransition("pending_merchant_confirmation", "paid", "payment_provider"), /Cannot move/);
});

test("confirmation and payment deadlines are exactly 30 minutes", () => {
  const start = new Date("2026-09-11T10:00:00.000Z");
  assert.equal(workflow.deadlineFrom(start, workflow.MERCHANT_CONFIRMATION_MINUTES).toISOString(), "2026-09-11T10:30:00.000Z");
  assert.equal(workflow.deadlineFrom(start, workflow.CUSTOMER_PAYMENT_MINUTES).toISOString(), "2026-09-11T10:30:00.000Z");
});
