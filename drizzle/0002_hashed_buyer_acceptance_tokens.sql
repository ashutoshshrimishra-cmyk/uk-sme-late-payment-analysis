ALTER TABLE "invoices" ADD COLUMN "buyer_acceptance_token_hash" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "buyer_acceptance_token_expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "invoices" SET "status" = 'rejected' WHERE "status" = 'declined';--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_buyer_acceptance_token_unique";--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "buyer_acceptance_token";--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyer_acceptance_token_hash_unique" UNIQUE("buyer_acceptance_token_hash");
