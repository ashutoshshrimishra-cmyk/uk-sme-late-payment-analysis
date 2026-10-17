ALTER TABLE "invoices" ADD COLUMN "financier_rate_pa" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "financier_interest" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paypal_fee" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "platform_fee" numeric(12, 2);