ALTER TABLE "customer_companion_profiles" ALTER COLUMN "companion_name" SET DEFAULT 'Selma';
--> statement-breakpoint
UPDATE "customer_companion_profiles" SET "companion_name" = 'Selma', "updated_at" = now() WHERE "companion_name" = 'James';
