import { NextResponse } from "next/server";
import { db } from "@/db";
import { buyers, invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordExternalPayment } from "@/lib/paypal";
import { computeDeckTerms, round2 } from "@/lib/pricing";
import { daysBetween } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { InvoiceStateConflictError, transitionInvoiceStatus } from "@/lib/invoice-state";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("financer");
  if (!g.ok) return g.res;

  const { id } = await context.params;
  const invoiceId = Number(id);
  const body = await request.json().catch(() => ({}));

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "funded" && invoice.status !== "partially_paid") {
    return NextResponse.json({ error: `Invoice is '${invoice.status}', cannot record a payment.` }, { status: 409 });
  }

  const amountDue = Number(invoice.amount);
  const amountPaid = Number(body.amountPaid ?? amountDue);
  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return NextResponse.json({ error: "amountPaid must be a positive number" }, { status: 400 });
  }
  const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
  const method = (body.method as string) === "PAYPAL" ? "PAYPAL" : "BANK_TRANSFER";

  const newAmountPaid = Number(invoice.amountPaid) + amountPaid;
  const fullyPaid = newAmountPaid >= amountDue - 0.005;
  let updated;
  try {
    updated = await transitionInvoiceStatus({
      invoiceId,
      expectedStatus: invoice.status,
      nextStatus: fullyPaid ? "paid" : "partially_paid",
      values: {
        amountPaid: newAmountPaid.toFixed(2),
        paidAt: fullyPaid ? paymentDate : invoice.paidAt,
      },
      conditions: [eq(invoices.amountPaid, invoice.amountPaid)],
    });
  } catch (error) {
    if (error instanceof InvoiceStateConflictError) {
      return NextResponse.json({ error: "Invoice payment has already been recorded or its status changed." }, { status: 409 });
    }
    throw error;
  }

  const paymentResult = await recordExternalPayment({
    paypalInvoiceId: invoice.paypalInvoiceId!,
    currency: invoice.currency,
    amount: amountPaid,
    method,
    paymentDate,
    note: `Payment recorded for invoice ${invoice.invoiceNumber}`,
  });

  const fundingDate = invoice.fundedAt ?? invoice.createdAt;
  const daysToDue = Math.max(1, Math.round(
    (invoice.dueDate.getTime() - fundingDate.getTime()) / 86400000,
  ));
  const calculatedTerms = computeDeckTerms({
    amount: amountDue,
    daysToDue,
    buyerConfirmed: invoice.confirmedAt !== null,
  });
  const advanceAmount = round2(Number(invoice.advanceAmount ?? calculatedTerms.advanceAmount));
  const financierInterest = round2(Number(invoice.financierInterest ?? calculatedTerms.financierInterest));
  const paypalFee = round2(Number(invoice.paypalFee ?? calculatedTerms.paypalFee));
  const platformFee = round2(Number(invoice.platformFee ?? calculatedTerms.platformFee));
  const returnedToSupplier = round2(
    amountDue - advanceAmount - financierInterest - paypalFee - platformFee,
  );

  const [buyer] = await db.select().from(buyers).where(eq(buyers.id, invoice.buyerId));

  const waterfall = {
    advanceAmount,
    financierInterest,
    paypalFee,
    platformFee,
    returnedToSupplier,
  };

  const newStatus = updated.status;

  if (buyer) {
    await db
      .update(buyers)
      .set({ totalInvoicesFinanced: buyer.totalInvoicesFinanced + (fullyPaid ? 1 : 0) })
      .where(eq(buyers.id, buyer.id));
  }

  const daysLate = Math.max(0, daysBetween(invoice.dueDate, paymentDate));
  const lateNote = daysLate > 0
    ? ` Buyer paid ${daysLate} day(s) late; no additional late accrual is charged by the platform.`
    : " Buyer paid on or before the due date.";

  await db.insert(statusEvents).values({
    invoiceId,
    status: newStatus,
    note: `${method === "BANK_TRANSFER" ? "Bank transfer" : "PayPal"} payment of ${invoice.currency} ${amountPaid.toFixed(2)} recorded on the invoice (${paymentResult.mode}).${lateNote} Contract terms: financier interest £${financierInterest.toFixed(2)}, PayPal fee £${paypalFee.toFixed(2)}, flat platform fee £${platformFee.toFixed(2)}, supplier return at full settlement £${returnedToSupplier.toFixed(2)}.`,
  });

  const {
    buyerAcceptanceTokenHash: _buyerAcceptanceTokenHash,
    buyerAcceptanceTokenExpiresAt: _buyerAcceptanceTokenExpiresAt,
    ...safeInvoice
  } = updated;
  return NextResponse.json({ invoice: safeInvoice, waterfall, payment: paymentResult });
}
