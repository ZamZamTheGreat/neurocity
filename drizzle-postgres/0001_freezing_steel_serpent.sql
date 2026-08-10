CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" varchar(120) NOT NULL,
	"title" varchar(180) NOT NULL,
	"size" varchar(80),
	"color" varchar(80),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price" double precision NOT NULL,
	"sale_price" double precision,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"name" varchar(180) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(120) DEFAULT 'Windhoek' NOT NULL,
	"phone" varchar(80),
	"pickup_enabled" boolean DEFAULT false NOT NULL,
	"delivery_enabled" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"opens_at" varchar(8),
	"closes_at" varchar(8),
	"closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" varchar(32) DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "tagline" varchar(240);--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "primary_category" varchar(120);--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "policies" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "contact_options" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "fulfillment_methods" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" varchar(160);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" varchar(160);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price" double precision;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "availability" varchar(32) DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_branches" ADD CONSTRAINT "store_branches_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_hours" ADD CONSTRAINT "store_hours_branch_id_store_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."store_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_promotions" ADD CONSTRAINT "store_promotions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_inventory" ADD CONSTRAINT "variant_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_inventory" ADD CONSTRAINT "variant_inventory_branch_id_store_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."store_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_variants_sku" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_product_variants_product" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_store_branches_merchant" ON "store_branches" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_store_hours_branch_day" ON "store_hours" USING btree ("branch_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_store_promotions_merchant" ON "store_promotions" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_variant_inventory_variant_branch" ON "variant_inventory" USING btree ("variant_id","branch_id");
--> statement-breakpoint
UPDATE "merchants" SET "is_public" = true WHERE "slug" = 'lightwork-clothing' AND "status" IN ('pilot', 'onboarding', 'active');
