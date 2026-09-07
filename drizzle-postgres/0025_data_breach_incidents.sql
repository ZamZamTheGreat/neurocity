CREATE TABLE "data_breach_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(180) NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"nature" text NOT NULL,
	"likely_consequences" text NOT NULL,
	"measures_taken" text NOT NULL,
	"contact_email" varchar(320) NOT NULL,
	"affected_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" varchar(24) DEFAULT 'under_assessment' NOT NULL,
	"authority_notified_at" timestamp with time zone,
	"authority_reference" varchar(180),
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"notification_attempts" integer DEFAULT 0 NOT NULL,
	"notification_failures" integer DEFAULT 0 NOT NULL,
	"notified_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_data_breach_status" ON "data_breach_incidents" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "idx_data_breach_detected_at" ON "data_breach_incidents" USING btree ("detected_at");
--> statement-breakpoint
CREATE TABLE "data_breach_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "data_breach_notifications" ADD CONSTRAINT "data_breach_notifications_incident_id_data_breach_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."data_breach_incidents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "data_breach_notifications" ADD CONSTRAINT "data_breach_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_data_breach_notification_recipient" ON "data_breach_notifications" USING btree ("incident_id","user_id");
--> statement-breakpoint
CREATE INDEX "idx_data_breach_notification_status" ON "data_breach_notifications" USING btree ("incident_id","status");
