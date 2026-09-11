CREATE TABLE IF NOT EXISTS "advertising_campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "merchant_id" integer NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
  "placement" varchar(32) NOT NULL,
  "headline" varchar(180) NOT NULL,
  "description" text,
  "call_to_action" varchar(60) NOT NULL DEFAULT 'Visit store',
  "status" varchar(24) NOT NULL DEFAULT 'draft',
  "sort_order" integer NOT NULL DEFAULT 0,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "advertising_campaigns_placement_check" CHECK ("placement" IN ('home', 'marketplace')),
  CONSTRAINT "advertising_campaigns_status_check" CHECK ("status" IN ('draft', 'active', 'paused')),
  CONSTRAINT "advertising_campaigns_window_check" CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at")
);
CREATE INDEX IF NOT EXISTS "idx_advertising_campaigns_placement_status" ON "advertising_campaigns" ("placement", "status");
CREATE INDEX IF NOT EXISTS "idx_advertising_campaigns_merchant" ON "advertising_campaigns" ("merchant_id");
ALTER TABLE "customer_companion_profiles" ALTER COLUMN "companion_name" SET DEFAULT 'Selma-AI';
