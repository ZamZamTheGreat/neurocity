ALTER TABLE "merchant_applications" ADD COLUMN "offering_type" varchar(24) DEFAULT 'products' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "offering_type" varchar(24) DEFAULT 'products' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "item_type" varchar(24) DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pricing_model" varchar(32) DEFAULT 'fixed' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "service_mode" varchar(32);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "booking_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_products_item_type" ON "products" USING btree ("item_type");