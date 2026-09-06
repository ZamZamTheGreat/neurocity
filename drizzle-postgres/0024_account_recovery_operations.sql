CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_password_reset_token_hash" ON "password_reset_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "idx_password_reset_user" ON "password_reset_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_password_reset_expiry" ON "password_reset_tokens" USING btree ("expires_at");
--> statement-breakpoint
CREATE TABLE "audit_event_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_event_id" integer NOT NULL,
	"status" varchar(24) DEFAULT 'acknowledged' NOT NULL,
	"note" text,
	"reviewed_by" text NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_event_reviews" ADD CONSTRAINT "audit_event_reviews_audit_event_id_audit_events_id_fk" FOREIGN KEY ("audit_event_id") REFERENCES "public"."audit_events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_audit_event_review_event" ON "audit_event_reviews" USING btree ("audit_event_id");
--> statement-breakpoint
CREATE INDEX "idx_audit_event_review_status" ON "audit_event_reviews" USING btree ("status");
