# Security hardening deployment

These changes require a coordinated deployment. From a trusted operator machine or CI job that is separate from the Render web service, run `npm run db:migrate` to apply migration `0022_security_rate_limits` before deploying the application. The application fails closed when its rate-limit database or upload scanner is unavailable.

## Required configuration

- `DATABASE_URL`: restricted runtime credential. It needs connect, schema usage, application-table CRUD and sequence usage, but must not have schema creation or ownership privileges.
- `DATABASE_MIGRATION_URL`: database owner/migration credential. Set this only in a separate trusted operator or CI environment. Never add it to the Render web service: its build and runtime share service configuration. `npm run db:migrate` prefers this value and warns if production falls back to `DATABASE_URL`.
- `PUBLIC_SITE_URL`: exact HTTPS origin of the primary site.
- `SECURITY_ALLOWED_ORIGINS`: comma-separated HTTPS origins of any additional public mall domains. Direct and forwarded hosts can only select origins already present in this allowlist; they cannot add trusted origins.
- `TRUSTED_CLIENT_IP_HEADER`: leave unset until the ingress is confirmed to overwrite it. Unset means requests share a conservative rate-limit bucket. For a proxy that appends to `X-Forwarded-For`, only the last address is used. Do not enable a client-controlled header. Direct ingress must be restricted accordingly.
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`: create a Cloudflare Turnstile Managed widget restricted to every production hostname. The site key is returned to browsers; the secret must exist only in the deployment secret store. Production registration, login, merchant applications and invitation claims fail closed if the secret is missing or Siteverify is unavailable. Tokens are verified server-side and bound to their expected action and request hostname.
- `SECURITY_ALERT_EMAIL`: recipient for sanitized application security alerts; defaults to `ADMIN_EMAIL`. Requires the SMTP variables below. Alerts have ten-minute in-process cooldowns to reduce flooding.
- `SECURITY_ALERT_WEBHOOK_URL`: optional HTTPS incident receiver for the same sanitized alerts. Render email or Slack notifications remain the infrastructure-level fallback.
- `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: private HTTPS object storage. Disable public bucket access. Browser PUT permissions are no longer required. Revoke previously issued write capabilities during rollout by rotating the storage access key using the normal secret-management process.
- `CLAMAV_HOST`, `CLAMAV_PORT` (default 3310): a private, reachable clamd service with current signature definitions and INSTREAM enabled. Never expose its unauthenticated TCP port to the public internet. Set stream/scan limits above the application's 10 MB limit. Set `AlertExceedsMax`, `AlertEncrypted`, and `AlertBroken` to `yes` so unscannable inputs are rejected. Monitor scanner readiness and signature freshness. A scanner outage blocks uploads.

The web application runs on Node (as in the Render service); native image decoding and the private TCP scanner are not compatible with a pure Cloudflare Workers runtime.

## Changed behavior

Registration always creates a customer and never attaches merchant ownership based only on an email match. Existing administrators are unchanged. Verify existing privileged account ownership separately; a code fix cannot establish whether a previous registration was legitimate. To provision an administrator, an operator with database access can run `node scripts/provision-admin.mjs <verified-email> <verified-user-id>` after verifying the person's identity out of band. This revokes that account's sessions and records an audit event.

Logout GET displays a confirmation form. Only a same-origin POST ends the session. API mutations require an Origin header matching a configured origin; command-line/integration clients must send it too.

Uploads are limited by actual streamed bytes, authenticated tickets, declared file signatures, ClamAV scanning, image decoding/re-encoding, and PDF page reconstruction. Storage writes are conditional on the object not already existing. PDFs lose forms, links, annotations and attachments; downloads use attachment disposition. Old objects without a scan marker are unavailable through file-download endpoints until replaced with a new verified upload. No files are deleted by this release.

Nonce-based CSP replaces inline-script permission. HTML and API responses receive private/no-store cache policy. The existing Google tag and payment hosts have explicit allowances.

Rate limits are shared in PostgreSQL: 300 mutations per connection per 10 minutes; 30 per authentication endpoint; 10 login attempts per normalized account (shared with merchant-application authentication); concierge search 20 and visual search 5 per connection. Expired records are opportunistically cleaned in bounded batches. Review these limits against legitimate traffic and proxy configuration before increasing them.

Cloudflare Turnstile complements these limits on login, registration, merchant applications and merchant invitation claims. Do not remove the server-side limits after enabling the widget. For automated non-production testing, use Cloudflare's published test keys; never deploy test credentials to production.

## Verification

`npm run test:security` applies the real migration chain to a disposable embedded PostgreSQL database and tests actual registration/login/session code, concurrent limits, origin enforcement, bounded bodies, upload tickets, and scanner protocol behavior. It cannot establish production ingress configuration, actual R2 permissions, scanner freshness, or current administrator ownership. `npm run build` checks the deployable bundle. Run the built security HTTP tests after each framework update.

Before rollout, confirm scanner connectivity, private storage permissions and trusted public origins in staging; verify customer, merchant and administrator access using dedicated test accounts. No production migration, role change, secret rotation or deployment was performed by the local test harness.

## Runtime database separation

1. Create a second PostgreSQL credential for the application runtime and keep the existing owner credential as the migration credential.
2. In a controlled administrative environment, set `DATABASE_MIGRATION_URL` to the owner URL and `DATABASE_URL` to the new runtime URL.
3. Run `npm run db:migrate`, `npm run db:grant-runtime`, and then `npm run db:verify-runtime`.
4. Configure the Render web service with only the restricted `DATABASE_URL`. Delete `DATABASE_MIGRATION_URL` from that service if it was ever added. Production startup deliberately fails if an owner URL is present.
5. Redeploy and verify `/api/health`, login, checkout and merchant operations before revoking any superseded runtime credential.

Render-managed rotation credentials can be provider-configured to assume the original database-owner role. If `db:verify-runtime` reports different session and effective users, the application credential is not least privilege even if its explicit table grants are narrow. Do not attempt unsupported role changes or delete the owner. Ask Render support to remove the owner-role inheritance, or defer this defense-in-depth control and record the residual risk.

See `docs/INCIDENT_RESPONSE_AND_RECOVERY.md` for monitoring, backup retention and the monthly restore drill.
