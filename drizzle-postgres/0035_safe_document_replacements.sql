ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "pending_storage_key" text;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "pending_original_name" text;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "pending_mime_type" varchar(120);
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "pending_size_bytes" integer;
