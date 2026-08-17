CREATE TABLE "order_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"customer_ref" text NOT NULL,
	"category" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_issues" ADD CONSTRAINT "order_issues_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_issues_order" ON "order_issues" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_issues_status" ON "order_issues" USING btree ("status");