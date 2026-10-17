import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { hashBuyerToken, isBuyerTokenFormat } from "@/lib/buyer-token";
import { InvoiceStateConflictError, transitionInvoiceStatus } from "@/lib/invoice-state";
import { CONFIRMED_ADVANCE_RATE } from "@/lib/risk";
import { calculateInvoiceMoney } from "@/lib/pricing";

type RouteContext = { params: Promise<{ token: string }> };

function invalidLink() {
  return NextResponse.json({ error: "This link is not valid" }, { status: 404 });
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!isBuyerTokenFormat(token)) return invalidLink();

  const [invoice] = await db
    .select({
      amount: invoices.amount,
      currency: invoices.currency,
      smeName: invoices.smeName,
      description: invoices.description,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(and(
      eq(invoices.buyerAcceptanceTokenHash, hashBuyerToken(token)),
      gt(invoices.buyerAcceptanceTokenExpiresAt, new Date()),
      eq(invoices.status, "uploaded"),
    ))
    .limit(1);

  if (!invoice) return invalidLink();
  return NextResponse.json({ invoice });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!isBuyerTokenFormat(token)) return invalidLink();

  const tokenHash = hashBuyerToken(token);
  const now = new Date();
  const [invoice] = await db
    .select({ id: invoices.id, amount: invoices.amount, dueDate: invoices.dueDate })
    .from(invoices)
    .where(and(
      eq(invoices.buyerAcceptanceTokenHash, tokenHash),
      gt(invoices.buyerAcceptanceTokenExpiresAt, now),
      eq(invoices.status, "uploaded"),
    ))
    .limit(1);
  if (!invoice) return invalidLink();

  let body: { deliveryProofNote?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const proof = typeof body.deliveryProofNote === "string" ? body.deliveryProofNote.trim() : "";
  if (!proof || proof.length > 100) {
    return NextResponse.json(
      { error: "Delivery / PO reference is required and must be 100 characters or fewer" },
      { status: 400 },
    );
  }

  const money = calculateInvoiceMoney({
    amount: Number(invoice.amount),
    advancePct: CONFIRMED_ADVANCE_RATE,
    fundingDate: now,
    dueDate: invoice.dueDate,
  });

  let accepted;
  try {
    accepted = await transitionInvoiceStatus({
      invoiceId: invoice.id,
      expectedStatus: "uploaded",
      nextStatus: "accepted",
      values: {
        advancePct: CONFIRMED_ADVANCE_RATE.toFixed(4),
        advanceAmount: money.advanceAmount.toFixed(2),
        confirmedAt: now,
        deliveryProofNote: proof,
        buyerAcceptanceTokenHash: null,
        buyerAcceptanceTokenExpiresAt: null,
      },
      conditions: [
        eq(invoices.buyerAcceptanceTokenHash, tokenHash),
        gt(invoices.buyerAcceptanceTokenExpiresAt, now),
      ],
    });
  } catch (error) {
    if (error instanceof InvoiceStateConflictError) return invalidLink();
    throw error;
  }

  const timelineNote = proof ? `Delivery / PO reference: ${proof}` : "No proof attached";
  await db.insert(statusEvents).values({
    invoiceId: accepted.id,
    status: "accepted",
    note: `Buyer accepted the invoice. ${timelineNote}`,
  });

  return NextResponse.json({ ok: true });
}
