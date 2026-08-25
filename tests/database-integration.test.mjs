import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

if (!process.env.DATABASE_URL?.includes("neurocity_test")) {
  throw new Error("Integration tests require the isolated neurocity_test database.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("integration", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const workerEnv = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const workerContext = { waitUntil() {}, passThroughOnException() {} };

async function api(path, { cookie, json, ...init } = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  if (json !== undefined) headers.set("content-type", "application/json");
  return worker.fetch(new Request(`http://localhost${path}`, {
    ...init,
    headers,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  }), workerEnv, workerContext);
}

function sessionCookie(response) {
  const value = response.headers.get("set-cookie")?.match(/neurocity_session=([^;]+)/)?.[1];
  assert.ok(value, "Expected NeuroCity session cookie");
  return `neurocity_session=${value}`;
}

test.after(async () => pool.end());

test("database-backed customer, merchant and checkout journey", async (t) => {
  let response = await api("/api/auth/register", {
    method: "POST",
    json: { name: "Integration Shopper", email: " Shopper@Test.Example ", password: "Strong-Test-Password-2026" },
  });
  assert.equal(response.status, 201);
  const customerCookie = sessionCookie(response);
  assert.equal((await response.json()).user.email, "shopper@test.example");

  await t.test("rejects duplicate normalized email", async () => {
    const duplicate = await api("/api/auth/register", {
      method: "POST",
      json: { name: "Duplicate", email: "SHOPPER@test.example", password: "Another-Strong-Password" },
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: "An account already exists for this email." });
  });

  await t.test("rejects an incorrect password and accepts the correct password", async () => {
    const rejected = await api("/api/auth/login", { method: "POST", json: { email: "shopper@test.example", password: "wrong-password" } });
    assert.equal(rejected.status, 401);
    const accepted = await api("/api/auth/login", { method: "POST", json: { email: " SHOPPER@test.example ", password: "Strong-Test-Password-2026" } });
    assert.equal(accepted.status, 200);
    sessionCookie(accepted);
  });

  const customer = (await pool.query("select id from users where email = $1", ["shopper@test.example"])).rows[0];
  const merchantA = (await pool.query(`insert into merchants (name, slug, category, status, is_public, fulfillment_methods, payment_settings)
    values ('Pilot Store A', 'pilot-store-a', 'Fashion', 'pilot', true, '["pickup","merchant_delivery"]',
    '{"payOnCollectionEnabled":true,"eftEnabled":true,"bankName":"Test Bank","accountHolder":"Pilot Store A","accountType":"Business","accountNumber":"123456","branchCode":"082"}') returning id`)).rows[0];
  const merchantB = (await pool.query(`insert into merchants (name, slug, category, status, is_public, fulfillment_methods, payment_settings)
    values ('Pilot Store B', 'pilot-store-b', 'Beauty', 'pilot', true, '["pickup"]', '{"payOnCollectionEnabled":true}') returning id`)).rows[0];
  const branchA = (await pool.query("insert into store_branches (merchant_id, name, address, pickup_enabled, delivery_enabled, is_primary) values ($1, 'Main', 'Windhoek', true, true, true) returning id", [merchantA.id])).rows[0];
  const productA = (await pool.query("insert into products (merchant_id, sku, name, description, price, status) values ($1, 'A-001', 'Pilot Jacket', 'Test jacket', 500, 'published') returning id", [merchantA.id])).rows[0];
  const productB = (await pool.query("insert into products (merchant_id, sku, name, description, price, status) values ($1, 'B-001', 'Private Merchant Product', 'Must remain isolated', 300, 'published') returning id", [merchantB.id])).rows[0];
  const variantA = (await pool.query("insert into product_variants (product_id, sku, title, size, color, price, status) values ($1, 'A-001-M', 'Medium / Black', 'M', 'Black', 500, 'active') returning id", [productA.id])).rows[0];
  await pool.query("insert into product_variants (product_id, sku, title, price, status) values ($1, 'B-001-ONE', 'One size', 300, 'active')", [productB.id]);
  await pool.query("insert into variant_inventory (variant_id, branch_id, on_hand, reserved, safety_stock) values ($1, $2, 5, 0, 1)", [variantA.id, branchA.id]);
  await pool.query("insert into merchant_memberships (merchant_id, user_ref, email, display_name, role, status) values ($1, $2, $3, 'Integration Shopper', 'owner', 'active')", [merchantA.id, String(customer.id), "shopper@test.example"]);
  await pool.query("insert into merchant_delivery_zones (merchant_id, area, fee, estimated_time) values ($1, 'Pioneerspark', 65, '2–4 hours')", [merchantA.id]);
  const address = (await pool.query("insert into customer_addresses (user_id, label, recipient_name, phone, address_line_1, suburb) values ($1, 'Home', 'Integration Shopper', '0810000000', '1 Test Street', '  PIONEERSPARK ') returning id", [customer.id])).rows[0];

  await t.test("quotes only the signed-in customer address", async () => {
    const quote = await api(`/api/orders/quote?merchantId=${merchantA.id}&addressId=${address.id}`, { cookie: customerCookie });
    assert.equal(quote.status, 200);
    assert.deepEqual(await quote.json(), { supported: true, deliveryFee: 65, area: "Pioneerspark", estimatedTime: "2–4 hours" });
    const otherAddress = (await pool.query("insert into users (email, display_name) values ('other@test.example', 'Other') returning id")).rows[0];
    const foreign = (await pool.query("insert into customer_addresses (user_id, label, recipient_name, phone, address_line_1, suburb) values ($1, 'Other', 'Other', '0811111111', '2 Other Street', 'Pioneerspark') returning id", [otherAddress.id])).rows[0];
    const denied = await api(`/api/orders/quote?merchantId=${merchantA.id}&addressId=${foreign.id}`, { cookie: customerCookie });
    assert.equal(denied.status, 404);
  });

  await t.test("isolates merchant catalogue data", async () => {
    const products = await api("/api/merchant/products", { cookie: customerCookie });
    assert.equal(products.status, 200);
    const body = await products.json();
    assert.deepEqual(body.products.map((item) => item.name), ["Pilot Jacket"]);
  });

  await pool.query("insert into customer_cart_items (user_id, variant_id, quantity) values ($1, $2, 2)", [customer.id, variantA.id]);
  let orderId;
  await t.test("creates an EFT delivery order using server-side totals", async () => {
    const placed = await api("/api/orders", {
      method: "POST", cookie: customerCookie,
      json: { merchantId: merchantA.id, addressId: address.id, fulfillmentMethod: "merchant_delivery", paymentMethod: "eft", customerNotes: "Gate 2", total: 1 },
    });
    assert.equal(placed.status, 201, await placed.clone().text());
    const body = await placed.json();
    orderId = body.order.id;
    assert.equal(body.order.total, 1065);
    const persisted = (await pool.query("select subtotal, delivery_fee, total, customer_ref from orders where id = $1", [orderId])).rows[0];
    assert.deepEqual({ subtotal: persisted.subtotal, deliveryFee: persisted.delivery_fee, total: persisted.total, customerRef: persisted.customer_ref }, { subtotal: 1000, deliveryFee: 65, total: 1065, customerRef: String(customer.id) });
    assert.equal((await pool.query("select reserved from variant_inventory where variant_id = $1", [variantA.id])).rows[0].reserved, 2);
    assert.equal((await pool.query("select count(*)::int as count from customer_cart_items where user_id = $1", [customer.id])).rows[0].count, 0);
    assert.equal((await pool.query("select count(*)::int as count from audit_events where action = 'order.created' and resource_id = $1", [String(orderId)])).rows[0].count, 1);
  });

  await t.test("cancels an eligible order and releases reserved inventory", async () => {
    const cancelled = await api("/api/orders", { method: "PATCH", cookie: customerCookie, json: { orderId, reason: "Integration cancellation" } });
    assert.equal(cancelled.status, 200);
    assert.equal((await pool.query("select status from orders where id = $1", [orderId])).rows[0].status, "cancelled");
    assert.equal((await pool.query("select reserved from variant_inventory where variant_id = $1", [variantA.id])).rows[0].reserved, 0);
    assert.equal((await pool.query("select count(*)::int as count from audit_events where action = 'order.cancelled_by_customer' and resource_id = $1", [String(orderId)])).rows[0].count, 1);
  });
});

