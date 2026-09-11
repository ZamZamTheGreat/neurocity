CREATE TABLE IF NOT EXISTS "order_workflow_notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "notification_key" varchar(160) NOT NULL,
  "checkout_group_id" integer REFERENCES "checkout_groups"("id") ON DELETE CASCADE,
  "order_id" integer REFERENCES "orders"("id") ON DELETE CASCADE,
  "audience" varchar(32) NOT NULL,
  "channel" varchar(24) DEFAULT 'email' NOT NULL,
  "status" varchar(24) DEFAULT 'processing' NOT NULL,
  "attempts" integer DEFAULT 1 NOT NULL,
  "last_error" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_workflow_notifications_key" ON "order_workflow_notifications" ("notification_key");
CREATE INDEX IF NOT EXISTS "idx_order_workflow_notifications_status" ON "order_workflow_notifications" ("status", "updated_at");
CREATE INDEX IF NOT EXISTS "idx_order_workflow_notifications_order" ON "order_workflow_notifications" ("order_id");
