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
  assert.match(html, /Selma/);
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

test("keeps digital-mall branding isolated from the marketplace", async () => {
  const networkHome = await readFile(new URL("../app/components/NeuroCityNetworkHome.tsx", import.meta.url), "utf8");
  const marketplace = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/malls/layout.tsx", import.meta.url), "utf8");
  const mallTheme = await readFile(new URL("../app/digital-malls.css", import.meta.url), "utf8");
  assert.match(networkHome, /digital-malls-home/);
  assert.match(networkHome, /neurocity-malls-mark\.png/);
  assert.match(marketplace, /platform\.kind === "mall" \? "#d4af37"/);
  assert.match(layout, /manifest-malls\.webmanifest/);
  assert.match(mallTheme, /\.white-label-mall/);
  assert.match(mallTheme, /\.digital-malls-home/);
});

test("renders the public onboarding routes", async (t) => {
  const routes = [
    ["/login", /Create account/],
    ["/access", /How are you using NeuroCity/],
    ["/join", /What would you like to create/],
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

test("keeps account selection available before sign in", async () => {
  const response = await request("/api/auth/access");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    authenticated: false,
    merchantAccounts: [],
    mallAccounts: [],
  });
  const source = await readFile(new URL("../app/access/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Customer account/);
  assert.match(source, /Merchant workspace/);
  assert.match(source, /Mall management/);
  assert.match(source, /NeuroCity administration/);
  assert.match(source, /encodeURIComponent\(type\.destination\)/);
  assert.match(source, /<a[\s\S]*className="account-type-card"/);
  assert.match(source, /if \(access\?\.authenticated\) return type\.destination/);
  assert.match(source, /account_type=\$\{type\.id\}/);
  assert.match(source, /href="\/join"/);
});

test("separates customer registration from merchant application", async () => {
  const source = await readFile(new URL("../app/join/page.tsx", import.meta.url), "utf8");
  assert.match(source, /mode=register&account_type=customer/);
  assert.match(source, /href="\/apply"/);
  assert.match(source, /Mall-manager and administrator access is assigned/);
});

test("signs out without mutating immutable redirect headers", async () => {
  const response = await request("/api/auth/logout?return_to=%2Faccess", {
    redirect: "manual",
  });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost/access");
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("accepts same-origin writes behind Render's forwarding proxy", async () => {
  const response = await request("/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://neurocity-fhl1.onrender.com",
      host: "internal-service:10000",
      "x-forwarded-host": "neurocity-fhl1.onrender.com",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "same-origin",
    },
    body: "{}",
  });
  assert.equal(response.status, 400);
  assert.notEqual((await response.json()).error, "Invalid request origin.");
});

test("still blocks genuinely cross-site writes", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://malicious.example",
      host: "neurocity-fhl1.onrender.com",
      "sec-fetch-site": "cross-site",
    },
    body: "{}",
  });
  assert.equal(response.status, 403);
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
    ["/api/admin/transactions", "GET"],
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

test("supports one PayToday checkout across multiple merchants with T+2 settlement", async () => {
  const orders = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");
  const paymentReturn = await readFile(new URL("../app/api/payments/paytoday/return/route.ts", import.meta.url), "utf8");
  const settlements = await readFile(new URL("../lib/settlements.ts", import.meta.url), "utf8");
  const account = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  const adminTransactions = await readFile(new URL("../app/api/admin/transactions/route.ts", import.meta.url), "utf8");
  assert.match(orders, /merchantIds = \[\.\.\.new Set/);
  assert.match(orders, /for \(const group of prepared\)/);
  assert.match(orders, /paymentMethod: "paytoday"/);
  assert.match(orders, /merchantPaymentAllocations/);
  assert.doesNotMatch(account.slice(account.indexOf("function CheckoutBag"), account.indexOf("function OrderRow")), /EFT \/ bank transfer/);
  assert.match(account, /Checkout entire bag/);
  assert.match(paymentReturn, /makeCheckoutAllocationsPayable/);
  assert.match(settlements, /addBusinessDays\(paidAt, 2\)/);
  assert.match(adminTransactions, /merchant_allocation\.settled/);
});

test("keeps the customer journey connected from storefront to multi-store checkout", async () => {
  const storefront = await readFile(new URL("../app/stores/[slug]/page.tsx", import.meta.url), "utf8");
  const account = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  const mobileDock = await readFile(new URL("../app/components/MobileDock.tsx", import.meta.url), "utf8");
  assert.match(storefront, /account\?tab=Bag/);
  assert.match(storefront, /disabled=\{item\.available !== null && item\.available < 1\}/);
  assert.match(storefront, /Added to your bag/);
  assert.match(account, /checkout-merchant-group/);
  assert.match(account, /ONE PAYMENT/);
  assert.match(account, /neurocity:open-selma/);
  assert.match(mobileDock, /neurocity:open-selma/);
  assert.doesNotMatch(account, /href="\/concierge"/);
});

test("supports private screenshot-led catalogue search in Selma", async () => {
  const route = await readFile(new URL("../app/api/concierge/visual-search/route.ts", import.meta.url), "utf8");
  const companion = await readFile(new URL("../app/components/NeuroConcierge.tsx", import.meta.url), "utf8");
  assert.match(route, /input_image/);
  assert.match(route, /store: false/);
  assert.match(route, /MAX_IMAGE_BYTES/);
  assert.match(route, /OPENAI_API_KEY/);
  assert.match(companion, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(companion, /api\/concierge\/visual-search/);
  assert.match(companion, /imagePreview: _imagePreview/);
  assert.match(companion, /analysed by OpenAI/);
  assert.match(companion, /not saved to your NeuroCity account or chat history/);
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

test("keeps merchant approval transactional and document-gated", async () => {
  const source = await readFile(new URL("../app/api/admin/applications/route.ts", import.meta.url), "utf8");
  const patchHandler = source.slice(source.indexOf("export async function PATCH"), source.indexOf("export async function DELETE"));
  assert.match(patchHandler, /All four required documents must be uploaded before approval/);
  assert.match(patchHandler, /tx\.insert\(merchants\)/);
  assert.match(patchHandler, /tx\.insert\(merchantMemberships\)/);
  assert.match(patchHandler, /tx\.insert\(platformTenantMerchants\)/);
  assert.doesNotMatch(patchHandler, /storageKeys/);
});

test("supports audited mall lifecycle and manager access", async () => {
  const route = await readFile(new URL("../app/api/admin/platforms/route.ts", import.meta.url), "utf8");
  const resolver = await readFile(new URL("../lib/platform-tenant.ts", import.meta.url), "utf8");
  assert.match(route, /status: "onboarding"/);
  assert.match(route, /body\.action === "lifecycle"/);
  assert.match(route, /body\.action === "add_manager"/);
  assert.match(route, /body\.action === "remove_manager"/);
  assert.match(route, /platform\.lifecycle|platform\.\$\{body\.action\}/);
  assert.match(resolver, /eq\(platformTenants\.status, "active"\)/);
});

test("hides non-public merchants and inactive malls across public routes", async () => {
  const publicRoutes = ["../app/api/stores/route.ts", "../app/api/stores/[slug]/route.ts", "../app/api/catalogue/route.ts", "../app/api/orders/route.ts", "../app/api/conversations/route.ts"];
  for (const path of publicRoutes) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\["pilot", "onboarding", "active"\]/, `${path} must not expose onboarding merchants`);
  }
  const mallPage = await readFile(new URL("../app/malls/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(mallPage, /eq\(platformTenants\.status, "active"\)/);
  assert.match(mallPage, /This digital mall is not currently open/);
});
