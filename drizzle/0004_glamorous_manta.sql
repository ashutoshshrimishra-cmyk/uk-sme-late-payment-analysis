ALTER TABLE "invoices" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "approved_at" timestamp with time zone;