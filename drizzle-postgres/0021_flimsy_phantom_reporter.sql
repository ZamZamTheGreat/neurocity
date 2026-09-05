CREATE TABLE "core_client_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"application_type" varchar(40) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"allowed_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"redirect_uris" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_legacy_identity_mappings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_application_id" uuid NOT NULL,
	"legacy_source" varchar(160) NOT NULL,
	"legacy_id" varchar(255) NOT NULL,
	"canonical_subject_type" varchar(32) NOT NULL,
	"canonical_subject_id" uuid NOT NULL,
	"link_method" varchar(40) NOT NULL,
	"link_status" varchar(32) DEFAULT 'active' NOT NULL,
	"evidence_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewed_by_actor_id" uuid,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"role_keys" jsonb NOT NULL,
	"client_application_ids" jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"grant_source" varchar(32) DEFAULT 'migration' NOT NULL,
	"granted_by_actor_id" uuid,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legal_name" varchar(240) NOT NULL,
	"trading_name" varchar(240),
	"registration_number" varchar(120),
	"organisation_type" varchar(40) DEFAULT 'other' NOT NULL,
	"jurisdiction" varchar(2) DEFAULT 'NA' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_people" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(240) NOT NULL,
	"locale" varchar(35) DEFAULT 'en-NA' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "core_actor_session_id" uuid;--> statement-breakpoint
ALTER TABLE "core_legacy_identity_mappings" ADD CONSTRAINT "core_legacy_identity_mappings_client_application_id_core_client_applications_id_fk" FOREIGN KEY ("client_application_id") REFERENCES "public"."core_client_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_memberships" ADD CONSTRAINT "core_memberships_person_id_core_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."core_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_memberships" ADD CONSTRAINT "core_memberships_organisation_id_core_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."core_organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_core_client_applications_key" ON "core_client_applications" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_core_legacy_mapping_source_subject" ON "core_legacy_identity_mappings" USING btree ("client_application_id","legacy_source","legacy_id","canonical_subject_type");--> statement-breakpoint
CREATE INDEX "idx_core_legacy_mapping_canonical" ON "core_legacy_identity_mappings" USING btree ("canonical_subject_type","canonical_subject_id");--> statement-breakpoint
CREATE INDEX "idx_core_legacy_mapping_status" ON "core_legacy_identity_mappings" USING btree ("link_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_core_membership_person_org" ON "core_memberships" USING btree ("person_id","organisation_id");--> statement-breakpoint
CREATE INDEX "idx_core_memberships_org_status" ON "core_memberships" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "idx_core_organisations_status" ON "core_organisations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_core_people_status" ON "core_people" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sessions_core_actor_session" ON "sessions" USING btree ("core_actor_session_id");