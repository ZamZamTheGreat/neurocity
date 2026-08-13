ALTER TABLE "merchants" ADD COLUMN "payment_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_instructions" jsonb;