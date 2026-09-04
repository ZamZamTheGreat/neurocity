# NeuroEdge Virtual Mall

NeuroEdge Virtual Mall is a mobile-first digital shopping mall for Namibian merchants and shoppers. It combines branded storefronts, catalogue search, AI-assisted shopping, ordering, pickup/delivery, and merchant operations in one platform.

The implementation-ready V1 product blueprint is in [docs/V1_PRODUCT_BLUEPRINT.md](docs/V1_PRODUCT_BLUEPRINT.md).

## Current status

- Product concept assessed
- V1 pilot scope defined
- Architecture and core data model proposed
- Commerce, payment, fulfillment, and AI boundaries documented
- Delivery backlog and acceptance criteria prepared

## Recommended next step

Validate the blueprint with 5–10 pilot merchants and shortlisted payment providers, then create the UX wireframes and application skeleton.

## Automated tests

- `npm test` builds the production application and runs the fast rendering and access-boundary suite.
- `npm run test:integration` starts an isolated disposable PostgreSQL 16 Docker container, applies every migration, builds the application, runs the database-backed customer/merchant/checkout journey, and removes the container.
- `npm run test:all` runs both suites.
- `npm run test:load` runs a read-only concurrency test against `LOAD_TEST_URL` (defaults to local development). Tune `LOAD_TEST_REQUESTS`, `LOAD_TEST_CONCURRENCY`, and the comma-separated `LOAD_TEST_PATHS` environment variables. Run this from CI or a trusted host with valid TLS; never point it at a third-party service without permission.

Docker Desktop must be running for the integration suite. The runner allocates a random local port and refuses to run the database tests unless the connection URL identifies the disposable `neurocity_test` database.

## Runtime capacity

The PostgreSQL pool defaults to 10 connections per application instance. `DB_POOL_MAX`, `DB_IDLE_TIMEOUT_MS`, and `DB_CONNECT_TIMEOUT_MS` can tune this for the Render database plan. Keep the combined pool maximum across every web instance below the database connection limit, leaving capacity for migrations and administration. `/api/health` reports database latency and non-sensitive pool utilization for operational checks.

## PayToday activation

The PayToday checkout adapter remains hidden until all three credentials are configured. Add these as secret environment variables in Render when PayToday activates the NeuroCity account:

- `PAYTODAY_ENVIRONMENT=sandbox` (change to `live` only after production approval)
- `PAYTODAY_SHOP_KEY`
- `PAYTODAY_SHOP_HANDLE`
- `PAYTODAY_PRIVATE_KEY`

Never commit these values. The checkout return URL is generated from the public request origin and ends at `/api/payments/paytoday/return`.
