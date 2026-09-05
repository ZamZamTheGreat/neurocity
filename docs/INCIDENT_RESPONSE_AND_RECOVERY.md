# Incident response and database recovery

## Ownership and targets

- The NeuroCity operator owns incident coordination and credential rotation.
- Target recovery point (RPO): no more than 24 hours for portable logical exports; use Render point-in-time recovery for a more recent recovery point when available.
- Target recovery time (RTO): four hours for a database-only incident.
- Never restore over the active production database. Restore into a new isolated database, validate it, then change the application connection string.

## Required production controls

1. Use a paid Render Postgres plan with point-in-time recovery. Free instances do not provide Render recovery or logical-backup features.
2. In the database **Recovery** page, create a logical export at least weekly and retain an encrypted copy outside the Render account according to the business retention policy.
3. Configure Render workspace email or Slack notifications for deploy failures and unhealthy services.
4. Configure `SECURITY_ALERT_WEBHOOK_URL` for application alerts. The payload contains event types and hashed identifiers, never credentials or request bodies.
5. Limit Render workspace membership, require strong account authentication, and review access quarterly.

## Monthly restore drill

1. Start a point-in-time recovery or create a new isolated Postgres database and restore the latest logical export.
2. Do not connect the production service to it.
3. Set `RESTORE_DATABASE_URL` locally or in a one-off administrative environment to the restored database.
4. Run `npm run db:verify-restore`. This is read-only, refuses the active configured database URLs, verifies core tables, and reports row counts.
5. Validate a sample of non-sensitive aggregate records: users, merchants, orders and audit events. Do not copy customer data into tickets or chat.
6. Record the recovery point, elapsed restore time, validation result and operator. Remove the isolated restore after the drill using the provider dashboard.

## Incident procedure

1. Preserve logs and note the first observed time, affected service and alert event.
2. Contain access: rotate the affected credential, revoke sessions or disable the affected account as appropriate.
3. If data integrity is uncertain, stop writes before recovery and preserve the original database for investigation.
4. Restore to a new database using a point before the incident. Run the restore verifier and application smoke tests.
5. Update `DATABASE_URL` only after validation, redeploy, and monitor health and security alerts.
6. Document root cause, affected records, notification obligations and preventive changes.

## Quarterly checks

- Run `npm audit`, the security suite, `npm run db:verify-runtime`, and a restore drill.
- Review Render notification recipients, database IP allowlists, active credentials, workspace members, R2 public-access settings and Cloudflare Turnstile hostnames.
- Confirm `DATABASE_URL` is the restricted runtime role and `DATABASE_MIGRATION_URL` exists only in a separate trusted operator or CI environment, never in the web service.
