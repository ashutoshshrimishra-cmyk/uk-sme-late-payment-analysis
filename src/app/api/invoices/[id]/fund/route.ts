import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPayout } from "@/lib/paypal";
import { applyAdvance } from "@/lib/pool";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const invoiceId = Number(id);

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "accepted") {
    return NextResponse.json({ error: `Invoice is '${invoice.status}', cannot be funded.` }, { status: 409 });
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

  const [updated] = await db
    .update(invoices)
    .set({
      status: "funded",
      fundedAt: new Date(),
      paypalPayoutBatchId: payout.payoutBatchId,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  await db.insert(statusEvents).values({
    invoiceId,
    status: "funded",
    note: `Pool advanced ${invoice.currency} ${advanceAmount.toFixed(2)} (${(Number(invoice.advancePct) * 100).toFixed(0)}% of invoice) via PayPal Payouts, ${payout.mode} batch ${payout.payoutBatchId}.`,
  });

  return NextResponse.json({ invoice: updated, payout });
}
