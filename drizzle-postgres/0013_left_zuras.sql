ALTER TABLE "merchant_applications" ADD COLUMN "location_type" varchar(32) DEFAULT 'physical_store' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_applications" ADD COLUMN "main_operating_area" varchar(240) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "location_type" varchar(32) DEFAULT 'physical_store' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "main_operating_area" varchar(240);