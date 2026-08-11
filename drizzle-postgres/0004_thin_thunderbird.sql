CREATE TABLE "order_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"status" varchar(48) NOT NULL,
	"actor_ref" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "sku_snapshot" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_snapshot" varchar(180);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "size_snapshot" varchar(80);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "color_snapshot" varchar(80);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "line_total" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" varchar(160);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_email" varchar(320);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_phone" varchar(80);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" varchar(32) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "address_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_status_events_order" ON "order_status_events" USING btree ("order_id","created_at");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_items_variant" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_orders_payment_status" ON "orders" USING btree ("payment_status");