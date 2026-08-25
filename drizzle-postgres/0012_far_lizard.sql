CREATE TABLE "service_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"status" varchar(32) DEFAULT 'requested' NOT NULL,
	"requested_start" timestamp with time zone NOT NULL,
	"scheduled_start" timestamp with time zone,
	"duration_minutes" integer,
	"service_mode" varchar(32),
	"price_snapshot" double precision,
	"pricing_model" varchar(32) DEFAULT 'fixed' NOT NULL,
	"customer_notes" text,
	"merchant_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_service_bookings_merchant_status" ON "service_bookings" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "idx_service_bookings_customer" ON "service_bookings" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_service_bookings_schedule" ON "service_bookings" USING btree ("merchant_id","scheduled_start");