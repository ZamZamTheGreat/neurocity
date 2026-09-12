ALTER TABLE "merchant_applications" ADD COLUMN IF NOT EXISTS "categories" jsonb DEFAULT '[]'::jsonb NOT NULL;
UPDATE "merchant_applications" SET "categories" = jsonb_build_array("category") WHERE "categories" = '[]'::jsonb;
