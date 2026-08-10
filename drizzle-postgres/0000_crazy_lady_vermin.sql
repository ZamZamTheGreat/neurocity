CREATE TABLE "application_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"document_type" varchar(80) NOT NULL,
	"storage_key" text,
	"original_name" text,
	"mime_type" varchar(120),
	"size_bytes" integer,
	"status" varchar(32) DEFAULT 'pending_upload' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_ref" text NOT NULL,
	"action" varchar(120) NOT NULL,
	"resource_type" varchar(80) NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"branch" varchar(200) NOT NULL,
	"on_hand" integer,
	"reserved" integer DEFAULT 0 NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(32) NOT NULL,
	"status" varchar(40) DEFAULT 'submitted' NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"trading_name" varchar(200) NOT NULL,
	"registration_number" varchar(120) NOT NULL,
	"business_type" varchar(80) NOT NULL,
	"category" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"representative_name" varchar(160) NOT NULL,
	"representative_role" varchar(120) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(80) NOT NULL,
	"physical_address" text NOT NULL,
	"website" text,
	"social_profiles" text,
	"branch_count" integer DEFAULT 1 NOT NULL,
	"branch_locations" text NOT NULL,
	"product_summary" text NOT NULL,
	"estimated_product_count" integer DEFAULT 1 NOT NULL,
	"pickup_available" boolean DEFAULT false NOT NULL,
	"delivery_available" boolean DEFAULT false NOT NULL,
	"delivery_details" text,
	"returns_policy" text NOT NULL,
	"terms_accepted" boolean DEFAULT false NOT NULL,
	"privacy_accepted" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" integer,
	"review_notes" text,
	"merchant_id" integer
);
--> statement-breakpoint
CREATE TABLE "merchant_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"code_hash" text NOT NULL,
	"role" varchar(32) DEFAULT 'staff' NOT NULL,
	"invited_email" varchar(320),
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"user_ref" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"role" varchar(32) DEFAULT 'staff' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"category" varchar(120) NOT NULL,
	"status" varchar(32) DEFAULT 'pilot' NOT NULL,
	"contact_name" varchar(160),
	"contact_email" varchar(320),
	"contact_phone" varchar(80),
	"website" text,
	"pickup_location" text,
	"delivery_mode" varchar(40) DEFAULT 'merchant_managed' NOT NULL,
	"setup_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"sku_snapshot" varchar(100) NOT NULL,
	"name_snapshot" varchar(220) NOT NULL,
	"unit_price" double precision NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"customer_ref" text NOT NULL,
	"status" varchar(48) DEFAULT 'draft' NOT NULL,
	"payment_method" varchar(60),
	"fulfillment_method" varchar(60),
	"total" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(220) NOT NULL,
	"collection" varchar(160),
	"description" text DEFAULT '' NOT NULL,
	"price" double precision,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"image_url" text,
	"badge" varchar(120)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"platform_role" varchar(32) DEFAULT 'customer' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_merchant_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."merchant_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_applications" ADD CONSTRAINT "merchant_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_applications" ADD CONSTRAINT "merchant_applications_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_invitations" ADD CONSTRAINT "merchant_invitations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_memberships" ADD CONSTRAINT "merchant_memberships_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_document_type" ON "application_documents" USING btree ("application_id","document_type");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "audit_events" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inventory_product_branch" ON "inventory" USING btree ("product_id","branch");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_applications_reference" ON "merchant_applications" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_applications_status" ON "merchant_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_applications_email" ON "merchant_applications" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invitation_code_hash" ON "merchant_invitations" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "idx_invitation_merchant" ON "merchant_invitations" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_membership_merchant_user" ON "merchant_memberships" USING btree ("merchant_id","user_ref");--> statement-breakpoint
CREATE INDEX "idx_membership_user" ON "merchant_memberships" USING btree ("user_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_merchants_slug" ON "merchants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_merchant_status" ON "orders" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_customer_ref" ON "orders" USING btree ("customer_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_products_merchant_sku" ON "products" USING btree ("merchant_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sessions_token_hash" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");