CREATE TABLE `merchant_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchant_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`invited_email` text,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invitation_code_hash` ON `merchant_invitations` (`code_hash`);--> statement-breakpoint
CREATE INDEX `idx_invitation_merchant` ON `merchant_invitations` (`merchant_id`);--> statement-breakpoint
CREATE TABLE `merchant_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchant_id` integer NOT NULL,
	`user_ref` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_merchant_user` ON `merchant_memberships` (`merchant_id`,`user_ref`);--> statement-breakpoint
CREATE INDEX `idx_membership_user` ON `merchant_memberships` (`user_ref`);--> statement-breakpoint
ALTER TABLE `merchants` ADD `contact_name` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD `contact_email` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD `contact_phone` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD `website` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD `pickup_location` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD `delivery_mode` text DEFAULT 'merchant_managed' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchants` ADD `setup_step` integer DEFAULT 1 NOT NULL;