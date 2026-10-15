import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const invoiceId = Number(id);
  const body = await request.json().catch(() => ({}));
  const deliveryProofNote = typeof body.deliveryProofNote === "string" ? body.deliveryProofNote : "";

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "uploaded") {
    return NextResponse.json({ error: `Invoice is '${invoice.status}', cannot be confirmed.` }, { status: 409 });
  }

  const note =
    deliveryProofNote.trim().length > 0
      ? deliveryProofNote.trim()
      : "Delivery / purchase-order proof attached by buyer (simulated).";

  const [updated] = await db
    .update(invoices)
    .set({ status: "accepted", confirmedAt: new Date(), deliveryProofNote: note })
    .where(eq(invoices.id, invoiceId))
    .returning();

  await db.insert(statusEvents).values({
    invoiceId,
    status: "accepted",
    note: `Buyer confirmed the invoice in-app (not a PayPal feature). Proof: ${note}`,
  });

  return NextResponse.json({ invoice: updated });
}
