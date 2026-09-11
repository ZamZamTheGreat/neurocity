ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "enabled_categories" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "enabled_commerce_types" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "commerce_type" varchar(40) DEFAULT 'general_retail' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "commerce_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;
UPDATE "products" SET "commerce_type" = CASE
  WHEN "item_type" = 'service' OR COALESCE("category", '') ~* 'service|salon|barber|repair|photograph|tailor' THEN 'service_booking'
  WHEN COALESCE("category", '') ~* 'fashion|cloth|shoe|accessor|jewellery|luxury|sport' THEN 'apparel'
  WHEN COALESCE("category", '') ~* 'food|drink|restaurant|takeaway|café|cafe|bakery' THEN 'prepared_food'
  WHEN COALESCE("category", '') ~* 'grocer|household|supermarket|convenience|butcher' THEN 'grocery'
  ELSE 'general_retail' END;
UPDATE "merchants" m SET "enabled_categories" = COALESCE((SELECT jsonb_agg(DISTINCT p."category") FROM "products" p WHERE p."merchant_id" = m."id" AND p."category" IS NOT NULL), jsonb_build_array(m."category"));
UPDATE "merchants" m SET "enabled_commerce_types" = COALESCE((SELECT jsonb_agg(DISTINCT p."commerce_type") FROM "products" p WHERE p."merchant_id" = m."id"), '[]'::jsonb);
CREATE INDEX IF NOT EXISTS "idx_products_commerce_type" ON "products" USING btree ("commerce_type");
