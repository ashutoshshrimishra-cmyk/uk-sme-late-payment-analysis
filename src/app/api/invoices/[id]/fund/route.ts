import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPayout } from "@/lib/paypal";
import { applyAdvance } from "@/lib/pool";
import { requireRole } from "@/lib/guard";
import { InvoiceStateConflictError, transitionInvoiceStatus } from "@/lib/invoice-state";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("financer");
  if (!g.ok) return g.res;

  const { id } = await context.params;
  const invoiceId = Number(id);

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "accepted") {
    return NextResponse.json({ error: `Invoice is '${invoice.status}', cannot be funded.` }, { status: 409 });
  }

  let updated;
  try {
    updated = await transitionInvoiceStatus({
      invoiceId,
      expectedStatus: "accepted",
      nextStatus: "funded",
      values: { fundedAt: new Date() },
    });
  } catch (error) {
    if (error instanceof InvoiceStateConflictError) {
      return NextResponse.json({ error: "Invoice is no longer eligible for funding." }, { status: 409 });
    }
    throw error;
  }

  const advanceAmount = Number(invoice.advanceAmount);

  const payout = await createPayout({
    receiverEmail: invoice.smeEmail,
    amount: advanceAmount,
    currency: invoice.currency,
    note: `Advance for invoice ${invoice.invoiceNumber} (${invoice.currency} ${advanceAmount.toFixed(2)})`,
    senderItemId: `advance-${invoice.id}-${Date.now()}`,
  });

  await applyAdvance({
    invoiceId: invoice.id,
    advanceAmount,
    note: `Advance of ${invoice.currency} ${advanceAmount.toFixed(2)} paid to ${invoice.smeName} via PayPal Payouts (${payout.mode})`,
  });

  await db
    .update(invoices)
    .set({ paypalPayoutBatchId: payout.payoutBatchId })
    .where(eq(invoices.id, invoiceId))
    .returning({ id: invoices.id });

  await db.insert(statusEvents).values({
    invoiceId,
    status: "funded",
    note: `Pool advanced ${invoice.currency} ${advanceAmount.toFixed(2)} (${(Number(invoice.advancePct) * 100).toFixed(0)}% of invoice) via PayPal Payouts, ${payout.mode} batch ${payout.payoutBatchId}.`,
  });

  const {
    buyerAcceptanceTokenHash: _buyerAcceptanceTokenHash,
    buyerAcceptanceTokenExpiresAt: _buyerAcceptanceTokenExpiresAt,
    ...safeInvoice
  } = updated;
  return NextResponse.json({ invoice: safeInvoice, payout });
}
