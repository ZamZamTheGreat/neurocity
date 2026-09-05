import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";
import sharp from "sharp";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import * as security from "../.security-test-dist/security-entry.mjs";

test.before(async () => {
  const journal = JSON.parse(await readFile("drizzle-postgres/meta/_journal.json", "utf8"));
  for (const migration of journal.entries) await security.pg.exec(await readFile(`drizzle-postgres/${migration.tag}.sql`, "utf8"));
});
test.after(async () => security.pg.close());
const jar = new Map();
function call(handler, json, cookieJar = jar) {
  return security.cookieContext.run(cookieJar, () => handler(new Request("http://localhost/api/test", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(json) })));
}

test("administrator email and supplied roles cannot elevate public registration", async () => {
  const response = await call(security.registration.POST, { name: "Security Tester", email: process.env.ADMIN_EMAIL, password: "security-test-password", privacyAccepted: true, termsAccepted: true, platformRole: "administrator" });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).user.platformRole, "customer");
  const { rows } = await security.pg.query("select platform_role from users where email = $1", [process.env.ADMIN_EMAIL]);
  assert.equal(rows[0].platform_role, "customer");
  assert.equal((await security.pg.query("select * from merchant_memberships")).rows.length, 0);
});

test("registration validates runtime types, consent and bcrypt byte limits", async () => {
  for (const changes of [{ name: {} }, { email: [] }, { password: 42 }, { password: "💥".repeat(20) }, { privacyAccepted: false }, { termsAccepted: false }]) {
    const response = await call(security.registration.POST, { name: "Other", email: "other@security.example", password: "security-test-password", privacyAccepted: true, termsAccepted: true, ...changes });
    assert.equal(response.status, 400);
  }
});

test("login accepts credentials, refuses inactive accounts and throttles guesses", async () => {
  assert.equal((await call(security.login.POST, { email: process.env.ADMIN_EMAIL, password: "security-test-password" })).status, 200);
  await security.pg.query("update users set status = 'disabled' where email = $1", [process.env.ADMIN_EMAIL]);
  assert.equal((await call(security.login.POST, { email: process.env.ADMIN_EMAIL, password: "security-test-password" })).status, 401);
  await security.pg.query("update users set status = 'active' where email = $1", [process.env.ADMIN_EMAIL]);
  for (let i = 0; i < 8; i++) assert.equal((await call(security.login.POST, { email: process.env.ADMIN_EMAIL, password: "wrong" })).status, 401);
  assert.equal((await call(security.login.POST, { email: process.env.ADMIN_EMAIL, password: "wrong" })).status, 429);
  await security.pg.query("update security_rate_limits set expires_at = now() - interval '1 second'");
});

test("administrator MFA accepts only a current authenticator code", async () => {
  await security.pg.query("delete from security_rate_limits");
  await security.pg.query("update users set platform_role = 'administrator' where email = $1", [process.env.ADMIN_EMAIL]);
  assert.equal((await call(security.login.POST, { email: process.env.ADMIN_EMAIL, password: "security-test-password", mfaCode: "000000" }, new Map())).status, 401);
  const currentCode = security.totpCode(process.env.ADMIN_MFA_SECRET);
  assert.equal((await call(security.login.POST, { email: process.env.ADMIN_EMAIL, password: "security-test-password", mfaCode: currentCode }, new Map())).status, 200);
  await security.pg.query("update users set platform_role = 'customer' where email = $1", [process.env.ADMIN_EMAIL]);
});

test("TOTP generation follows the RFC 6238 reference vector", () => {
  assert.equal(security.totpCode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000), "287082");
});

test("persistent limiter admits exactly the configured number of concurrent attempts", async () => {
  const results = await Promise.all(Array.from({ length: 25 }, () => security.consumeRateLimit("concurrency", "same-user", 5)));
  assert.equal(results.filter(r => r.allowed).length, 5);
  const rows = (await security.pg.query("select key,count from security_rate_limits where count = 6")).rows;
  assert.ok(rows.length);
  assert.match(rows[0].key, /^[a-f0-9]{64}$/);
  await security.pg.query("update security_rate_limits set expires_at = now() - interval '1 second'");
  assert.equal((await security.consumeRateLimit("concurrency", "same-user", 5)).allowed, true);
});

test("untrusted IP headers cannot choose a rate-limit identity", () => {
  delete process.env.TRUSTED_CLIENT_IP_HEADER;
  assert.equal(security.clientAddress(new Request("https://platform.example", { headers: { "cf-connecting-ip": "evil", "x-forwarded-for": "evil" } })), "unknown");
});

test("origin enforcement rejects forged forwarded hosts, missing origins and sibling sites", () => {
  process.env.PUBLIC_SITE_URL = "https://platform.example";
  const request = (headers) => new Request("https://platform.example/api/test", { method: "POST", headers });
  assert.equal(security.isSameOriginMutation(request({ origin: "https://platform.example" })), true);
  for (const headers of [{}, { origin: "null" }, { origin: "https://evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" }, { origin: "https://platform.example", "sec-fetch-site": "same-site" }]) assert.equal(security.isSameOriginMutation(request(headers)), false);
});

test("Turnstile validation is server-side, action-bound and hostname-bound", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  const previousFetch = globalThis.fetch;
  const request = new Request("http://localhost/api/auth/login", { method: "POST", headers: { origin: "http://localhost" } });
  try {
    globalThis.fetch = async (_url, init) => {
      const body = init.body;
      assert.equal(body.get("secret"), "test-secret");
      assert.equal(body.get("response"), "valid-token");
      return Response.json({ success: true, action: "login", hostname: "localhost" });
    };
    assert.equal((await security.verifyTurnstile(request, "valid-token", "login")).ok, true);
    globalThis.fetch = async () => Response.json({ success: true, action: "register", hostname: "localhost" });
    assert.equal((await security.verifyTurnstile(request, "valid-token", "login")).ok, false);
    globalThis.fetch = async () => Response.json({ success: true, action: "login", hostname: "evil.example" });
    assert.equal((await security.verifyTurnstile(request, "valid-token", "login")).ok, false);
    assert.equal((await security.verifyTurnstile(request, "", "login")).ok, false);
  } finally {
    globalThis.fetch = previousFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test("security alerts redact sensitive fields and suppress duplicates", async () => {
  const previousFetch = globalThis.fetch;
  process.env.SECURITY_ALERT_WEBHOOK_URL = "https://alerts.security.example/hook";
  const deliveries = [];
  globalThis.fetch = async (_url, init) => { deliveries.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); };
  try {
    const event = `test_alert_${crypto.randomUUID()}`;
    await security.securityAlert(event, "warning", { incident: "safe-reference", accessToken: "must-not-leak", email: "private@example.com" }, "same");
    await security.securityAlert(event, "warning", { incident: "duplicate" }, "same");
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].details.incident, "safe-reference");
    assert.equal(deliveries[0].details.accessToken, "[redacted]");
    assert.equal(deliveries[0].details.email, "[redacted]");
  } finally {
    globalThis.fetch = previousFetch;
    delete process.env.SECURITY_ALERT_WEBHOOK_URL;
  }
});

test("body limit checks actual streamed bytes even without content-length", async () => {
  await assert.rejects(security.readBoundedBody(new Request("http://localhost", { method: "POST", body: "123456" }), 5));
  assert.equal((await security.readBoundedBody(new Request("http://localhost", { method: "POST", body: "12345" }), 5)).length, 5);
});

test("GET logout preserves the session; POST invalidates it", async () => {
  const count = Number((await security.pg.query("select count(*) from sessions")).rows[0].count);
  assert.ok(count > 0);
  const response = await security.cookieContext.run(jar, () => security.logout.GET(new Request("http://localhost/api/auth/logout?return_to=/account")));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /method="post"/);
  assert.equal(Number((await security.pg.query("select count(*) from sessions")).rows[0].count), count);
  assert.equal((await call(security.logout.POST, {})).status, 200);
  assert.equal(Number((await security.pg.query("select count(*) from sessions")).rows[0].count), count - 1);
});

test("upload tickets reject tampering, another user and expiry", () => {
  process.env.R2_SECRET_ACCESS_KEY = "test-only-storage-key";
  const url = security.createUploadUrl("merchants/1/logo/test.png", "1", "image/png", 100);
  const token = new URL(url, "http://localhost").searchParams.get("ticket");
  assert.equal(security.verifyUploadTicket(token, "1").size, 100);
  assert.throws(() => security.verifyUploadTicket(token, "2"));
  assert.throws(() => security.verifyUploadTicket(`a${token}`, "1"));
  const now = Date.now; Date.now = () => now() + 700_000;
  try { assert.throws(() => security.verifyUploadTicket(token, "1")); } finally { Date.now = now; }
});

test("file signatures fail closed while scanner availability follows the configured policy", async () => {
  assert.throws(() => security.validateFileType(Buffer.from("<script>alert(1)</script>"), "image/png"));
  delete process.env.CLAMAV_HOST;
  delete process.env.UPLOAD_MALWARE_SCAN_MODE;
  await assert.rejects(security.scanFile(Buffer.from("test")), /unavailable/);
  assert.equal(await security.scanFile(Buffer.from("test"), true), "sanitization-only");
  process.env.UPLOAD_MALWARE_SCAN_MODE = "required";
  await assert.rejects(security.scanFile(Buffer.from("test")), /unavailable/);
  delete process.env.UPLOAD_MALWARE_SCAN_MODE;
});

test("scanner protocol, image decode, signed storage headers and immutable writes", async () => {
  let verdict = "stream: OK\0";
  const scanner = createServer(socket => {
    let input = Buffer.alloc(0);
    socket.on("data", chunk => {
      input = Buffer.concat([input, chunk]);
      if (input.length >= 14) {
        const size = input.readUInt32BE(10);
        if (input.length >= 18 + size) socket.end(verdict);
      }
    });
  });
  await new Promise(resolve => scanner.listen(0, "127.0.0.1", resolve));
  process.env.CLAMAV_HOST = "127.0.0.1";
  process.env.CLAMAV_PORT = String(scanner.address().port);
  process.env.R2_ENDPOINT = "https://storage.example";
  process.env.R2_BUCKET = "private";
  process.env.R2_ACCESS_KEY_ID = "test-key";
  const originalFetch = globalThis.fetch;
  let stored;
  globalThis.fetch = async (url, init) => { stored = { url: new URL(url), init }; return new Response(null, { status: 200 }); };
  try {
    const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    const ticket = { key: "merchants/1/logo/test.png", size: bytes.length, mimeType: "image/png" };
    await security.storeScannedUpload(ticket, bytes);
    assert.equal(stored.init.headers["if-none-match"], "*");
    assert.match(stored.url.searchParams.get("X-Amz-SignedHeaders"), /x-amz-meta-security-scan/);
    assert.equal((await sharp(stored.init.body).metadata()).width, 2);
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText("Safe page content");
    pdf.catalog.set(PDFName.of("OpenAction"), pdf.context.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("app.alert('unsafe')") }));
    const pdfBytes = await pdf.save();
    await security.storeScannedUpload({ ...ticket, key: "applications/1/test.pdf", mimeType: "application/pdf", size: pdfBytes.length }, pdfBytes);
    const cleaned = await PDFDocument.load(stored.init.body);
    assert.equal(cleaned.getPageCount(), 1);
    assert.equal(cleaned.catalog.has(PDFName.of("OpenAction")), false);
    verdict = "stream: Eicar-Test-Signature FOUND\0";
    stored = undefined;
    await assert.rejects(security.storeScannedUpload(ticket, bytes));
    assert.equal(stored, undefined);
  } finally { globalThis.fetch = originalFetch; await new Promise(resolve => scanner.close(resolve)); }
});

test("decoded raster images upload when the optional scanner is unavailable", async () => {
  delete process.env.CLAMAV_HOST;
  delete process.env.UPLOAD_MALWARE_SCAN_MODE;
  process.env.R2_ENDPOINT = "https://storage.example";
  process.env.R2_BUCKET = "private";
  process.env.R2_ACCESS_KEY_ID = "test-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-only-storage-key";
  const previous = globalThis.fetch;
  let stored;
  globalThis.fetch = async (_url, init) => { stored = init; return new Response(null, { status: 200 }); };
  try {
    const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).png().toBuffer();
    await security.storeScannedUpload({ key: "merchants/1/logo/safe.png", size: bytes.length, mimeType: "image/png" }, bytes);
    assert.equal(stored.headers["x-amz-meta-security-scan"], "sanitized-v1");
    assert.equal((await sharp(stored.body).metadata()).format, "png");
  } finally { globalThis.fetch = previous; }
});

test("unscanned legacy objects are rejected before download", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { headers: { "content-length": "100" } });
  try { await assert.rejects(security.verifiedObject("applications/1/legacy.pdf")); }
  finally { globalThis.fetch = previous; }
});

test("sanitised objects remain available when the optional scanner is not configured", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { headers: { "content-length": "100", "content-type": "image/png", "x-amz-meta-security-scan": "sanitized-v1" } });
  try { assert.equal((await security.verifiedObject("applications/1/sanitized.pdf")).ok, true); }
  finally { globalThis.fetch = previous; }
});

test("sanitisation-only metadata cannot make a document downloadable", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { headers: { "content-length": "100", "content-type": "application/pdf", "x-amz-meta-security-scan": "sanitized-v1" } });
  try { await assert.rejects(security.verifiedObject("applications/1/document.pdf")); }
  finally { globalThis.fetch = previous; }
});

test("merchant reads cannot cross membership boundaries and customer cannot read admin documents", async () => {
  const ownerJar = new Map();
  await call(security.registration.POST, { name: "Owner", email: "owner@security.example", password: "security-test-password", privacyAccepted: true, termsAccepted: true }, ownerJar);
  const user = (await security.pg.query("select id from users where email = 'owner@security.example'")).rows[0];
  const merchant = (await security.pg.query("insert into merchants (name,slug,category,status) values ('Owned','owned','Fashion','active') returning id")).rows[0];
  const other = (await security.pg.query("insert into merchants (name,slug,category,status) values ('Other','other','Beauty','active') returning id")).rows[0];
  await security.pg.query("insert into merchant_memberships (merchant_id,user_ref,email,display_name,role,status) values ($1,$2,'owner@security.example','Owner','owner','active')", [merchant.id, String(user.id)]);
  await security.pg.query("insert into products (merchant_id,sku,name) values ($1,'owned','Owned product'),($2,'other','Other product')", [merchant.id, other.id]);
  const response = await security.cookieContext.run(ownerJar, () => security.merchantProducts.GET());
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).products.map(p => p.name), ["Owned product"]);
  const denied = await security.cookieContext.run(ownerJar, () => security.documentDownload.GET(new Request("http://localhost/api/applications/documents/download?id=1")));
  assert.equal(denied.status, 403);
});

test("application status is private to the signed-in applicant", async () => {
  const anonymous = await security.cookieContext.run(new Map(), () => security.applications.GET(new Request("http://localhost/api/applications?reference=NCA-2026-AAAAAAAA&email=owner%40security.example")));
  assert.equal(anonymous.status, 401);
  const ownerJar = new Map();
  await call(security.login.POST, { email: "owner@security.example", password: "security-test-password" }, ownerJar);
  const mismatched = await security.cookieContext.run(ownerJar, () => security.applications.GET(new Request("http://localhost/api/applications?reference=NCA-2026-AAAAAAAA&email=victim%40security.example")));
  assert.equal(mismatched.status, 404);
});
