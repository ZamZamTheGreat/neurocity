import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadTypeScriptModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  new Function("exports", code)(exports);
  return exports;
}

test("merchant readiness uses the storefront publication requirements", async () => {
  const { merchantReadiness } = await loadTypeScriptModule("../lib/merchant-readiness.ts");
  const merchant = {
    name: "Example Store",
    category: "Fashion",
    tagline: "Local goods",
    description: "A complete public profile.",
    contactEmail: "owner@example.com",
    contactPhone: "0810000000",
    logoUrl: "/logo.png",
    bannerUrl: "/banner.png",
    policies: { returns: "Returns accepted." },
  };
  const branch = {
    address: "Windhoek",
    pickupEnabled: true,
    deliveryEnabled: false,
  };

  assert.equal(merchantReadiness(merchant, branch, Array(7)).percent, 100);
  assert.equal(
    merchantReadiness({ ...merchant, contactPhone: null }, branch, Array(7)).percent,
    86,
  );
});

test("public catalogue reads do not invoke pilot provisioning", async () => {
  for (const path of [
    "../app/api/catalogue/route.ts",
    "../app/api/stores/route.ts",
    "../app/api/stores/[slug]/route.ts",
  ]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /ensurePilotCatalogue/);
  }
});

test("merchant variant inventory is constrained to authorized variant ids", async () => {
  const source = await readFile(
    new URL("../app/api/merchant/variants/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /where\(inArray\(variantInventory\.variantId, rows\.map\(\(row\) => row\.id\)\)\)/,
  );
});

test("Namibian phone normalization is shared by UI and WhatsApp delivery", async () => {
  const { whatsappNumber } = await loadTypeScriptModule("../lib/phone.ts");
  assert.equal(whatsappNumber("081 234 5678"), "264812345678");
  assert.equal(whatsappNumber("00264 81 234 5678"), "264812345678");
});

test("a later merchant resource request supersedes an earlier response", async () => {
  const { LatestRequestTracker } = await loadTypeScriptModule("../lib/latest-request.ts");
  const requests = new LatestRequestTracker();
  const first = requests.begin("inventory");
  const second = requests.begin("inventory");

  assert.equal(requests.isLatest("inventory", first), false);
  assert.equal(requests.isLatest("inventory", second), true);
});
