import { and, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";

export const INVOICE_STATUSES = [
  "uploaded",
  "accepted",
  "funded",
  "partially_paid",
  "paid",
  "defaulted",
  "rejected",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
type TransitionValues = Partial<Pick<
  typeof invoices.$inferInsert,
  | "advancePct"
  | "advanceAmount"
  | "financierRatePa"
  | "financierInterest"
  | "paypalFee"
  | "platformFee"
  | "feeAmount"
  | "amountPaid"
  | "paidAt"
  | "fundedAt"
  | "paypalPayoutBatchId"
  | "deliveryProofNote"
  | "confirmedAt"
  | "buyerAcceptanceTokenHash"
  | "buyerAcceptanceTokenExpiresAt"
>>;

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  uploaded: ["accepted", "funded", "rejected"],
  accepted: ["funded", "rejected"],
  funded: ["partially_paid", "paid", "defaulted"],
  partially_paid: ["partially_paid", "paid"],
  paid: [],
  defaulted: [],
  rejected: [],
};

export class InvoiceStateConflictError extends Error {
  constructor() {
    super("Invoice status changed or no longer permits this operation");
    this.name = "InvoiceStateConflictError";
  }
}

export async function transitionInvoiceStatus({
  invoiceId,
  expectedStatus,
  nextStatus,
  values,
  conditions = [],
}: {
  invoiceId: number;
  expectedStatus: InvoiceStatus;
  nextStatus: InvoiceStatus;
  values?: TransitionValues;
  conditions?: SQL[];
}) {
  if (!ALLOWED_TRANSITIONS[expectedStatus].includes(nextStatus)) {
    throw new Error(`Invalid invoice status transition: ${expectedStatus} -> ${nextStatus}`);
  }

  const [updated] = await db
    .update(invoices)
    .set({ ...values, status: nextStatus })
    .where(and(
      eq(invoices.id, invoiceId),
      eq(invoices.status, expectedStatus),
      ...conditions,
    ))
    .returning();

  if (!updated) throw new InvoiceStateConflictError();
  return updated;
}
