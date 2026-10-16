import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  integer,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

export const buyers = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  creditScore: integer("credit_score").notNull().default(70),
  latePaymentRate: numeric("late_payment_rate", { precision: 5, scale: 4 })
    .notNull()
    .default("0.1000"),
  totalInvoicesFinanced: integer("total_invoices_financed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull().unique(),
  buyerAcceptanceTokenHash: text("buyer_acceptance_token_hash").unique(),
  buyerAcceptanceTokenExpiresAt: timestamp("buyer_acceptance_token_expires_at", { withTimezone: true }),
  smeName: text("sme_name").notNull(),
  smeEmail: text("sme_email").notNull(),
  buyerId: integer("buyer_id").notNull().references(() => buyers.id),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  issueDate: timestamp("issue_date", { withTimezone: true }).notNull().defaultNow(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),

  status: varchar("status", { length: 24 }).notNull().default("uploaded"),
  // uploaded -> accepted -> funded -> partially_paid -> paid | defaulted; uploaded/accepted -> rejected

  riskScore: integer("risk_score"),
  riskLabel: text("risk_label"),
  riskFactors: jsonb("risk_factors"),
  riskOverrideNote: text("risk_override_note"),

  advancePct: numeric("advance_pct", { precision: 5, scale: 4 }),
  feePct: numeric("fee_pct", { precision: 5, scale: 4 }),
  advanceAmount: numeric("advance_amount", { precision: 12, scale: 2 }),
  feeAmount: numeric("fee_amount", { precision: 12, scale: 2 }),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),

  paypalInvoiceId: text("paypal_invoice_id"),
  paypalInvoiceUrl: text("paypal_invoice_url"),
  paypalPayoutBatchId: text("paypal_payout_batch_id"),
  paypalMode: varchar("paypal_mode", { length: 16 }).notNull().default("simulated"),

  deliveryProofNote: text("delivery_proof_note"),

  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  fundedAt: timestamp("funded_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const statusEvents = pgTable("status_events", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  status: varchar("status", { length: 24 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const poolLedger = pgTable("pool_ledger", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  type: varchar("type", { length: 32 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const poolState = pgTable("pool_state", {
  id: serial("id").primaryKey(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("50000.00"),
  totalDeployed: numeric("total_deployed", { precision: 14, scale: 2 }).notNull().default("0"),
  reserveFund: numeric("reserve_fund", { precision: 14, scale: 2 }).notNull().default("0"),
  platformRevenue: numeric("platform_revenue", { precision: 14, scale: 2 }).notNull().default("0"),
  platformCosts: numeric("platform_costs", { precision: 14, scale: 2 }).notNull().default("0"),
  investorReturns: numeric("investor_returns", { precision: 14, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
