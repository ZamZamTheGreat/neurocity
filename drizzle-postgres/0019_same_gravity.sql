ALTER TABLE "merchant_payment_allocations" ALTER COLUMN "settlement_status" SET DEFAULT 'pending_payment';--> statement-breakpoint
ALTER TABLE "merchant_payment_allocations" ADD COLUMN "settlement_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchant_payment_allocations" ADD COLUMN "settlement_reference" varchar(160);--> statement-breakpoint
ALTER TABLE "merchant_payment_allocations" ADD COLUMN "settled_by" text;--> statement-breakpoint
CREATE INDEX "idx_merchant_payment_allocations_due" ON "merchant_payment_allocations" USING btree ("settlement_status","settlement_due_at");