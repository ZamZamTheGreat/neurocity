ALTER TABLE "advertising_campaigns" ADD COLUMN IF NOT EXISTS "product_id" integer REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "advertising_campaigns" DROP CONSTRAINT IF EXISTS "advertising_campaigns_placement_check";
ALTER TABLE "advertising_campaigns" ADD CONSTRAINT "advertising_campaigns_placement_check" CHECK ("placement" IN ('home', 'marketplace', 'home_featured'));
CREATE INDEX IF NOT EXISTS "idx_advertising_campaigns_product" ON "advertising_campaigns" ("product_id");
