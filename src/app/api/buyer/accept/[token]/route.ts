import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { buyers, invoices, statusEvents } from "@/db/schema";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const [row] = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      smeName: invoices.smeName,
      description: invoices.description,
      amount: invoices.amount,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      status: invoices.status,
      buyerName: buyers.name,
    })
    .from(invoices)
    .innerJoin(buyers, eq(invoices.buyerId, buyers.id))
    .where(eq(invoices.buyerAcceptanceToken, token))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Acceptance link not found" }, { status: 404 });
  return NextResponse.json({ invoice: row });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  let body: { deliveryProofNote?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const proof = typeof body.deliveryProofNote === "string" ? body.deliveryProofNote.trim() : "";
  const note = proof || "Buyer confirmed the invoice and delivery.";
  const [updated] = await db
    .update(invoices)
    .set({ status: "accepted", confirmedAt: new Date(), deliveryProofNote: note })
    .where(and(eq(invoices.buyerAcceptanceToken, token), eq(invoices.status, "uploaded")))
    .returning({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
    });

  if (!updated) {
    const [existing] = await db
      .select({ status: invoices.status })
      .from(invoices)
      .where(eq(invoices.buyerAcceptanceToken, token))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Acceptance link not found" }, { status: 404 });
    return NextResponse.json({ error: `Invoice is '${existing.status}' and cannot be accepted.` }, { status: 409 });
  }

  await db.insert(statusEvents).values({
    invoiceId: updated.id,
    status: "accepted",
    note: `Buyer confirmed the invoice via its acceptance link. Proof: ${note}`,
  });

  return NextResponse.json({ invoice: updated });
}
