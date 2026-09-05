import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(path, deps) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => deps[name] ?? {}, exports);
  return exports;
}
const preorder = await load("../lib/preorders.ts", {});
const table = (name) => new Proxy({ name }, { get: (target, field) => target[field] ?? `${name}.${String(field)}` });
const schema = Object.fromEntries(["auditEvents", "checkoutGroups", "customerAddresses", "customerCartItems", "merchantDeliveryZones", "merchantPaymentAllocations", "merchants", "orderItems", "orders", "orderStatusEvents", "paymentTransactions", "productVariants", "products", "variantInventory"].map((name) => [name, table(name)]));
const orm = { and: (...x) => x, eq: (...x) => x, inArray: (...x) => x, sql: (...x) => x };

async function checkout(availability) {
  const writes = [];
  const cart = [{ cartId: 1, variantId: 2, quantity: 2, variantSku: "SKU", variantTitle: "M / Black", size: "M", color: "Black", variantPrice: 100, salePrice: null, variantStatus: "active", productId: 3, productName: "Shirt", productStatus: "published", merchantId: 4, availability }];
  const results = [cart, [{ id: 4, name: "Store", fulfillmentMethods: ["pickup"] }], [], [], [], [{ id: 1 }]];
  const db = {
    select() { const rows = results.shift(); const query = { from: () => query, innerJoin: () => query, where: () => Promise.resolve(rows) }; return query; },
    insert(target) { return { values(value) { writes.push({ table: target.name, value }); return { then: (resolve) => Promise.resolve().then(resolve), returning: async () => [{ id: 10, ...value }] }; } }; },
    update() { throw new Error("Preorders must not reserve physical stock"); },
    delete() { return { where: async () => {} }; },
    execute: async () => {},
    transaction: async (fn) => fn(db),
  };
  // Payment records can be updated without touching inventory.
  db.update = (target) => {
    assert.notEqual(target.name, "variantInventory");
    return { set: () => ({ where: async () => {} }) };
  };
  const route = await load("../app/api/orders/route.ts", {
    "drizzle-orm": orm,
    "node:crypto": { randomUUID: () => "12345678901234567890" },
    "../../chatgpt-auth": { getChatGPTUser: async () => ({ userId: "1", displayName: "Test Customer", email: "test@example.com" }) },
    "../../../db": { getDb: () => db },
    "../../../db/schema": schema,
    "../../../lib/preorders": preorder,
    "../../../lib/order-mail": { sendOrderPlacedNotifications: async () => {} },
    "../../../lib/paytoday": { getPayTodayAvailability: () => ({ configured: true }), createPayTodayPayment: async () => ({ checkoutUrl: "https://example.com/payment" }) },
  });
  const response = await route.POST(new Request("http://localhost/api/orders", { method: "POST", body: JSON.stringify({ fulfillment: [{ merchantId: 4, fulfillmentMethod: "pickup" }] }) }));
  return { response, body: await response.json(), writes };
}

test("a zero-stock preorder creates a priced order with a permanent preorder snapshot", async () => {
  const { response, body, writes } = await checkout("preorder");
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.checkout.total, 200);
  const line = writes.find((write) => write.table === "orderItems").value[0];
  assert.equal(line.variantSnapshot, "[Preorder] M / Black");
  assert.equal(preorder.isPreorderLine(line), true);
});
test("a regular zero-stock product still cannot check out", async () => {
  const { response, body } = await checkout("available");
  assert.equal(response.status, 400);
  assert.match(body.error, /enough available stock/);
});
test("unavailable and sold-out products remain blocked", async () => {
  for (const status of ["unavailable", "out_of_stock"]) {
    const { response } = await checkout(status);
    assert.equal(response.status, 409);
  }
});
test("payment failure restores a preorder to the bag without releasing other reservations", async () => {
  const items = [{ variantId: 2, quantity: 2, variantSnapshot: "[Preorder] M / Black" }];
  const rows = [[{ id: 1 }], items];
  const tx = {
    select() { const result = rows.shift(); assert.ok(result, "No inventory read should occur"); return { from: () => ({ where: async () => result }) }; },
    insert: () => ({ values: () => ({ onConflictDoNothing: async () => {} }) }),
    update(target) { assert.notEqual(target.name, "variantInventory"); return { set: () => ({ where: async () => {} }) }; },
  };
  const settlements = await load("../lib/settlements.ts", { "drizzle-orm": orm, "../db/schema": schema, "./preorders": preorder });
  await settlements.cancelCheckoutAllocationsAndReleaseStock(tx, 1, 1);
  assert.equal(rows.length, 0);
});
