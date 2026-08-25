import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);

async function render(path = "/") {
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

async function request(path, init = {}) {
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function expectJsonError(path, status, error, init = {}) {
  const response = await request(path, init);
  assert.equal(response.status, status, `${init.method ?? "GET"} ${path}`);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await response.json(), { error });
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

test("renders the public onboarding routes", async (t) => {
  const routes = [
    ["/login", /Create account/],
    ["/apply", /Apply as a merchant or service provider/],
    ["/application-status", /Track your application/],
    ["/malls", /Digital malls/],
  ];
  for (const [path, marker] of routes) {
    await t.test(path, async () => {
      const response = await render(path);
      assert.equal(response.status, 200);
      assert.match(await response.text(), marker);
    });
  }
});

test("rejects malformed registration before touching the database", async (t) => {
  const cases = [
    { name: "", email: "shopper@example.com", password: "long-enough-password" },
    { name: "Shopper", email: "not-an-email", password: "long-enough-password" },
    { name: "Shopper", email: "shopper@example.com", password: "short" },
  ];
  for (const body of cases) {
    await t.test(JSON.stringify(body), async () => {
      await expectJsonError(
        "/api/auth/register",
        400,
        "Name, valid email and a password of at least 10 characters are required.",
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      );
    });
  }
});

test("protects customer APIs from anonymous access", async (t) => {
  const routes = [
    ["/api/account", "GET"],
    ["/api/conversations", "GET"],
    ["/api/orders/quote?merchantId=1&addressId=1", "GET"],
    ["/api/orders/issues", "POST"],
    ["/api/orders/payment-proof?orderId=1", "GET"],
    ["/api/service-bookings", "GET"],
  ];
  for (const [path, method] of routes) {
    await t.test(`${method} ${path}`, async () => {
      await expectJsonError(path, 401, "Sign in required.", {
        method,
        ...(method === "POST" ? { headers: { "content-type": "application/json" }, body: "{}" } : {}),
      });
    });
  }
});

test("protects administration APIs from anonymous access", async (t) => {
  const routes = [
    ["/api/admin/applications", "GET"],
    ["/api/admin/applications", "DELETE"],
    ["/api/admin/merchants", "PATCH"],
    ["/api/admin/orders", "GET"],
    ["/api/admin/platforms", "GET"],
  ];
  for (const [path, method] of routes) {
    await t.test(`${method} ${path}`, async () => {
      await expectJsonError(path, 403, "Administrator access required.", {
        method,
        ...(["PATCH", "DELETE"].includes(method) ? { headers: { "content-type": "application/json" }, body: "{}" } : {}),
      });
    });
  }
});

test("protects merchant operations from anonymous access", async (t) => {
  const routes = [
    ["/api/merchant/overview", "Active merchant membership required.", 403],
    ["/api/merchant/orders", "Merchant authentication required.", 401],
    ["/api/merchant/products", "Merchant authentication required.", 401],
    ["/api/merchant/inventory", "Merchant authentication required.", 401],
    ["/api/merchant/delivery-zones", "Merchant authentication required.", 401],
    ["/api/merchant/payments", "Merchant authentication required.", 401],
    ["/api/merchant/conversations", "Merchant access required.", 403],
    ["/api/merchant/variants", "Merchant authentication required.", 401],
    ["/api/merchant/service-bookings", "Merchant authentication required.", 401],
  ];
  for (const [path, error, status] of routes) {
    await t.test(path, async () => {
      await expectJsonError(path, status, error);
    });
  }
});

test("preserves tenant and ownership predicates in sensitive routes", async () => {
  const account = await readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
  const orders = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");
  const merchantOrders = await readFile(new URL("../app/api/merchant/orders/route.ts", import.meta.url), "utf8");
  const paymentProof = await readFile(new URL("../app/api/orders/payment-proof/route.ts", import.meta.url), "utf8");
  const quote = await readFile(new URL("../app/api/orders/quote/route.ts", import.meta.url), "utf8");

  assert.match(account, /eq\(customerAddresses\.userId, Number\(user\.userId\)\)/);
  assert.match(orders, /eq\(orders\.customerRef, user\.userId\)/);
  assert.match(merchantOrders, /eq\(orders\.merchantId, access\.merchantId\)/);
  assert.match(paymentProof, /eq\(orders\.customerRef, user\.userId\)/);
  assert.match(quote, /eq\(customerAddresses\.userId, Number\(user\.userId\)\)/);
});

test("preserves critical payment and inventory controls", async () => {
  const orders = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");
  const paymentProof = await readFile(new URL("../app/api/orders/payment-proof/route.ts", import.meta.url), "utf8");
  const adminOrders = await readFile(new URL("../app/api/admin/orders/route.ts", import.meta.url), "utf8");

  assert.match(orders, /paymentMethod/);
  assert.match(orders, /variantInventory/);
  assert.match(orders, /transaction\(async \(tx\)/);
  assert.match(paymentProof, /allowedDocumentMimeTypes/);
  assert.match(paymentProof, /maxDocumentBytes/);
  assert.match(adminOrders, /Only a paid order can be recorded as refunded/);
  assert.match(adminOrders, /auditEvents/);
});

test("supports product and service catalogue items", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  const merchantProducts = await readFile(new URL("../app/api/merchant/products/route.ts", import.meta.url), "utf8");
  const storefront = await readFile(new URL("../app/stores/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(schema, /itemType: varchar\("item_type"/);
  assert.match(schema, /durationMinutes: integer\("duration_minutes"/);
  assert.match(merchantProducts, /pricingModels = new Set\(\["fixed", "from", "quote"\]\)/);
  assert.match(storefront, /Request booking/);
  assert.match(storefront, /api\/service-bookings/);
  assert.match(schema, /serviceBookings = pgTable\("service_bookings"/);
});

test("sends service booking lifecycle notifications", async () => {
  const customerBookings = await readFile(new URL("../app/api/service-bookings/route.ts", import.meta.url), "utf8");
  const merchantBookings = await readFile(new URL("../app/api/merchant/service-bookings/route.ts", import.meta.url), "utf8");
  const bookingMail = await readFile(new URL("../lib/booking-mail.ts", import.meta.url), "utf8");
  assert.match(customerBookings, /sendBookingRequestedNotifications/);
  assert.match(customerBookings, /sendBookingCancelledToMerchant/);
  assert.match(merchantBookings, /sendBookingStatusNotification/);
  assert.match(bookingMail, /SMTP|sendMail/);
});
