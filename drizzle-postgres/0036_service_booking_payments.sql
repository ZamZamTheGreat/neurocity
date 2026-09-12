ALTER TABLE "service_bookings" ADD COLUMN IF NOT EXISTS "order_id" integer REFERENCES "orders"("id") ON DELETE SET NULL;
ALTER TABLE "service_bookings" ADD COLUMN IF NOT EXISTS "payment_status" varchar(32) DEFAULT 'not_started' NOT NULL;
ALTER TABLE "service_bookings" ADD COLUMN IF NOT EXISTS "payment_expires_at" timestamp with time zone;
ALTER TABLE "service_bookings" ADD COLUMN IF NOT EXISTS "quote_accepted_at" timestamp with time zone;
ALTER TABLE "service_bookings" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_bookings_order" ON "service_bookings" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_service_bookings_payment" ON "service_bookings" ("payment_status", "payment_expires_at");
