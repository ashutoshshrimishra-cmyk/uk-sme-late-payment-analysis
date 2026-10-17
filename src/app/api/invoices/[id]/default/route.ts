import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/guard";
import { InvoiceStateConflictError, transitionInvoiceStatus } from "@/lib/invoice-state";

export const dynamic = "force-dynamic";

// Records a buyer default for a funded invoice and adds it to the event history.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("financer");
  if (!g.ok) return g.res;

  const { id } = await context.params;
  const invoiceId = Number(id);
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Buyer insolvency";

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "funded") {
    return NextResponse.json({ error: `Invoice is '${invoice.status}', can only default a funded invoice.` }, { status: 409 });
  }

  let updated;
  try {
    updated = await transitionInvoiceStatus({
      invoiceId,
      expectedStatus: "funded",
      nextStatus: "defaulted",
    });
  } catch (error) {
    if (error instanceof InvoiceStateConflictError) {
      return NextResponse.json({ error: "Invoice is no longer eligible for default." }, { status: 409 });
    }
    throw error;
  }

  await db.insert(statusEvents).values({
    invoiceId,
    status: "defaulted",
    note: `Default recorded: ${reason}. Buyer-default loss is borne by the financier without recourse. Fraud or disputed-invoice losses may be recovered from the supplier.`,
  });

  const {
    buyerAcceptanceTokenHash: _buyerAcceptanceTokenHash,
    buyerAcceptanceTokenExpiresAt: _buyerAcceptanceTokenExpiresAt,
    ...safeInvoice
  } = updated;
  return NextResponse.json({ invoice: safeInvoice });
}
