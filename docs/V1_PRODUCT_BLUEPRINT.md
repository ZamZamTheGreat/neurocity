# NeuroEdge Virtual Mall — V1 Product Blueprint

**Status:** Implementation-ready draft  
**Market:** Namibia  
**Initial operating area:** Windhoek  
**Product type:** Multi-merchant, mobile-first digital mall  
**Target pilot:** 5–10 merchants in 2–3 retail categories

### Confirmed owner decisions (9 August 2026)

- Public working name: **NeuroCity**
- Pilot city: **Windhoek**
- Pilot categories: **Fashion; Beauty and personal care; Gifts, home and living**
- Merchant fee during testing: **No charge**
- Intended post-pilot model: **Monthly merchant subscription**
- Transaction commission: **Deferred pending confirmation**
- Customer payment methods: **Online payment and pay on collection**
- Initial delivery responsibility: **Merchant managed**
- Product relationship: **Independent from NeuroEstates**
- First merchant prospect: **LightWork Clothing, Baines Centre, Pioneerspark**

## 1. Executive decision

NeuroEdge Virtual Mall should launch as an operated digital mall, not an open self-service marketplace and not a 3D metaverse.

V1 must prove that:

1. participating merchants can keep useful catalogues and stock information current;
2. customers can discover products and complete an order with confidence;
3. merchants can accept, prepare, and fulfill orders within defined service levels; and
4. the platform can earn transaction or subscription revenue without holding merchant money outside an approved payment arrangement.

The pilot experience is:

> Discover → enter a store → browse or ask AI → add products → checkout → collect or receive delivery → track the order.

The platform may display products from several merchants in a mall-wide basket. During the pilot, each merchant portion is a distinct order and payment obligation unless a licensed payment provider contractually supports marketplace split settlement. This protects the architecture’s long-term direction while limiting regulatory and refund complexity.

## 2. Product positioning

### Customer promise

Find and buy from trusted Namibian stores in one place, with intelligent help and clear pickup or delivery options.

### Merchant promise

Launch a capable digital storefront, receive qualified orders and enquiries, and manage catalogue, inventory, fulfillment, and customer demand without building a separate e-commerce system.

### Strategic differentiation

- A curated mall rather than an unmoderated listings directory
- Branded merchant storefronts rather than anonymous seller cards
- Catalogue-grounded store assistants
- A future mall-wide concierge spanning trusted merchants
- Customer shopping requests and merchant offers in a later release
- Shared identity, communication, analytics, and commerce infrastructure across NeuroEdge products

### Explicit non-goals for V1

- 3D mall navigation or avatars
- Nationwide same-day delivery orchestration
- Platform-owned courier fleet
- Cross-border trade and customs
- Wallets, stored value, or holding merchant funds
- Automated merchant payouts built without a licensed provider
- Native iOS and Android applications
- POS integrations
- Franchise management
- Auctions, bidding, customer requests, and merchant offers
- AI-generated prices, stock claims, product facts, or policy decisions

## 3. Pilot operating assumptions

- Launch in Windhoek before expanding geographically.
- Onboard merchants manually and approve every storefront.
- Begin with categories where fulfilment is manageable, such as fashion, beauty, gifts, home/living, and selected electronics accessories.
- Avoid groceries, prepared food, prescription goods, age-restricted goods, and high-fraud luxury items initially.
- Require merchants to nominate a responsible order manager.
- Support store pickup and merchant-managed/local scheduled delivery.
- Let administrators configure delivery zones and fees; do not calculate complex live courier rates in the first release.
- Use a licensed payment provider or acquiring bank. Offer pay-on-collection only where the merchant enables it.
- Provide assisted catalogue import using a standard spreadsheet template.
- Treat stock displayed online as merchant-supplied information, with explicit reservation and confirmation rules.

## 4. User roles and permissions

### 4.1 Visitor

Can browse the mall, search products, visit storefronts, and begin a basket. Must authenticate before placing an order or saving persistent personal information.

### 4.2 Customer

Can manage a profile and addresses, save products, place orders, choose fulfillment, pay, receive notifications, track status, request cancellation, and submit reviews after fulfilled orders.

### 4.3 Merchant owner

Owns the merchant tenant. Can manage business details, branches, staff, catalogues, stock, orders, fulfillment settings, promotions, policies, AI configuration, and merchant analytics.

### 4.4 Merchant manager

Can manage day-to-day catalogue, inventory, orders, customers, and fulfillment but cannot change ownership, financial settlement details, or subscription terms.

### 4.5 Merchant fulfillment staff

Can view assigned orders, accept/reject stock, prepare packages, and update pickup/delivery statuses. Cannot export customers or change prices.

### 4.6 Mall operations administrator

Can approve merchants and products, moderate content, assist orders, manage categories, configure fees and zones, handle disputes, suspend storefronts, and see platform-level operational reporting.

### 4.7 Mall finance administrator

Can reconcile payments, fees, refunds, and settlement reports. Sensitive financial permissions remain separate from ordinary operations.

### 4.8 Platform super-administrator

Reserved for a minimal trusted group. Can administer roles, system configuration, security controls, and emergency access. All actions are audited.

## 5. Core customer journeys

### 5.1 Browse and purchase from one merchant

1. Customer opens the mall homepage.
2. Customer searches, selects a category, or enters a storefront.
3. Customer selects a product and variant.
4. System checks sellable status and available quantity.
5. Customer adds the item to the basket.
6. Customer authenticates or creates an account at checkout.
7. Customer selects pickup or available delivery option.
8. System creates a priced checkout session with an expiry.
9. Customer pays through the provider or selects pay-on-collection if eligible.
10. Merchant receives a new order with a response deadline.
11. Merchant accepts and prepares the order, or reports unavailable items.
12. Customer receives status notifications and collects/receives the order.
13. System records completion and later permits a verified review.

### 5.2 Mall-wide basket with multiple merchants

1. Customer adds items from several storefronts.
2. Basket groups lines by merchant and fulfillment location.
3. Each group displays its own delivery/pickup choices, policy, subtotal, and fees.
4. Checkout creates a parent checkout reference and one child merchant order per group.
5. In pilot mode, the customer authorizes each merchant payment separately within a guided flow.
6. A failure for one merchant does not invalidate paid orders for other merchants.
7. Tracking shows each merchant order independently.

Future marketplace settlement can replace step 5 without changing the parent/child order model.

### 5.3 Ask the store AI

1. Customer opens the assistant within a storefront.
2. Assistant establishes that it represents that store.
3. Customer states a need, budget, size, colour, or intended use.
4. Assistant queries only approved, sellable catalogue data and store policies.
5. Assistant returns product cards with current displayed price, availability label, and links.
6. Customer refines the request or adds a selected variant to the basket.
7. If confidence is low or the request requires human judgment, assistant offers a merchant enquiry.

### 5.4 Pickup

1. Customer chooses a branch and an available pickup window.
2. Merchant accepts and prepares the order.
3. Customer receives “ready for pickup” only after merchant confirmation.
4. Staff verifies a short pickup code or QR token.
5. Staff marks the order collected; the event is timestamped and audited.

### 5.5 Delivery

1. Customer selects an address.
2. System validates that it falls within a configured zone.
3. Customer sees fee and estimated window before payment.
4. Merchant prepares and dispatches using the configured fulfillment method.
5. Customer receives status updates.
6. Staff/courier records delivery using an OTP, signature, or supported proof method.

### 5.6 Cancellation and refund

1. Customer requests cancellation against an eligible merchant order.
2. System evaluates order state and merchant policy; complex cases go to operations.
3. Merchant or administrator approves or denies with a reason.
4. Approved card refunds are submitted through the original payment provider.
5. Order, payment, refund, commission, inventory, and audit records update atomically where possible.
6. Customer is notified of the decision and expected refund timing.

## 6. Screen inventory

### 6.1 Public/customer experience

| Screen | Essential content/actions |
|---|---|
| Mall home | Search, categories, featured stores, promotions, trust message |
| Search results | Products/stores, filters, sort, availability and price |
| Category | Subcategories, curated collections, product grid |
| Storefront | Branding, store information, categories, products, assistant, policies |
| Product detail | Media, description, variants, price, stock label, fulfillment, returns |
| Store AI | Conversation, structured product cards, add-to-basket handoff |
| Basket | Merchant-grouped lines, quantities, estimated fees, warnings |
| Checkout | Identity, address, fulfillment, totals, payment, terms |
| Payment result | Per-merchant success/failure and next actions |
| Order list | Merchant-grouped orders and status summaries |
| Order detail | Timeline, items, totals, payment, fulfillment, support |
| Wishlist | Saved products and current availability |
| Profile | Personal details, addresses, communication preferences |
| Authentication | Email/phone login, verification, recovery |
| Help/policies | Mall terms, privacy, returns framework, merchant policies |

### 6.2 Merchant portal

| Screen | Essential content/actions |
|---|---|
| Overview | Orders requiring action, revenue, stock alerts, response SLA |
| Orders | Filtered work queue and status actions |
| Order detail | Customer fulfillment details, line availability, timeline, notes |
| Products | Search, status, stock, price, bulk selection |
| Product editor | Content, media, variants, pricing, tax, fulfillment flags |
| Inventory | Branch-level quantities, reservations, adjustments, history |
| Import centre | Template download, upload, validation errors, preview and commit |
| Storefront editor | Branding, description, contacts, hours, policies |
| Promotions | Codes or automatic discounts with validity and limits |
| AI insights | Common requests, unanswered questions, conversion handoffs |
| Staff | Invitations, roles, removal, last access |
| Fulfillment settings | Pickup branches, zones, fees, preparation times |
| Reports | Orders, sales, products, fees, exports |
| Settings | Business details and notification preferences |

### 6.3 Mall administration

| Screen | Essential content/actions |
|---|---|
| Operations overview | Order exceptions, merchant SLA, payment issues, incidents |
| Merchant approvals | Verification evidence, agreement state, activation controls |
| Catalogue moderation | Flagged/rejected products and restricted categories |
| Order support | Search, timeline, communications, controlled interventions |
| Refunds/disputes | Evidence, decisions, provider references, audit record |
| Categories | Taxonomy and attributes |
| Merchandising | Featured stores/products and scheduled placements |
| Delivery configuration | Zones, fees, methods, availability |
| Finance/reconciliation | Charges, refunds, commissions, exceptions, exports |
| Users/access | Roles, suspensions, security actions |
| Audit log | Actor, action, resource, before/after metadata, timestamp |
| Platform configuration | Feature flags, limits, notification templates |

## 7. Commerce rules

### 7.1 Catalogue

- A merchant has one or more branches.
- A product belongs to one merchant and may be available at several branches.
- Sellable stock attaches to a variant at a branch, not merely to a product.
- Product publication requires name, category, description, price, at least one image, fulfillment eligibility, and active variant.
- Category-specific attributes should be structured where they affect discovery: clothing size, colour, brand, storage capacity, dimensions, and similar fields.
- Prices are stored in minor units (cents) and displayed in NAD.
- Every price change is recorded with actor and time.

### 7.2 Inventory

Track these quantities independently:

- `on_hand`: merchant-reported physical quantity
- `reserved`: quantity held for active orders/checkouts
- `available`: derived sellable quantity
- `safety_stock`: quantity intentionally withheld from online sale

Recommended rule:

`available = max(0, on_hand - reserved - safety_stock)`

A reservation receives an expiry. Payment success converts the applicable reservation into an order allocation. Cancellation or failed payment releases it. Every manual adjustment requires a reason.

Merchants unable to maintain exact stock may use an “availability requires confirmation” mode, but such products must be clearly labelled and should not support immediate irreversible payment unless the refund flow is proven.

### 7.3 Pricing

- A checkout snapshot freezes product name, SKU, variant, unit price, discounts, tax treatment, and merchant policy reference.
- The system never recomputes historical orders from the current product record.
- Discounts are deterministic and recorded per order line.
- V1 supports fixed amount and percentage promotion codes, with merchant scope, validity, minimum spend, usage limits, and no uncontrolled stacking.

### 7.4 Order hierarchy

- `CheckoutGroup`: one customer checkout attempt across the mall
- `MerchantOrder`: a commercial/fulfillment obligation to one merchant/branch
- `OrderLine`: a snapshotted product variant and quantity
- `Fulfillment`: pickup or delivery execution for a merchant order
- `Payment`: provider transaction associated with a merchant order or approved marketplace session
- `Refund`: full or partial reversal against a payment and order lines

### 7.5 Order state machine

Primary states:

```text
draft
  → awaiting_payment
  → paid
  → accepted
  → preparing
  → ready_for_pickup | dispatched
  → collected | delivered
  → completed
```

Exception states:

```text
payment_failed
rejected
cancellation_requested
cancelled
partially_refunded
refunded
delivery_failed
disputed
```

State transitions must be validated server-side. A status label is not directly editable.

### 7.6 Returns

V1 records and coordinates return requests but does not attempt fully automated reverse logistics. Each published product references a merchant return policy within the mall’s minimum consumer framework. Return decisions, reasons, evidence, inventory disposition, and refund references remain auditable.

## 8. Payment and settlement design

### 8.1 Non-negotiable principles

- Use a licensed/acquiring payment partner.
- Do not store raw card data.
- Do not build a NeuroEdge wallet in V1.
- Do not hold or redistribute merchant funds without an approved legal and provider structure.
- Confirm marketplace/split-payment capability contractually, including merchant onboarding, KYC, refunds, chargebacks, commissions, payout timing, and reporting.
- Treat webhook events as untrusted until signature and transaction details are verified.
- Make payment creation and webhook handling idempotent.

### 8.2 Pilot modes

**Mode A — separate merchant payments (safe default):** each merchant order receives its own provider payment. The interface guides the customer through the set of payments and reports each result independently.

**Mode B — approved marketplace payment:** a licensed partner accepts one payment and performs split settlement/commission handling under an approved commercial and regulatory arrangement.

Mode B is enabled only after written confirmation and integration testing.

### 8.3 Reconciliation

Store internal amount, provider amount, currency, provider transaction ID, merchant order ID, commission, fees where available, refund totals, settlement reference, and status. Run a scheduled comparison against provider reports and surface unmatched or inconsistent transactions to finance administrators.

## 9. Fulfillment design

### Pickup

- Branch-specific opening hours and preparation time
- Customer-selected eligible window
- Ready notification controlled by merchant
- Expiring pickup verification code
- Uncollected-order escalation

### Local delivery

- Address plus map pin when available
- Administrator-configured named zones
- Per-zone fee and estimated window
- Delivery eligibility per product/variant
- Merchant-managed delivery as the first implementation
- Proof of delivery event with OTP or evidence reference

### Later integration boundary

A `FulfillmentProvider` adapter should eventually support quote, booking, cancellation, tracking, and proof-of-delivery callbacks. V1’s internal fulfillment model must not depend on one courier’s data format.

## 10. AI design

### 10.1 Store assistant in V1

The store assistant can:

- discover products using natural language;
- clarify size, budget, colour, brand, intended use, and other requirements;
- compare factual catalogue attributes;
- return structured product cards;
- explain merchant-authored store, delivery, and return information;
- create a basket handoff for an explicitly selected variant; and
- escalate to a human enquiry.

It cannot:

- invent product facts or availability;
- promise delivery dates outside configured data;
- negotiate unapproved discounts;
- approve returns or refunds;
- expose another merchant’s private data;
- access unrelated customer orders; or
- execute a purchase without explicit customer confirmation in the standard checkout.

### 10.2 Grounding and tool boundaries

- Every conversation is scoped to a merchant tenant.
- Retrieval uses approved published catalogue and policy records.
- Product responses use structured product IDs returned by server tools, not model-authored IDs.
- Price and availability are refreshed when product cards render and again at checkout.
- Tool calls enforce authentication and authorization independently of the model.
- Conversations containing personal data follow retention and access rules.
- Capture model version, tool activity, latency, escalation, and product-click outcome for evaluation.

### 10.3 Quality measures

- Supported answers grounded in a valid product/policy record
- Invalid product reference rate
- Product-card click-through rate
- Add-to-basket rate after AI interaction
- Human escalation rate
- Customer thumbs-up/down feedback
- Latency and cost per conversation

### 10.4 Mall concierge

The mall-wide concierge should be feature-flagged until catalogue quality is sufficient. When introduced, merchant ranking must be explainable and must separate organic relevance from sponsored placement.

## 11. Proposed system architecture

Start with a modular monolith rather than independent microservices. It is easier to ship, test transactions, and operate with a small team while preserving domain boundaries.

```text
Responsive Web/PWA
        |
Application API
        |
        +-- Identity and access
        +-- Merchant/storefront
        +-- Catalogue/search
        +-- Inventory/reservations
        +-- Basket/checkout
        +-- Orders/fulfillment
        +-- Payments/refunds
        +-- Promotions
        +-- AI orchestration
        +-- Notifications
        +-- Administration/audit
        |
PostgreSQL -- Object Storage -- Search Index
        |
Background Worker / Scheduled Jobs
        |
Payment Provider -- Email/SMS -- Future Courier Adapters
```

### Recommended implementation foundation

- Type-safe server application with clear domain modules
- PostgreSQL as the source of truth
- Responsive server-rendered or modern web frontend installable as a PWA
- Object storage and image transformation for product media
- Database-backed job queue initially, or a dedicated queue when volume requires it
- Search using PostgreSQL full-text/trigram capabilities initially; dedicated search service later
- Provider-hosted payment fields or redirect checkout
- Transactional email plus an SMS/WhatsApp-capable notification abstraction where approved
- OpenAPI-described internal API boundaries
- Feature flags for payment mode, AI, delivery methods, and pilot merchants

Technology selection should prioritize the team’s proven stack. The product model does not require microservices, Kubernetes, blockchain, or a graph database.

## 12. Core data model

All business tables use stable IDs, creation/update timestamps, and appropriate audit metadata. Multi-tenant records include `merchant_id` and are protected in application authorization; database row-level protections may provide defense in depth.

### Identity and tenancy

- `users`
- `customer_profiles`
- `addresses`
- `merchants`
- `merchant_branches`
- `merchant_memberships`
- `roles`
- `role_permissions`
- `merchant_verifications`

### Catalogue and inventory

- `categories`
- `category_attributes`
- `products`
- `product_variants`
- `product_media`
- `product_attribute_values`
- `inventory_levels`
- `inventory_reservations`
- `inventory_adjustments`
- `price_history`
- `product_publication_reviews`

### Shopping and commerce

- `wishlists`
- `wishlist_items`
- `baskets`
- `basket_items`
- `checkout_groups`
- `merchant_orders`
- `order_lines`
- `order_status_events`
- `promotions`
- `promotion_redemptions`
- `payments`
- `payment_events`
- `refunds`
- `refund_lines`
- `commissions`
- `settlement_records`

### Fulfillment

- `delivery_zones`
- `merchant_delivery_methods`
- `pickup_windows`
- `fulfillments`
- `fulfillment_events`
- `delivery_proofs`

### Communication, AI, and operations

- `notification_preferences`
- `notifications`
- `support_cases`
- `conversations`
- `conversation_messages`
- `ai_tool_events`
- `reviews`
- `audit_events`
- `feature_flags`
- `webhook_receipts`
- `reconciliation_runs`

### Key integrity constraints

- SKU uniqueness is merchant-scoped.
- Order numbers are human-readable but not used as primary keys.
- Payment provider event IDs are unique per provider.
- Idempotency keys are unique per actor/operation scope.
- Monetary values use integer minor units and an explicit currency.
- An order line references its source variant but retains an immutable commercial snapshot.
- Inventory cannot become negative through ordinary sale/reservation paths.
- Tenant-owned resources cannot reference another tenant’s private records.

## 13. API/domain boundaries

Illustrative endpoints:

```text
GET    /api/mall/home
GET    /api/search
GET    /api/stores/{slug}
GET    /api/products/{slug}

GET    /api/basket
POST   /api/basket/items
PATCH  /api/basket/items/{id}
POST   /api/checkouts
POST   /api/checkouts/{id}/payments

GET    /api/me/orders
GET    /api/me/orders/{id}
POST   /api/me/orders/{id}/cancellation-requests

GET    /api/merchant/orders
POST   /api/merchant/orders/{id}/transitions
GET    /api/merchant/products
POST   /api/merchant/products
POST   /api/merchant/catalogue-imports

POST   /api/stores/{id}/assistant/messages

POST   /api/webhooks/payments/{provider}
POST   /api/webhooks/fulfillment/{provider}
```

Authorization, validation, idempotency, rate limits, and audit requirements apply at the API boundary. Administrative intervention uses dedicated actions, not ordinary merchant endpoints with elevated parameters.

## 14. Security, privacy, and reliability baseline

### Access and identity

- Strong password hashing and optional passkey/social identity later
- Email or phone verification
- MFA required for administrators and finance roles; strongly encouraged for merchant owners
- Server-side sessions or securely implemented short-lived tokens
- Role and tenant authorization on every protected resource
- Step-up authentication for financial/account ownership changes

### Application security

- CSRF protection where cookies authenticate requests
- Output encoding and content sanitization
- Parameterized database access
- Strict upload type/size scanning and image re-encoding
- Rate limiting for authentication, search abuse, AI, checkout, and webhooks
- Secrets managed outside source control
- Secure headers and transport encryption
- Dependency and code security scanning in CI
- Tested backup and restore procedures

### Payment security

- No raw PAN/CVV storage or logging
- Provider-hosted secure payment collection
- Signed webhook verification
- Replay protection and idempotent processing
- Internal totals recalculated server-side
- Refund permissions separated and audited

### Privacy

- Collect only data required for account, fulfillment, support, fraud prevention, and consented communication.
- Give merchants only the customer information required to fulfill their orders.
- Do not expose one merchant’s customer/order information to another.
- Define retention periods for abandoned baskets, AI conversations, support evidence, and logs.
- Record marketing consent independently of transactional messages.
- Provide account data access/correction and a controlled deletion/anonymization process subject to transaction retention duties.

### Reliability

- Health monitoring and alerting
- Centralized structured logs without sensitive payloads
- Error tracking and request correlation IDs
- Automated database backups
- Recovery objectives documented before launch
- Payment and notification retry queues with dead-letter visibility
- Graceful behavior when AI, search, messaging, or payment provider is unavailable

## 15. Notifications

Transactional events include:

- Account verification and security changes
- Order placed/payment result
- Merchant acceptance or rejection
- Ready for pickup
- Dispatched/out for delivery
- Collected/delivered
- Cancellation/refund status
- Merchant new-order and SLA reminders
- Low stock and import completion/error

Every template uses plain language, a stable order reference, and a direct action link. Transactional communication cannot be disabled where it is necessary to provide the service; marketing remains opt-in.

## 16. Operational policies required before launch

- Merchant participation agreement
- Catalogue and prohibited-items policy
- Customer terms of use
- Privacy notice
- Payment, cancellation, refund, and chargeback process
- Mall minimum returns framework plus merchant-specific terms
- Delivery/pickup responsibility matrix
- Merchant response and fulfillment SLA
- Product/content takedown procedure
- Customer support and escalation procedure
- Data incident response plan
- Administrator access and financial approval policy

These require review by appropriately qualified Namibian legal, accounting, banking/payment, and consumer-protection advisers before accepting live money.

## 17. Pilot success metrics

### Supply quality

- 5–10 active pilot merchants
- At least 80% of published products meeting catalogue completeness rules
- Stock discrepancy/cancellation rate below an agreed threshold
- Merchant median order response time

### Customer funnel

- Search/store visit to product-view rate
- Product view to add-to-basket rate
- Basket to successful payment/order rate
- Repeat purchase rate
- AI-assisted versus standard conversion

### Operations

- Payment success rate
- Merchant acceptance rate
- Orders ready within promised window
- On-time delivery/pickup rate
- Cancellation, refund, dispute, and support-contact rates
- Reconciliation exceptions

### Economics

- Gross merchandise value (GMV)
- Net platform revenue
- Effective take rate
- Payment and delivery cost per order
- Support effort per order
- Merchant retention and willingness to pay

Exact numerical targets should be set after merchant interviews and payment/delivery pricing are known. During pilot, trustworthy operations matter more than vanity traffic.

## 18. Delivery plan

### Phase 0 — validation and decisions (2 weeks)

- Interview 8–12 candidate merchants using a consistent script.
- Obtain real sample catalogues, variant structures, stock practices, returns, and fulfillment workflows.
- Shortlist payment providers and get written answers to the payment checklist.
- Select pilot categories and merchants.
- Finalize commercial model and operating policies.
- Produce low-fidelity customer, merchant, and admin wireframes.

**Exit:** committed pilot merchants, viable payment path, signed-off scope, and testable wireframes.

### Phase 1 — platform foundation (4 weeks)

- Repository, environments, CI, database migrations, observability
- Identity, roles, tenancy, merchant and branch administration
- Category taxonomy, catalogue, variants, media, imports
- Public mall, storefront, product detail, and search
- Admin merchant/catalogue approval

**Exit:** an approved merchant can publish a complete storefront and customers can reliably browse it.

### Phase 2 — commerce (4 weeks)

- Basket and immutable pricing snapshots
- Inventory reservations
- Checkout group and merchant order model
- Pickup and delivery-zone selection
- Payment provider integration and webhooks
- Merchant order queue and validated state transitions
- Customer order tracking and notifications

**Exit:** end-to-end sandbox orders reconcile correctly through fulfillment and refund paths.

### Phase 3 — intelligence and operations (3 weeks)

- Store-specific catalogue-grounded AI
- AI evaluations and safety controls
- Merchant dashboard and basic reporting
- Finance reconciliation and exception queues
- Support cases, cancellation, refund, and dispute workflows
- Audit views and operational alerts

**Exit:** operations can identify and resolve all defined pilot exceptions.

### Phase 4 — hardening and pilot launch (3 weeks)

- Accessibility, mobile/browser, load, security, and recovery testing
- Payment/refund failure drills
- Merchant training and catalogue cleanup
- Analytics instrumentation and dashboards
- Staged launch, monitored orders, and daily pilot review

**Exit:** production readiness checklist signed and first controlled live transactions completed.

The 16-week outline assumes a small experienced delivery team, responsive partners, and tight scope. Provider onboarding, merchant data cleanup, or compliance review can extend the calendar independently of software development.

## 19. Prioritized implementation backlog

### P0 — required for controlled live launch

1. Identity, verification, recovery, MFA for privileged roles
2. Merchant tenants, branches, staff roles, and approval
3. Categories, products, variants, images, price, and publication workflow
4. Spreadsheet catalogue import with preview and error report
5. Branch inventory, reservations, expiry, and adjustment history
6. Mall home, search, storefront, and product detail
7. Basket grouped by merchant
8. Checkout group and merchant orders
9. Pickup plus configured local delivery zones
10. Licensed payment integration, verified webhooks, refunds, and reconciliation
11. Merchant order queue and server-controlled state transitions
12. Customer order timeline and transactional notifications
13. Mall administration, support, moderation, and audit log
14. Security, backups, monitoring, and production operations
15. Terms/policy acceptance and consent records

### P1 — high-value pilot enhancement

1. Store AI assistant with structured catalogue tools
2. Wishlist
3. Promotions and voucher codes
4. Verified-order reviews
5. Merchant analytics and AI demand insights
6. Delivery proof and pickup QR/code
7. Customer support case messaging
8. Basic merchandising/featured placements

### P2 — after product-market evidence

1. Approved single-payment marketplace settlement
2. Mall-wide AI concierge
3. Shopping requests and merchant offers
4. Abandoned-basket automation
5. Loyalty and rewards
6. Courier integrations and live tracking
7. POS/inventory synchronization
8. Franchise and multi-branch analytics
9. Sponsored products with transparent labeling
10. Native mobile applications

### P3 — experiential expansion

1. Interactive 2D mall map
2. Rich themed/immersive storefront templates
3. Live shopping and events
4. Optional 3D experiences where metrics show value

## 20. Acceptance criteria for the pilot release

The pilot is launchable only when all of the following are demonstrated:

- A mall administrator can approve a merchant and its storefront.
- Merchant staff cannot access another merchant’s private data, including through changed URLs or API IDs.
- A merchant can import and publish variants, prices, media, stock, and fulfillment settings.
- A customer can find a product by keyword, category, and relevant attribute.
- The basket correctly separates merchants and calculates each group’s totals.
- Concurrent checkout tests do not oversell exact-stock products.
- Successful, failed, abandoned, duplicated, and delayed payment callbacks produce correct idempotent results.
- Every payment and refund can be reconciled to an internal merchant order and provider reference.
- A merchant can accept, prepare, and complete pickup/delivery using only allowed transitions.
- A customer sees accurate per-merchant tracking and receives essential notifications.
- Cancellation, partial/full refund, unavailable stock, and delivery failure paths are tested.
- Store AI never returns products outside its authorized published catalogue in evaluation tests.
- Price and stock are verified outside the model before basket and checkout actions.
- Privileged and financial actions appear in an immutable audit trail.
- Backup restoration and critical provider outage procedures are exercised.
- Required policies, agreements, contacts, and escalation owners are in place.

## 21. Provider and merchant discovery checklists

### Payment provider questions

1. Are you licensed/authorized for the proposed Namibian transaction flow?
2. Do you support platform or marketplace merchant onboarding?
3. Can one payment be split among merchants and the platform?
4. Who holds funds, performs KYC, and bears chargeback responsibility?
5. Can the platform initiate partial refunds through an API?
6. How are commissions, processing fees, and settlement statements represented?
7. What cards and alternative methods are supported in NAD?
8. Are hosted fields, redirect checkout, tokenization, 3DS, webhooks, sandbox, and idempotency supported?
9. What are payout timing, reserves, dispute fees, and reconciliation formats?
10. What are onboarding costs, transaction fees, minimums, and contract terms?

### Merchant interview questions

1. How many active SKUs and variants do you have?
2. Where is stock recorded and how accurate is it?
3. Who will update catalogue/stock and respond to orders?
4. Which products are suitable for pickup and local delivery?
5. What are preparation times, operating hours, returns, and cancellations?
6. What product files and image assets already exist?
7. Which customer questions recur most often?
8. Which payment and delivery methods are currently used?
9. What monthly price or commission structure is acceptable?
10. What would make the pilot successful enough to continue?

## 22. Decisions still requiring owner validation

These decisions do not block architecture work, but must be settled before live development milestones are signed off:

1. Final public brand name and domain
2. Pilot categories and named merchants
3. Merchant subscription versus commission model during pilot
4. Initial payment provider and approved transaction mode
5. Pay-on-collection eligibility
6. Delivery partner versus merchant-managed delivery
7. Mall minimum returns policy
8. Customer support operating hours and ownership
9. Preferred application technology stack based on the delivery team
10. Whether NeuroEdge identity will be shared with NeuroEstates at launch or integrated later

## 23. Immediate next actions

1. Select 8–12 merchant prospects and conduct discovery interviews.
2. Contact at least three payment/acquiring candidates using the checklist above.
3. Choose the pilot categories using catalogue quality and fulfillment simplicity, not market size alone.
4. Create low-fidelity wireframes for the critical customer, merchant, and admin journeys.
5. Convert the P0 backlog into development epics and test cases.
6. Select the stack and scaffold the application only after the payment flow and pilot assumptions are confirmed.

---

This blueprint is a product and technical design document, not legal, financial, or regulatory advice. Payment, marketplace, tax, privacy, returns, and consumer obligations must be validated with qualified Namibian advisers and contracted providers before launch.
