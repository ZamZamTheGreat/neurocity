CREATE TABLE "data_subject_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"request_type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'submitted' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_notice_version" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_data_subject_requests_user" ON "data_subject_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_data_subject_requests_status" ON "data_subject_requests" USING btree ("status");