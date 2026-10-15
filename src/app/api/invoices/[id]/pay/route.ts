import { NextResponse } from "next/server";
import { db } from "@/db";
import { buyers, invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordExternalPayment } from "@/lib/paypal";
import { computeRepaymentWaterfall } from "@/lib/pricing";
import { applyRepaymentWaterfall } from "@/lib/pool";
import { daysBetween } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const invoiceId = Number(id);
  const body = await request.json().catch(() => ({}));

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "funded") {
    return NextResponse.json({ error: `Invoice is '${invoice.status}', cannot record a payment.` }, { status: 409 });
  }

  const amountDue = Number(invoice.amount);
  const amountPaid = Number(body.amountPaid ?? amountDue);
  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return NextResponse.json({ error: "amountPaid must be a positive number" }, { status: 400 });
  }
  const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
  const method = (body.method as string) === "PAYPAL" ? "PAYPAL" : "BANK_TRANSFER";

  const paymentResult = await recordExternalPayment({
    paypalInvoiceId: invoice.paypalInvoiceId!,
    currency: invoice.currency,
    amount: amountPaid,
    method,
    paymentDate,
    note: `Payment recorded for invoice ${invoice.invoiceNumber}`,
  });

  const originalDays = Math.max(1, daysBetween(invoice.issueDate, invoice.dueDate));
  const fundedAt = invoice.fundedAt ?? invoice.createdAt;
  const actualDays = Math.max(originalDays, daysBetween(fundedAt, paymentDate));

  const [buyer] = await db.select().from(buyers).where(eq(buyers.id, invoice.buyerId));
  const lossRateAnnual = 0.02; // realised: no loss since buyer paid

  const waterfall = computeRepaymentWaterfall({
    amount: amountDue,
    amountPaid,
    advanceAmount: Number(invoice.advanceAmount),
    feeAmount: Number(invoice.feeAmount),
    originalDays,
    actualDays,
    lossRateAnnual,
  });

  await applyRepaymentWaterfall({
    invoiceId: invoice.id,
    advanceAmount: waterfall.investorPrincipal,
    investorReturn: waterfall.investorReturn,
    expectedLossReserve: waterfall.expectedLossReserve,
    platformCost: waterfall.platformCost,
    platformMargin: waterfall.platformMargin,
    balanceToSme: waterfall.balanceToSme,
  });

  const newAmountPaid = Number(invoice.amountPaid) + amountPaid;
  const fullyPaid = newAmountPaid >= amountDue - 0.005;
  const newStatus = fullyPaid ? "paid" : "partially_paid";

  const [updated] = await db
    .update(invoices)
    .set({
      status: newStatus,
      amountPaid: newAmountPaid.toFixed(2),
      paidAt: fullyPaid ? paymentDate : invoice.paidAt,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  if (buyer) {
    await db
      .update(buyers)
      .set({ totalInvoicesFinanced: buyer.totalInvoicesFinanced + (fullyPaid ? 1 : 0) })
      .where(eq(buyers.id, buyer.id));
  }

  const lateNote =
    waterfall.extraDaysLate > 0
      ? ` Buyer paid ${waterfall.extraDaysLate} day(s) late; platform absorbed an extra £${waterfall.extraAccrual.toFixed(2)} of investor accrual.`
      : " Buyer paid on or before the due date.";

  await db.insert(statusEvents).values({
    invoiceId,
    status: newStatus,
    note: `${method === "BANK_TRANSFER" ? "Bank transfer" : "PayPal"} payment of ${invoice.currency} ${amountPaid.toFixed(2)} recorded on the invoice (${paymentResult.mode}).${lateNote} Waterfall: principal £${waterfall.investorPrincipal.toFixed(2)} + investor return £${waterfall.investorReturn.toFixed(2)} to pool, reserve +£${waterfall.expectedLossReserve.toFixed(2)}, platform margin £${waterfall.platformMargin.toFixed(2)}, balance to SME £${waterfall.balanceToSme.toFixed(2)}.`,
  });

  return NextResponse.json({ invoice: updated, waterfall, payment: paymentResult });
}
