CREATE TABLE "conversation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_user_id" integer NOT NULL,
	"sender_role" varchar(24) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"product_id" integer,
	"order_id" integer,
	"subject" varchar(240) NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"assigned_membership_id" integer,
	"source" varchar(32) DEFAULT 'neurocity' NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_store_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."store_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_conversations" ADD CONSTRAINT "store_conversations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_conversations" ADD CONSTRAINT "store_conversations_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_conversations" ADD CONSTRAINT "store_conversations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_conversations" ADD CONSTRAINT "store_conversations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_conversations" ADD CONSTRAINT "store_conversations_assigned_membership_id_merchant_memberships_id_fk" FOREIGN KEY ("assigned_membership_id") REFERENCES "public"."merchant_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversation_messages_conversation" ON "conversation_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_store_conversations_merchant_status" ON "store_conversations" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "idx_store_conversations_customer" ON "store_conversations" USING btree ("customer_id");