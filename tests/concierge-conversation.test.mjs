import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
async function load(path, deps = {}) {
  const code = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)((name) => deps[name] ?? {}, exports);
  return exports;
}
const helpers = await load('../lib/concierge-conversation.ts');
async function search(message, availability = 'available', history = []) {
  const rows = [
    [{ id: 1, name: 'Hoodie', itemType: 'product', availability, storeId: 2, storeSlug: 'test', storeName: 'Test', price: 100 }],
    [{ id: 3, productId: 1, status: 'active', color: 'Black', size: 'M', price: 150 }, { id: 4, productId: 1, status: 'active', color: 'White', size: 'L', price: 100 }],
    [3, 4].map((variantId) => ({ variantId, branchId: 5, onHand: availability === 'preorder' ? 0 : 2, reserved: 0, safetyStock: 0 })),
    [{ id: 5, merchantId: 2, city: 'Windhoek', pickupEnabled: true }], []
  ];
  const db = { select() { const result = rows.shift(); const q = { from: () => q, innerJoin: () => q, where: async () => result }; return q; } };
  const schema = Object.fromEntries(['merchants', 'platformTenantMerchants', 'platformTenants', 'products', 'productVariants', 'storeBranches', 'storeHours', 'variantInventory'].map((key) => [key, {}]));
  const route = await load('../app/api/concierge/route.ts', {
    'drizzle-orm': { and() {}, eq() {}, inArray() {} }, '../../../db': { getDb: () => db }, '../../../db/schema': schema,
    '../../../lib/platform-tenant': { resolvePlatformTenant: async () => ({ id: 1, name: 'NeuroCity' }) },
    '../../../lib/concierge-rate-limit': { checkConciergeRateLimit: async () => ({ allowed: true }) },
    '../../../lib/concierge-conversation': helpers
  });
  return (await route.POST(new Request('http://localhost/api/concierge', { method: 'POST', body: JSON.stringify({ message, history }) }))).json();
}
test('catalogue matching and conversational fallback', async () => {
  const key = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.match(helpers.smallTalk('Howzit!'), /Hello/);
    assert.equal(helpers.normalizeSize('Medium'), 'm');
    assert.equal((await search('black large hoodie')).matches.length, 0);
    assert.equal((await search('black medium hoodie')).matches[0].price, 150);
    assert.equal((await search('hoodie', 'preorder')).matches[0].availability, 'preorder');
    assert.equal((await search('hoodie', 'out_of_stock')).matches.length, 0);
    assert.equal((await search('hoodie', 'available', [null, { role: 'user', text: 'white hoodie under N$50' }])).matches.length, 1);
    assert.equal(await helpers.explainCatalogue('hello', [], {}, 'Safe fallback'), 'Safe fallback');
  } finally { if (key !== undefined) process.env.OPENAI_API_KEY = key; }
});
test('OpenAI replies use evidence and safely fall back on incomplete output', async () => {
  const key = process.env.OPENAI_API_KEY, originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-only';
  try {
    globalThis.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      assert.equal(payload.store, false);
      assert.match(payload.input, /preorder/);
      return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: 'This hoodie is a preorder, not ready for collection.' }] }] });
    };
    assert.match(await helpers.explainCatalogue('hoodie', [], { availability: 'preorder' }, 'Fallback'), /preorder/);
    globalThis.fetch = async () => Response.json({ status: 'incomplete', output: [] });
    assert.equal(await helpers.explainCatalogue('hoodie', [], {}, 'Fallback'), 'Fallback');
    globalThis.fetch = async () => { throw new Error('Network unavailable'); };
    assert.equal(await helpers.explainCatalogue('hoodie', [], {}, 'Fallback'), 'Fallback');
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
  }
});
