CREATE TABLE "platform_tenant_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_tenant_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(32) DEFAULT 'manager' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_tenant_merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"merchant_id" integer NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"kind" varchar(32) DEFAULT 'marketplace' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"country" varchar(120) DEFAULT 'Namibia' NOT NULL,
	"city" varchar(120),
	"tagline" varchar(240),
	"logo_url" text,
	"mark_url" text,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_tenant_domains" ADD CONSTRAINT "platform_tenant_domains_tenant_id_platform_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."platform_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_tenant_memberships" ADD CONSTRAINT "platform_tenant_memberships_tenant_id_platform_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."platform_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_tenant_memberships" ADD CONSTRAINT "platform_tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_tenant_merchants" ADD CONSTRAINT "platform_tenant_merchants_tenant_id_platform_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."platform_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_tenant_merchants" ADD CONSTRAINT "platform_tenant_merchants_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_platform_tenant_domains_hostname" ON "platform_tenant_domains" USING btree ("hostname");--> statement-breakpoint
CREATE INDEX "idx_platform_tenant_domains_tenant" ON "platform_tenant_domains" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_platform_tenant_membership" ON "platform_tenant_memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_platform_tenant_memberships_user" ON "platform_tenant_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_platform_tenant_merchant" ON "platform_tenant_merchants" USING btree ("tenant_id","merchant_id");--> statement-breakpoint
CREATE INDEX "idx_platform_tenant_merchants_merchant" ON "platform_tenant_merchants" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_platform_tenants_slug" ON "platform_tenants" USING btree ("slug");--> statement-breakpoint
INSERT INTO "platform_tenants" ("name", "slug", "kind", "status", "country", "city", "tagline", "logo_url", "mark_url", "theme", "features")
VALUES ('NeuroCity', 'neurocity', 'marketplace', 'active', 'Namibia', NULL, 'Namibia''s intelligent digital mall.', '/branding/neurocity-logo.png', '/branding/neurocity-mark.png', '{"primary":"#18c98e","surface":"#07111f","accent":"#ffffff"}'::jsonb, '{"concierge":true,"multiMerchantCheckout":true,"merchantApplications":true}'::jsonb)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "platform_tenant_domains" ("tenant_id", "hostname", "is_primary", "verified_at")
SELECT "id", 'neurocity-fhl1.onrender.com', true, now() FROM "platform_tenants" WHERE "slug" = 'neurocity'
ON CONFLICT ("hostname") DO NOTHING;--> statement-breakpoint
INSERT INTO "platform_tenant_merchants" ("tenant_id", "merchant_id", "status", "featured")
SELECT tenant."id", merchant."id", 'active', merchant."slug" = 'lightwork-clothing'
FROM "platform_tenants" tenant CROSS JOIN "merchants" merchant
WHERE tenant."slug" = 'neurocity'
ON CONFLICT ("tenant_id", "merchant_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "platform_tenant_memberships" ("tenant_id", "user_id", "role", "status")
SELECT tenant."id", app_user."id", 'owner', 'active'
FROM "platform_tenants" tenant CROSS JOIN "users" app_user
WHERE tenant."slug" = 'neurocity' AND app_user."platform_role" = 'administrator'
ON CONFLICT ("tenant_id", "user_id") DO NOTHING;
