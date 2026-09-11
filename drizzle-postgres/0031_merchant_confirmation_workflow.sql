ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "workflow" varchar(64) DEFAULT 'legacy_retail_v1' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "workflow_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmation_expires_at" timestamp with time zone;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_expires_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "idx_orders_confirmation_expiry" ON "orders" ("status", "confirmation_expires_at");
CREATE INDEX IF NOT EXISTS "idx_orders_payment_expiry" ON "orders" ("status", "payment_expires_at");
