import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.PUBLIC_SITE_URL = "https://neurocity-fhl1.onrender.com";
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
    new Request(`https://neurocity-fhl1.onrender.com${path}`, {
      ...init,
      headers: { ...(!["GET", "HEAD", "OPTIONS"].includes(init.method ?? "GET") ? { origin: "https://neurocity-fhl1.onrender.com", "sec-fetch-site": "same-origin" } : {}), ...init.headers },
    }),
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
  assert.match(html, /Shop local Namibian businesses/);
  assert.match(html, /marketplace/i);
  assert.match(html, /Digital malls/);
  assert.match(html, /Selma/);
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Review your order/);
  assert.match(source, /Pay on collection/);
  assert.match(source, /\/api\/orders/);
  assert.doesNotMatch(source, /merchants are being recruited|: "Recruiting"/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("keeps the commerce experience at the marketplace route", async () => {
  const response = await render("/marketplace");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sell on NeuroCity/);
  assert.match(html, /How it works/);
  assert.match(html, /What are you looking for/);
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
  assert.match(source, /destination: "\/marketplace\?workspace=merchant"/);
  assert.doesNotMatch(source, /destination: "\/\?workspace=merchant"/);
  assert.match(source, /Mall management/);
  assert.match(source, /NeuroCity administration/);
  assert.match(source, /encodeURIComponent\(type\.destination\)/);
  assert.match(source, /<a[\s\S]*className="account-type-card"/);
  assert.match(source, /if \(access\?\.authenticated\) return type\.destination/);
  assert.match(source, /account_type=\$\{type\.id\}/);
  assert.match(source, /href="\/join"/);
});

test("offers protected Google account access when configured", async () => {
  const login = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const start = await readFile(new URL("../app/api/auth/google/route.ts", import.meta.url), "utf8");
  const callback = await readFile(new URL("../app/api/auth/google/callback/route.ts", import.meta.url), "utf8");
  const auth = await readFile(new URL("../lib/google-auth.ts", import.meta.url), "utf8");
  assert.match(login, /Continue with Google/);
  assert.match(login, /Create account with Google/);
  assert.match(start, /code_challenge_method: "S256"/);
  assert.match(start, /scope: "openid email profile"/);
  assert.match(callback, /profile\.email_verified !== true/);
  assert.match(callback, /createSession\(user\.id\)/);
  assert.match(auth, /!value\.startsWith\("\/\/"\)/);
});

test("keeps Account Centre navigation independent of Vinext client links", async () => {
  const access = await readFile(new URL("../app/access/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(access, /from "next\/link"/);
  assert.match(access, /<a href="\/marketplace">Marketplace<\/a>/);
  assert.match(access, /<a href="\/malls">Digital malls<\/a>/);
  assert.match(access, /className="account-centre-shop" href="\/marketplace"/);
});

test("separates customer registration from merchant application", async () => {
  const source = await readFile(new URL("../app/join/page.tsx", import.meta.url), "utf8");
  assert.match(source, /mode=register&account_type=customer/);
  assert.match(source, /href="\/apply"/);
  assert.match(source, /Mall-manager and administrator access is assigned/);
});

test("lets a signed-in customer apply with the same NeuroCity account", async () => {
  const access = await readFile(new URL("../app/access/page.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/apply/page.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/applications/route.ts", import.meta.url), "utf8");
  assert.match(access, /href="\/apply"/);
  assert.match(access, /Apply to NeuroCity Marketplace/);
  assert.match(access, /No merchant workspace is connected yet/);
  assert.match(access, /Ready to open/);
  assert.match(access, /Application required/);
  assert.match(access, /onClick=\{loadAccess\}/);
  assert.match(access, /Apply for another storefront/);
  assert.match(access, /Track an application/);
  assert.match(access, /aria-label="NeuroCity navigation"/);
  assert.match(access, /href="\/marketplace"/);
  assert.match(access, /href="\/malls"/);
  assert.match(access, /aria-current="page"/);
  assert.match(access, /Start shopping/);
  assert.match(page, /fetch\("\/api\/auth\/access"\)/);
  assert.match(page, /Using your NeuroCity account/);
  assert.match(page, /No new password is needed/);
  assert.match(page, /disabled=\{Boolean\(account\)\}/);
  assert.match(route, /const signedInUser = await getChatGPTUser\(\)/);
  assert.match(route, /Use the email address belonging to your signed-in NeuroCity account/);
  assert.match(route, /if \(!signedInUser\).*createSession/s);
});

test("requires a same-origin POST before signing out", async () => {
  const response = await request("/api/auth/logout?return_to=%2Faccess", {
    redirect: "manual",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.match(await response.text(), /method="post"/);
  const page = await (await request("/api/auth/logout?return_to=%2Faccess")).text();
  assert.match(page, /Sign out of NeuroCity\?/);
  assert.match(page, /Stay signed in/);
  assert.match(page, /return_to=%2Faccess/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("accepts an allowlisted origin behind Render's forwarding proxy", async () => {
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
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "This service is temporarily unavailable.");
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

test("fails closed when the persistent mutation limiter is unavailable", async (t) => {
  const cases = [
    { name: "", email: "shopper@example.com", password: "long-enough-password" },
    { name: "Shopper", email: "not-an-email", password: "long-enough-password" },
    { name: "Shopper", email: "shopper@example.com", password: "short" },
  ];
  for (const body of cases) {
    await t.test(JSON.stringify(body), async () => {
      await expectJsonError(
        "/api/auth/register",
        503,
        "This service is temporarily unavailable.",
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
      await expectJsonError(path, method === "POST" ? 503 : 401, method === "POST" ? "This service is temporarily unavailable." : "Sign in required.", {
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
      const mutation = ["PATCH", "DELETE"].includes(method);
      await expectJsonError(path, mutation ? 503 : 403, mutation ? "This service is temporarily unavailable." : "Administrator access required.", {
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

test("protects checkout and database capacity under concurrent traffic", async () => {
  const database = await readFile(new URL("../db/index.ts", import.meta.url), "utf8");
  const orders = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");
  const health = await readFile(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  const loadTest = await readFile(new URL("../scripts/load-test.mjs", import.meta.url), "utf8");
  assert.match(database, /DB_POOL_MAX/);
  assert.match(database, /connectionTimeoutMillis/);
  assert.match(database, /getDatabasePoolStats/);
  assert.match(orders, /pg_advisory_xact_lock/);
  assert.match(orders, /Your shopping bag changed during checkout/);
  assert.match(orders, /stock changed during checkout/);
  assert.match(orders, /returning\(\{ id: variantInventory\.id \}\)/);
  assert.match(health, /databaseLatencyMs/);
  assert.match(loadTest, /LOAD_TEST_CONCURRENCY/);
  assert.match(loadTest, /requestsPerSecond/);
});

test("supports guided iOS Home Screen installation", async () => {
  const installer = await readFile(new URL("../app/components/PwaInstaller.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const manifest = await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8");
  assert.match(installer, /iPad\|iPhone\|iPod/);
  assert.match(installer, /navigator\.standalone|navigatorWithStandalone\.standalone/);
  assert.match(installer, /display-mode: standalone/);
  assert.match(installer, /Add to Home Screen/);
  assert.match(installer, /aria-modal="true"/);
  assert.match(layout, /appleWebApp/);
  assert.match(layout, /neurocity-malls-180/);
  assert.equal(JSON.parse(manifest).display, "standalone");
});

test("keeps the customer journey connected from storefront to multi-store checkout", async () => {
  const storefront = await readFile(new URL("../app/stores/[slug]/page.tsx", import.meta.url), "utf8");
  const account = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  const mobileDock = await readFile(new URL("../app/components/MobileDock.tsx", import.meta.url), "utf8");
  assert.match(storefront, /account\?tab=Bag/);
  assert.match(storefront, /!preorder && item\.available !== null && item\.available < 1/);
  assert.match(storefront, /Added to your bag/);
  assert.match(storefront, /https:\/\/wa\.me\//);
  assert.match(storefront, /Text store/);
  assert.match(storefront, /whatsappItemHref/);
  assert.match(storefront, /I found \$\{product\.name\} on NeuroCity/);
  assert.match(storefront, /Ask about this product on WhatsApp/);
  assert.match(storefront, /digits\.startsWith\("0"\).*264/s);
  assert.match(account, /checkout-merchant-group/);
  assert.match(account, /ONE PAYMENT/);
  assert.match(account, /neurocity:open-selma/);
  assert.match(mobileDock, /neurocity:open-selma/);
  assert.match(mobileDock, /neurocity:companion-name/);
  assert.match(mobileDock, /\{companionName\}/);
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
  assert.match(companion, /Upload from device/);
  assert.match(companion, /Take a photo/);
  assert.match(companion, /cameraInputRef/);
  assert.match(companion, /capture="environment"/);
  assert.match(companion, /Your device may ask for permission to use the camera/);
  assert.match(companion, /api\/concierge\/visual-search/);
  assert.match(companion, /imagePreview: _imagePreview/);
  assert.match(companion, /analysed by OpenAI/);
  assert.match(companion, /not saved to your NeuroCity account or chat history/);
});

test("grounds Selma's OpenAI reasoning in live catalogue results", async () => {
  const route = await readFile(new URL("../app/api/concierge/route.ts", import.meta.url), "utf8");
  assert.match(route, /OPENAI_CONCIERGE_MODEL/);
  assert.match(route, /reasoning: \{ effort: "low" \}/);
  assert.match(route, /liveCatalogueFacets/);
  assert.match(route, /Do not invent products, stores, branches, prices, hours or availability/);
  assert.match(route, /reasoning: intent \? "openai" : "local_fallback"/);
  assert.match(route, /eq\(products\.status, "published"\)/);
  assert.match(route, /eq\(merchants\.isPublic, true\)/);
  assert.match(route, /item\.onHand - item\.reserved - item\.safetyStock > 0/);
  assert.match(route, /const selected = ranked\.filter\(\(item\) => item\.matchesCore\)/);
  assert.match(route, /item\.price !== null && item\.price <= budget/);
  assert.match(route, /function numericPrice/);
  assert.match(route, /history\.length > 20/);
  assert.doesNotMatch(route, /relevant\.length \? relevant : ranked/);
  assert.match(route, /timeZone: "Africa\/Windhoek"/);
  assert.match(route, /intent\?\.needsLocation/);
  assert.match(route, /intent\?\.fulfillment === "pickup"/);
  assert.match(route, /intent\?\.availability === "open_now"/);
  assert.match(route, /eligibleBranchIds\.has\(item\.branchId\)/);
});

test("lets Selma distinguish preorder catalogue items from live stock", async () => {
  const route = await readFile(new URL("../app/api/concierge/route.ts", import.meta.url), "utf8");
  const concierge = await readFile(new URL("../app/components/NeuroConcierge.tsx", import.meta.url), "utf8");
  assert.match(route, /\["available", "preorder", "out_of_stock"\]/);
  assert.match(route, /available by preorder rather than from stock/);
  assert.match(route, /availability !== "out_of_stock"/);
  assert.match(concierge, /Available by preorder/);
  assert.doesNotMatch(route, /does not have any in-stock published products yet/);
});

test("protects Selma costs and keeps signed-in memory opt-in", async () => {
  const search = await readFile(new URL("../app/api/concierge/route.ts", import.meta.url), "utf8");
  const visual = await readFile(new URL("../app/api/concierge/visual-search/route.ts", import.meta.url), "utf8");
  const limiter = await readFile(new URL("../lib/concierge-rate-limit.ts", import.meta.url), "utf8");
  const profile = await readFile(new URL("../app/api/concierge/profile/route.ts", import.meta.url), "utf8");
  const companion = await readFile(new URL("../app/components/NeuroConcierge.tsx", import.meta.url), "utf8");
  assert.match(search, /checkConciergeRateLimit\(request, "search"\)/);
  assert.match(visual, /checkConciergeRateLimit\(request, "visual"\)/);
  assert.match(limiter, /search: 20, visual: 5/);
  assert.match(limiter, /status: 429|retry-after/);
  assert.match(profile, /memoryEnabled !== undefined/);
  assert.match(companion, /neurocity_selma_chat_\$\{next\.id\}/);
  assert.match(companion, /Memory off/);
  assert.match(companion, /Clear chat/);
  assert.match(companion, /messages\.slice\(-40\)/);
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

test("generates product variants from colours and selected sizes", async () => {
  const form = await readFile(new URL("../app/components/ProductCreatePanel.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/merchant/products/route.ts", import.meta.url), "utf8");
  assert.match(form, /Separate colours with commas/);
  assert.match(form, /SIZE_OPTIONS\.map/);
  assert.match(form, /variantCount/);
  assert.match(route, /colourOptions\.flatMap/);
  assert.match(route, /inventoryMode: "generated"/);
  assert.match(route, /combinations > 100/);
  assert.match(route, /db\.transaction/);
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
  assert.match(patchHandler, /transitions\[application\.status\]/);
  assert.match(patchHandler, /eq\(users\.status, "active"\)/);
  assert.match(patchHandler, /onConflictDoUpdate/);
  assert.match(patchHandler, /Application was changed by another administrator/);
  assert.match(await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"), /Awaiting documents/);
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

test("publishes a completed onboarding storefront into the public marketplace", async () => {
  const setup = await readFile(new URL("../app/api/merchant/setup/route.ts", import.meta.url), "utf8");
  const stores = await readFile(new URL("../app/api/stores/route.ts", import.meta.url), "utf8");
  assert.match(setup, /publishing && currentMerchant\.status === "onboarding" \? "active"/);
  assert.match(setup, /merchant\.storefront_published/);
  assert.match(setup, /fulfillmentMethods\.length === 0/);
  assert.match(setup, /hours\.length !== 7 \|\| invalidOpenHours/);
  assert.match(stores, /eq\(merchants\.isPublic, true\)/);
  assert.match(stores, /inArray\(merchants\.status, \["pilot", "active"\]\)/);
});
