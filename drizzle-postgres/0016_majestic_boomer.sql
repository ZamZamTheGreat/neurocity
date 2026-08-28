CREATE TABLE "checkout_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(40) NOT NULL,
	"customer_ref" text NOT NULL,
	"currency" varchar(3) DEFAULT 'NAD' NOT NULL,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"delivery_fee" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"payment_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"payment_provider" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_payment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_group_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"merchant_id" integer NOT NULL,
	"gross_amount" double precision NOT NULL,
	"delivery_amount" double precision DEFAULT 0 NOT NULL,
	"platform_fee" double precision DEFAULT 0 NOT NULL,
	"provider_fee" double precision DEFAULT 0 NOT NULL,
	"net_amount" double precision NOT NULL,
	"settlement_status" varchar(32) DEFAULT 'unpaid' NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_group_id" integer NOT NULL,
	"provider" varchar(40) NOT NULL,
	"provider_reference" text,
	"provider_payment_token" text,
	"amount" double precision NOT NULL,
	"currency" varchar(3) DEFAULT 'NAD' NOT NULL,
	"status" varchar(32) DEFAULT 'created' NOT NULL,
	"checkout_url" text,
	"failure_code" varchar(100),
	"failure_message" text,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_group_id" integer;--> statement-breakpoint
ALTER TABLE "merchant_payment_allocations" ADD CONSTRAINT "merchant_payment_allocations_checkout_group_id_checkout_groups_id_fk" FOREIGN KEY ("checkout_group_id") REFERENCES "public"."checkout_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payment_allocations" ADD CONSTRAINT "merchant_payment_allocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payment_allocations" ADD CONSTRAINT "merchant_payment_allocations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_checkout_group_id_checkout_groups_id_fk" FOREIGN KEY ("checkout_group_id") REFERENCES "public"."checkout_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_checkout_groups_reference" ON "checkout_groups" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_checkout_groups_customer" ON "checkout_groups" USING btree ("customer_ref","created_at");--> statement-breakpoint
CREATE INDEX "idx_checkout_groups_payment_status" ON "checkout_groups" USING btree ("payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_merchant_payment_allocations_order" ON "merchant_payment_allocations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_payment_allocations_merchant" ON "merchant_payment_allocations" USING btree ("merchant_id","settlement_status");--> statement-breakpoint
CREATE INDEX "idx_merchant_payment_allocations_checkout" ON "merchant_payment_allocations" USING btree ("checkout_group_id");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_checkout" ON "payment_transactions" USING btree ("checkout_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_transactions_provider_reference" ON "payment_transactions" USING btree ("provider","provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_transactions_provider_token" ON "payment_transactions" USING btree ("provider","provider_payment_token");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_status" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_group_id_checkout_groups_id_fk" FOREIGN KEY ("checkout_group_id") REFERENCES "public"."checkout_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_orders_checkout_group" ON "orders" USING btree ("checkout_group_id");