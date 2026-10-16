ALTER TABLE "invoices" ADD COLUMN "buyer_acceptance_token" text;--> statement-breakpoint
UPDATE "invoices" SET "buyer_acceptance_token" = gen_random_uuid()::text WHERE "buyer_acceptance_token" IS NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyer_acceptance_token_unique" UNIQUE("buyer_acceptance_token");