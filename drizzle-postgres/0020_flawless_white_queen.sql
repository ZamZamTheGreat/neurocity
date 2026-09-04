CREATE INDEX "idx_orders_customer_created" ON "orders" USING btree ("customer_ref","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_merchant_created" ON "orders" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_products_merchant_status" ON "products" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "idx_products_public_catalogue" ON "products" USING btree ("status","availability","item_type");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");