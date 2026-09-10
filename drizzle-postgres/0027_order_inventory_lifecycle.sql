ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "inventory_state" varchar(24) DEFAULT 'reserved' NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_orders_inventory_state" ON "orders" USING btree ("inventory_state");

UPDATE "orders"
SET "inventory_state" = CASE
  WHEN "status" IN ('cancelled', 'rejected') THEN 'released'
  WHEN "status" = 'completed' THEN 'committed'
  ELSE 'reserved'
END;

CREATE TABLE IF NOT EXISTS "order_item_inventory_allocations" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_item_id" integer NOT NULL REFERENCES "order_items"("id") ON DELETE CASCADE,
  "inventory_id" integer NOT NULL REFERENCES "variant_inventory"("id"),
  "quantity" integer NOT NULL,
  "state" varchar(24) DEFAULT 'reserved' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_item_inventory_allocation" ON "order_item_inventory_allocations" USING btree ("order_item_id", "inventory_id");
CREATE INDEX IF NOT EXISTS "idx_order_inventory_allocation_state" ON "order_item_inventory_allocations" USING btree ("state");
