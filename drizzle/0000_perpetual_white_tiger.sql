CREATE TABLE "buyers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"credit_score" integer DEFAULT 70 NOT NULL,
	"late_payment_rate" numeric(5, 4) DEFAULT '0.1000' NOT NULL,
	"total_invoices_financed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(64) NOT NULL,
	"sme_name" text NOT NULL,
	"sme_email" text NOT NULL,
	"buyer_id" integer NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"status" varchar(24) DEFAULT 'uploaded' NOT NULL,
	"risk_score" integer,
	"risk_label" text,
	"risk_factors" jsonb,
	"risk_override_note" text,
	"advance_pct" numeric(5, 4),
	"fee_pct" numeric(5, 4),
	"advance_amount" numeric(12, 2),
	"fee_amount" numeric(12, 2),
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paypal_invoice_id" text,
	"paypal_invoice_url" text,
	"paypal_payout_batch_id" text,
	"paypal_mode" varchar(16) DEFAULT 'simulated' NOT NULL,
	"delivery_proof_note" text,
	"confirmed_at" timestamp with time zone,
	"funded_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "pool_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer,
	"type" varchar(32) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"balance" numeric(14, 2) DEFAULT '50000.00' NOT NULL,
	"total_deployed" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reserve_fund" numeric(14, 2) DEFAULT '0' NOT NULL,
	"platform_revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"platform_costs" numeric(14, 2) DEFAULT '0' NOT NULL,
	"investor_returns" numeric(14, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"status" varchar(24) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_ledger" ADD CONSTRAINT "pool_ledger_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;