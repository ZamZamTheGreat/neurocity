CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_ref` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_resource` ON `audit_events` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`sku_snapshot` text NOT NULL,
	`name_snapshot` text NOT NULL,
	`unit_price` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order_id` ON `order_items` (`order_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `badge` text;--> statement-breakpoint
CREATE INDEX `idx_orders_merchant_status` ON `orders` (`merchant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer_ref` ON `orders` (`customer_ref`);