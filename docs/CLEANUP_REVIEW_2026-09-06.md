# Cleanup campaign review

Reviewed 6 September 2026. Review only: no application code, database data, deployment configuration, or dependencies were changed.

## Implementation status

The first cleanup campaign was implemented after this review. It addressed the
confirmed high-value removals and query fixes in items 1–7, 9, 12, 16, 18,
20–23, 26, 27 and 29 where they could be changed without production data or
traffic evidence. Some of those broader items were intentionally reduced rather
than fully rewritten. Conditional retirement work involving historical payments,
database migrations, externally requested assets and deployment resources remains
deferred until those usage checks are available.

The largest opportunities are removing writes from public reads, retiring unreachable pilot UI, reducing dashboard data loading, and removing vendored tooling from source control. These are more valuable than indiscriminately deleting small helpers.

Scope: inventoried all 8,098 tracked files. Of these, 7,796 are under tools/node_modules; 295 remain after excluding vendored dependencies and seven source-image attachments. Static scans covered 175 first-party application, library, database, worker, build, script, test and CSS files (23,486 lines). Reviewed route entry points, imports, exported symbols, state transitions, query construction, CSS imports/selectors, package scripts, migrations/configuration, asset references and duplicate file hashes. Generated outputs and the untracked release checkout were treated as artifacts, not as a second application to audit. No AGENTS.md was found in the primary checkout scan.

This is a broad static review, not proof that every possible dead branch has been found. Production traffic, existing database rows, external URL consumers and actual bundle sizes were unavailable. “Confirmed” means supported by checked-in source; “candidate” requires the stated evidence before deletion. Query/request savings below are source-derived estimates, not measured latency improvements. Effort estimates include focused validation and are not additive where findings overlap.

Priority: P1 = correctness or substantial ongoing waste; P2 = worthwhile maintainability work; P3 = small cleanup or conditional retirement.

1. **P1 · Confirmed: public GET requests repeatedly seed and overwrite the pilot catalogue.**

   Evidence: [db/catalogue.ts:12](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/db/catalogue.ts:12>), [stores GET:8](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/stores/route.ts:8>), [catalogue GET:8](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/catalogue/route.ts:8>), [store GET:7](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/stores/[slug]/route.ts:7>). Every call updates the existing LightWork merchant with hardcoded identity details, inserts seed products, and upserts a default variant for every product owned by that merchant. Variant title, price and image are rewritten. This is provisioning work on the browsing path.

   Impact: prevents browsing from undoing merchant edits and removes about 10 + 2P database statements per seeded request when the tenant and branch already exist, where P is LightWork's product count. The marketplace calls both stores and catalogue, doubling that overhead.

   Risk: new databases and merchant bootstrap currently depend on this behavior; missing variants must be repaired explicitly.

   Plan: move seeds to a versioned, explicitly invoked provisioning script with a transaction and idempotent conflict handling; validate a fresh database and existing merchant edits; then remove all three public-route calls. Keep bootstrap only if its remaining workflow is required. Estimate: 1–2 days.

2. **P1 · Confirmed: variants GET loads inventory for the entire database.**

   Evidence: [app/api/merchant/variants/route.ts:9](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/variants/route.ts:9>). Variant rows are merchant-scoped, but the subsequent inventory/branch query has no WHERE clause. Unrelated stock is read and then filtered in JavaScript for each returned variant.

   Impact: changes work from all-platform inventory to the requesting merchant's variants; reduces database transfer and repeated array scans. The response filtering means this finding alone does not establish a cross-merchant response leak.

   Risk: branch-level stock must remain complete for every authorized variant.

   Plan: constrain inventory with the already-authorized variant IDs, skip empty IDs, group rows by variant ID once. Test two merchants with several branches. Estimate: half a day.

3. **P1 · Confirmed: the old local-cart checkout is unreachable and incompatible with the current API.**

   Evidence: [app/page.tsx:58](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:58>), [old order request:217](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:217>), [checkout UI:863](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:863>), [current order API:20](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/orders/route.ts:20>). Cart starts empty and its only setter clears it. Add-to-cart redirects to the storefront; the only opener requires a nonempty cart. The old request sends productIds, fulfillmentMethod and paymentMethod, whereas the current API uses the persisted cart and a fulfillment array.

   Impact: removes approximately 120 lines of checkout markup plus obsolete state, totals, handlers and unsupported payment-choice copy.

   Risk: the visible Bag button and actual account checkout must remain; source-text tests currently require obsolete copy.

   Plan: keep Bag navigation to the real account bag, delete this local checkout and its exclusive state, and replace obsolete source assertions with current checkout behavior checks. Estimate: half to one day.

4. **P2 · Confirmed: a permanently disabled merchant dashboard still owns a live fetch.**

   Evidence: [app/page.tsx:729](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:729>), [overview effect:137](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:137>), [Metric:1034](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:1034>). The legacy dashboard is guarded by false &&. merchantStats and Metric are consumed only inside that dead branch, but the overview effect still runs when merchant view opens.

   Impact: removes approximately 120 lines of unreachable dashboard markup, the helper/state and one unnecessary overview request per merchant-view entry. The real MerchantWorkspace already loads overview.

   Risk: CSS selectors may be shared with real dashboards.

   Plan: delete the complete dependency chain, then remove only selectors proven exclusive to it. Estimate: 1–2 hours.

5. **P2 · Confirmed: three small unused declarations.**

   Evidence: [unused callback:188](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:188>), [unused import:3](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/conversations/route.ts:3>), [unused overview parameter:1995](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:1995>). TypeScript reports openPilotStore, merchantMemberships and the MerchantOverview products parameter as unused.

   Impact: small source/API simplification; no meaningful runtime saving.

   Risk: retain the actual product state used elsewhere in MerchantWorkspace.

   Plan: remove the callback/import and the unused prop from declaration and call sites. Re-run the unused-symbol check. Estimate: under an hour.

6. **P1 · Confirmed: merchant workspace loads everything and refreshes too broadly.**

   Evidence: [load:332](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:332>), [refresh:369](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:369>), [session:385](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:385>), [polling:406](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:406>), [mutation reload:413](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:413>).

   Nine endpoints load together even for unopened tabs. Session/setup add two more. Four endpoints poll every 15 seconds while visible—16 requests/minute. Generic PATCH reloads all nine. Each endpoint repeats session/membership checks; inventory and variants overlap.

   Impact: large, predictable reduction in HTTP and database work; one failing optional tab need not block the whole workspace.

   Risk: stale orders, stock and settlement status; never replace authorization with a shared cross-user cache.

   Plan: load by active tab, refresh only affected resources, deduplicate in-flight reads, and pause or back off nonessential polling. Consider one bounded operations read endpoint with a single authorization check. Estimate: 2–3 days.

7. **P2 · Confirmed: readiness rules are duplicated and disagree.**

   Evidence: [overview checks:20](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/overview/route.ts:20>), [setup readiness:16](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/setup/route.ts:16>), [setup overwrite:397](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:397>). Overview requires contactName; setup does not. Both read merchant/branch/hours, and setup overwrites overview readiness on the client. Overview also counts all and published products with separate queries.

   Impact: one readiness definition, consistent percentages, fewer repeat reads; combine the two product counts into one conditional aggregate.

   Risk: selecting the intended contact requirement is a behavior decision; do not silently change publication eligibility.

   Plan: add a pure readiness function with representative incomplete profiles, reuse its input data, and merge product aggregates. Estimate: half to one day.

8. **P2 · Confirmed: account changes reload unrelated account and conversation data.**

   Evidence: [account load:192](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/account/page.tsx:192>), [account actions:215](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/account/page.tsx:215>), [account GET:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/account/route.ts:6>). GET sequentially loads addresses, wishlist, saved stores, cart, orders, their children and bookings—up to ten application queries before authentication cost. The page loads conversations alongside it and repeats broad loading after changes.

   Impact: less latency and transfer for small cart/address changes; avoids loading full order history for unrelated tabs.

   Risk: derived bag totals and counts must update consistently; unbounded parallel queries can pressure the ten-connection pool.

   Plan: separate bounded resource reads, return useful mutation results, invalidate only affected resources, and parallelize independent reads conservatively. Estimate: 1–2 days.

9. **P2 · Confirmed: account cart selects payment settings only to discard them.**

   Evidence: [app/api/account/route.ts:11](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/account/route.ts:11>). paymentSettings is selected into every cart row and immediately stripped; paymentMethods is always paytoday.

   Impact: avoids repeated bank-settings JSON transfer inside the server and removes unnecessary destructuring.

   Risk: keep the response free of banking details and preserve its paymentMethods contract until consumers change.

   Plan: omit paymentSettings from the projection; verify exact public cart fields. Estimate: under an hour.

10. **P2 · Confirmed: repeated in-memory joins and oversized history reads.**

    Evidence: [account aggregation:20](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/account/route.ts:20>), [customer conversations:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/conversations/route.ts:6>), [merchant conversations:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/conversations/route.ts:6>), [admin orders:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/admin/orders/route.ts:6>), [store directory:13](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/stores/route.ts:13>). Parent mapping repeatedly filters/finds child arrays. Customer and merchant conversations load every message; account order history is unbounded.

    Impact: grouping once changes parent × child scans to roughly linear work; pagination bounds memory, response sizes and history loading. These reads are already batched in several places, so calling them SQL N+1 queries would be inaccurate.

    Risk: preserve ordering, full conversation access and order detail navigation.

    Plan: use maps keyed by foreign ID; add cursor pagination and on-demand child history. Estimate: 1–2 days.

11. **P2 · Confirmed: financial summaries are derived from truncated lists.**

    Evidence: [merchant payments:16](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/payments/route.ts:16>), [admin transactions:9](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/admin/transactions/route.ts:9>), [admin orders:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/admin/orders/route.ts:6>). Merchant gross/settlement summaries use the latest 100 allocations; admin views use independently capped 250/500-row lists. Gateway and order lists can stop at different boundaries.

    Impact: consolidating summary queries both simplifies repeated filtering and avoids totals changing merely because older rows fell outside a list limit.

    Risk: a total may intentionally represent a recent window; define that window explicitly. Independent gateway/order caps can also misclassify records as manual.

    Plan: separate paginated detail queries from aggregate queries over a declared date/status scope, and load related orders by selected checkout IDs. Validate with more rows than each cap. Estimate: 1–2 days.

12. **P2 · Confirmed: multiple concierge instances and repeat profile reads.**

    Evidence: [global dock:20](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MobileDock.tsx:20>), [page concierge:298](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/NeuroCityNetworkHome.tsx:298>), [profile effect:73](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/NeuroConcierge.tsx:73>), [marketplace concierge](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:978>). RootLayout always mounts MobileDock, which owns a concierge; individual pages mount another. Dock eagerly requests the profile; each dialog requests it on first open.

    Impact: one dialog/state owner and one shared profile load instead of parallel chat histories and repeat reads.

    Risk: preserve mall context, initial prompts, guest/session persistence, focus restoration and memory opt-out. Closed dialogs do not themselves fetch until opened.

    Plan: put a concierge controller near the root and have page/dock triggers supply context. Deduplicate profile reads within the session. Estimate: 1 day.

13. **P2 · Confirmed: global CSS is an accumulation of overlapping revisions.**

    Evidence: [root imports:5](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/layout.tsx:5>), [globals](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/globals.css:1>). All 23 CSS files are reachable via 22 root imports plus the public-directory import. Together they contain 303,288 bytes of source CSS; globals alone has 5,737 lines. The same-context .workspace-message selector appears six times across five files; .admin-workspace appears four times across four files.

    Impact: less cascade archaeology and opportunities to reduce CSS delivered on unrelated routes. Source bytes are not measured compressed transfer bytes; repeated selectors do not automatically mean redundant declarations.

    Risk: specificity, import order, responsive rules and shared selectors can make bulk deletion visually destructive.

    Plan: remove dead-UI selectors first; establish shared tokens/base rules and route-owned styles; consolidate one selector family at a time with responsive visual regression checks during implementation. Estimate: 2–4 days, incremental.

14. **P2 · Confirmed: large components mix unrelated responsibilities.**

    Evidence: [MerchantWorkspace](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:1>) has 2,531 lines; [account](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/account/page.tsx:1>) 1,421; [marketplace/home module](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/page.tsx:1>) 1,057; [admin](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/admin/page.tsx:1>) 748. MerchantWorkspace combines CSV parsing, setup, media uploads, product/variant editors, stock, messages, bookings and orders. The root page module also exports the full marketplace imported by other routes.

    Impact: clearer ownership, smaller review surfaces and easier isolated loading. Source splitting alone does not guarantee a smaller client bundle.

    Risk: state ownership and refresh contracts can regress; all standalone component files currently have references.

    Plan: delete dead sections first, move MarketplaceExperience into its own module, then extract feature panels/hooks with explicit inputs and narrow mutation callbacks. Lazy-load rarely opened panels where appropriate. Estimate: 3–5 days spread across feature changes.

15. **P2 · Confirmed: compressed hand-authored source and weak contracts obscure important logic.**

    Evidence: [admin orders:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/admin/orders/route.ts:6>), [merchant conversations:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/conversations/route.ts:6>), [settlement transaction types:16](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/settlements.ts:16>), [setup mapping:265](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:265>). Twenty-one first-party code files contain lines longer than 1,000 characters. Three explicit any annotations cover transaction/setup boundaries.

    Impact: easier auditing and conflict resolution; typed transaction and API DTO contracts catch drift that currently passes through ad hoc JSON.

    Risk: broad formatting diffs can hide behavioral edits; DB records and public DTOs must remain distinct.

    Plan: separate formatting-only changes from logic edits, replace the three any types, then extract named validation/serialization helpers from dense handlers. Estimate: 1–2 days.

16. **P2 · Confirmed: duplicate phone normalization and small presentation helpers.**

    Evidence: [workspace phone helper:197](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/MerchantWorkspace.tsx:197>), [store phone helper:62](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/stores/[slug]/page.tsx:62>), [WhatsApp helper:3](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/whatsapp-orders.ts:3>). These three normalization bodies are identical. Currency formatting, status-word replacement and HTML escaping also recur, including [order mail:8](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/order-mail.ts:8>) and [booking mail:5](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/booking-mail.ts:5>).

    Impact: one correction for country-code handling and consistent display primitives; modest source reduction.

    Risk: importing a server integration module into client UI can cross the server/client boundary; currency null handling and HTML escaping must not be homogenized blindly.

    Plan: move pure phone/format helpers into browser-safe modules; keep provider calls separate. Share HTML escaping only for the same escaping context. Estimate: half a day.

17. **P2 · Confirmed: URL configuration is duplicated with conflicting environment precedence.**

    Evidence: [site URL helper:3](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/site-url.ts:3>), [order mail:7](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/order-mail.ts:7>), [booking mail:4](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/booking-mail.ts:4>), [OAuth redirect:8](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/lib/google-auth.ts:8>). Metadata uses NEXT_PUBLIC_SITE_URL/RENDER_EXTERNAL_URL; email uses PUBLIC_SITE_URL/APP_URL; OAuth uses PUBLIC_APP_URL or request origin.

    Impact: removes duplicate fallback logic and reduces links pointing at different hosts after deployment changes.

    Risk: OAuth callback URI matching and trusted-origin rules differ from ordinary public links.

    Plan: define documented canonical configuration, preserve explicit OAuth overrides and origin validation, migrate old environment names with a bounded compatibility period. Estimate: half to one day.

18. **P2 · Confirmed: duplicated delivery matching includes an unreachable fallback.**

    Evidence: [quote:11](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/orders/quote/route.ts:11>), [checkout:12](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/orders/route.ts:12>). Both normalize suburbs and match delivery zones. Quote converts absent merchantId with Number(null), yielding integer 0, so the fallback intended to derive merchant IDs from the cart is bypassed for an omitted parameter.

    Impact: one matching rule and a working all-cart quote path; less drift between displayed and charged delivery.

    Risk: server checkout must still revalidate current price, availability, address ownership and fees. A prior quote is not authorization to skip validation.

    Plan: parse optional parameters before coercion, share a pure zone-selection function, and test omitted IDs, zero/invalid IDs, pickup and unmatched suburbs. Estimate: half a day.

19. **P2 · Conditional: obsolete payment-setting fields and historical payment flows need separate treatment.**

    Evidence: [merchant settings:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/payments/route.ts:6>), [settings PATCH:25](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/merchant/payments/route.ts:25>), [UI type:5](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/components/PaymentSettingsPanel.tsx:5>), [payment-proof route](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/orders/payment-proof/route.ts:1>). New settings force payOnCollectionEnabled and eftEnabled false and referenceInstructions empty; checkout creates PayToday orders. The old fields are still carried in types/defaults, while proof and manual payment views may serve old orders.

    Impact: simplify the new settlement-account DTO now; potentially retire larger historical workflows later.

    Risk: removing proof access, bank snapshots or manual settlement records can strand historical orders. No production data audit was performed.

    Plan: introduce a bank-account DTO for new writes; count legacy payment methods/statuses before retiring any routes or stored fields. Preserve historical readers and financial records as needed. Estimate: half a day for DTO cleanup; retirement depends on data and operational requirements.

20. **P2 · Confirmed: test scripts leave useful suites disconnected and some tests preserve dead code.**

    Evidence: [package scripts:10](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/package.json:10>), [rendering source assertions:44](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/tests/rendered-html.test.mjs:44>), [security runner:27](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/scripts/run-security-tests.mjs:27>). test:all runs rendering and integration, omitting dedicated security and identity. Concierge, preorder and built security-HTTP tests are not explicitly run by package scripts. The home rendering test asserts that the root source contains the unreachable “Pay on collection” checkout.

    Impact: cleanup can proceed without tests requiring obsolete source strings, and relevant regression checks run routinely.

    Risk: build-dependent tests require a fresh compatible build; integration requires isolated PostgreSQL. Some source checks encode real safety constraints and should remain.

    Plan: separate unit/security/identity/built-HTTP/integration groups, include them deliberately in an aggregate command, and replace dead-copy assertions with observable behavior. Share duplicated test transpilation helpers only where semantics match. Estimate: 1 day.

21. **P2 · Confirmed: lint/typecheck scope confuses source and generated artifacts.**

    Evidence: [eslint ignores:11](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/eslint.config.mjs:11>), [TypeScript include/exclude](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/tsconfig.json:24>), [ignore rules](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/.gitignore:1>). ESLint ignores build/** even though build/sites-vite-plugin.ts is maintained source. Generated test outputs and the untracked release tree are not explicitly excluded by the lint configuration; TypeScript includes broad recursive TS globs while excluding worker source altogether.

    Impact: more dependable checks and less accidental traversal of generated/stale trees.

    Risk: do not hide real worker/build source to obtain a green check.

    Plan: enumerate generated-directory exclusions, include the build plugin, and add a worker-specific typecheck with correct runtime types. Enable unused checks after the three confirmed declarations are removed. Estimate: half a day.

22. **P1 · Confirmed: 7,796 tooling dependency files are tracked.**

    Evidence: [ignore rule:4](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/.gitignore:4>), [workbook tool:2](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/tools/build_catalogue_workbook.mjs:2>). tools/node_modules contains 335,197,677 bytes (about 319.7 MiB) of tracked working-tree content. The root-only /node_modules ignore misses it. The workbook tool uses @oai/artifact-tool, but tools has no standalone package manifest/lockfile describing a reproducible install.

    Impact: removes roughly 96% of currently tracked file entries and 320 MiB from future checkout content. This does not erase existing Git history or prove equivalent bundle savings.

    Risk: deleting the folder before recording reproducible dependencies breaks artifact generation.

    Plan: establish a locked tools package or a documented external runtime, prove generation in a clean checkout, ignore nested dependency folders, then remove them from the index. Do not rewrite history as routine cleanup. Estimate: half to one day.

23. **P3 · Confirmed/candidate: generated files and release leftovers need lifecycle rules.**

    Evidence: tracked [TypeScript cache](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/tsconfig.tsbuildinfo>); untracked .sites-release-worktree/ and neurocity-site.tar.gz; ignored dist, .next, .vinext, .wrangler, test outputs, work and outputs directories.

    Impact: stops generated typecheck cache churn and prevents release artifacts being committed; optional disk savings after retention checks.

    Risk: the release checkout may contain unique work, and a release archive may be needed for rollback. Existing modified tsconfig.tsbuildinfo predates this review.

    Plan: stop tracking the cache and add *.tsbuildinfo to ignores. Inspect release checkout status/ownership and archive provenance before any deletion; define cleanup after successful releases. Do not bulk-delete all “work” folders. Estimate: 1–2 hours plus verification.

24. **P3 · Candidate: unreferenced starter and obsolete public assets.**

    Evidence: no first-party text references found for file.svg, globe.svg, window.svg, branding/neurocity-brand-board.png, branding/neurocity-logo-source.png, og.png, or four old neurocity-* icons. Current manifests/layout use neurocity-malls-* icons.

    Impact: the three obvious starter SVGs total only 1,817 bytes; larger design sources/old imagery provide roughly 4.4 MB of additional candidate savings. Actual request savings depend on whether they are requested externally.

    Risk: database-stored URLs, installed PWAs, social caches and externally shared URLs are invisible to import scans.

    Plan: remove the obvious starter SVGs after URL checks; move design masters out of public; inspect request logs and stored asset URLs before retiring old icons/social imagery. Keep Google verification HTML and review favicon separately because they can be requested without an import. Estimate: 1–3 hours plus an observation period.

25. **P3 · Confirmed duplication: asset and business-deliverable copies.**

    Evidence: each of the five LightWork images in deliverables/assets is byte-identical to its public counterpart; public/icons/neurocity-512.png and neurocity-maskable-512.png are also byte-identical. tools generates business documents/workbooks outside the app workflow.

    Impact: one source for merchant images and clearer separation between application releases and business collateral.

    Risk: source photos and generated outreach/payment documents retain business value; a self-contained deliverable may intentionally include copies.

    Plan: point generators at one canonical source directory and copy assets only into generated packages. Define ownership/retention for deliverables and attachments rather than labeling them dead application code. Estimate: half a day.

26. **P2 · Conditional: starter D1 scaffolding and two deployment models coexist.**

    Evidence: [D1 example](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/examples/d1/app/api/notes/route.ts:1>), [PostgreSQL runtime](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/db/index.ts:1>), [migrator:14](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/scripts/migrate.mjs:14>), [Sites packaging:29](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/build/sites-vite-plugin.ts:29>), [worker](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/worker/index.ts:1>), [Render deployment](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/render.yaml:1>). Runtime uses PostgreSQL/drizzle-postgres; Sites packaging copies drizzle, hosting declares a D1 DB, and worker declares a DB type. The disconnected example imports a SQLite notes schema but calls the current PostgreSQL getDb and mentions a nonexistent db:generate script.

    Impact: the example is a good deletion/archive candidate; choosing a supported deployment model reduces misleading setup paths.

    Risk: drizzle is still copied by the build, and worker/Vite/Sites files are active build inputs. Both migration trees may have deployment history.

    Plan: archive/delete the example first. Document which deployment environments are supported; only remove D1 bindings/migrations after checking actual resource use and migration history. Keep PostgreSQL migrations intact. Estimate: under an hour for the example; 1–2 days to rationalize deployment support.

27. **P3 · Confirmed: README status and PWA navigation are stale.**

    Evidence: [README:9](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/README.md:9>) still recommends creating an application skeleton despite a full implementation. [manifest:24](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/public/manifest.webmanifest:24>) advertises /dashboard, but the primary route tree has no dashboard page and no redirect was found in inspected routing configuration.

    Impact: faster onboarding and a working installed-app merchant shortcut.

    Risk: verify the intended authenticated landing route and any infrastructure redirects outside this checkout.

    Plan: document actual runtime/setup/test commands and update the shortcut to the current merchant entry flow. Validate installed PWA shortcut behavior. Estimate: 1–2 hours.

28. **P2 · Confirmed: connection/TLS configuration is duplicated and inconsistent.**

    Evidence: [runtime:17](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/db/index.ts:17>), [migrate:8](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/scripts/migrate.mjs:8>), [role verification:6](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/scripts/verify-runtime-db-role.mjs:6>), [restore verification:7](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/scripts/verify-restored-database.mjs:7>), [Drizzle config](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/drizzle.config.ts:1>). Runtime/migrator recognize localhost and Render internal names; several operator scripts only recognize Render internal names; Drizzle config uses another localhost substring rule.

    Impact: one tested connection-option policy avoids local/restore surprises and repeated environment-specific conditionals.

    Risk: migration credentials must stay separate from least-privilege runtime credentials; never normalize by disabling TLS broadly.

    Plan: share pure hostname/TLS option construction while keeping each caller's credential selection and pool limits explicit. Test localhost, loopback, Render-internal and external hostnames. Estimate: half a day.

29. **P2 · Confirmed opportunity: concierge does expensive reads before knowing they are needed.**

    Evidence: [app/api/concierge/route.ts:84](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/app/api/concierge/route.ts:84>). Search loads the visible catalogue, its variants and active-variant inventory before intent parsing can return needsLocation. It then filters/ranks in memory.

    Impact: defer two database reads for location-clarification responses; indexed candidate retrieval can bound work as catalogues grow.

    Risk: the fallback matcher and evidence-backed responses provide value. SQL prefiltering must preserve broad searches, venue membership, preorders, service matching and live availability.

    Plan: move variant/inventory loading after the needsLocation branch first. Then profile representative catalogue sizes before replacing broad retrieval; preserve fresh stock validation and fallback tests. Estimate: half a day for deferral; larger search changes require measurement.

Items deliberately not recommended for blind deletion:

- No completely unreferenced standalone file in app/components was found. The dead dashboard/checkout are embedded in app/page.tsx.
- securityRateLimits has no external TypeScript symbol reference, but lib/security-rate-limit.ts actively queries its SQL table; do not drop it.
- Internal-only exports such as BookingNotice, GoogleFlow, merchantCategoryNames, identity-shadow constants/context types, PayTodayPaymentInput, PublicPlatformTenant and allowedOrigins can have export removed if module encapsulation is desired. Their implementations/types are used locally; they are not dead declarations.
- NeuroConcierge's _imagePreview destructuring deliberately strips images before persistence. Do not “fix” the unused warning by persisting those fields.
- Identity shadow provisioning is feature-flagged and exercised by integration tests. The name “legacy” does not justify deleting its schema or mappings. Retirement requires evidence that the migration has completed or been cancelled.
- Session-cookie compatibility, historical payment proofs, financial records, migrations, webhook endpoints, PWA manifests/service worker and search-engine verification can be used without ordinary source imports.
- No dependency package is approved for removal solely because its name is absent from application imports. Build plugins, peer dependencies, tests and operator scripts also consume packages. @types/nodemailer and @types/pg can move to devDependencies as package hygiene, but confirm the deployment install/build process first.

Recommended implementation sequence:

1. Establish reliable checks and a reproducible tools install; remove tracked dependencies/cache and the three unused declarations. Retire the false dashboard and unreachable local checkout together with their stale tests.
2. Move seeding out of public requests and constrain the inventory query. Validate fresh provisioning, existing merchant edits and cross-merchant isolation before release.
3. Unify readiness, quote matching and DTOs; narrow dashboard/account reads and invalidation; separate financial aggregates from pagination.
4. Refactor feature components and CSS incrementally. Consolidate pure helpers and configuration alongside the features using them.
5. Retire assets, old payment readers and D1/deployment scaffolding only after the specified usage/history checks.

Validation performed:

- TypeScript with --noEmit --incremental false --noUnusedLocals --noUnusedParameters: failed with exactly three unused-declaration diagnostics described in item 5; no other diagnostics emitted.
- Targeted ESLint over app/lib/db/worker/scripts/tests and root runtime configs: 154 files, 88 errors, 34 warnings. Categories include hooks, internal navigation, accessibility, unused declarations and three explicit any annotations. These are baseline findings, not proof every warning is dead code.
- ESLint initially refused the explicitly supplied build directory because the existing configuration ignores it; the targeted rerun excluded that argument. This supports item 21.
- node --test tests/concierge-conversation.test.mjs tests/preorder-checkout.test.mjs: six passed, zero failed.
- Security suite: could not reach execution; esbuild reported “Cannot read directory ../..: Access is denied” and subsequent module-resolution errors in this restricted environment. This is not a demonstrated security-test assertion failure.
- Full production build, Docker integration, browser regression tests, live query profiling and production-data checks were not run. No cleanup is claimed to be deployment-verified.
- Raw lint findings are saved in [cleanup-eslint.json](<C:/Users/Sergej Witbooi/Desktop/NeuroEdge Virtual Mall/outputs/cleanup-eslint.json>). Only this report and ignored diagnostic output were added by the review.
