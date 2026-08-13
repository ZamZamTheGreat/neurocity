CREATE TABLE "merchant_delivery_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"area" varchar(160) NOT NULL,
	"fee" double precision DEFAULT 0 NOT NULL,
	"estimated_time" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchant_delivery_zones" ADD CONSTRAINT "merchant_delivery_zones_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_delivery_zones_merchant_area" ON "merchant_delivery_zones" USING btree ("merchant_id","area");--> statement-breakpoint
CREATE INDEX "idx_delivery_zones_merchant_active" ON "merchant_delivery_zones" USING btree ("merchant_id","active");