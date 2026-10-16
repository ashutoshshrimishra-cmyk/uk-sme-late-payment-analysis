import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { applyDefault } from "@/lib/pool";
import { requireRole } from "@/lib/guard";

export const dynamic = "force-dynamic";

// Demo-only: lets the pitch demo show the default-loss waterfall
// (Slide 5: recourse to SME -> first-loss reserve -> senior investor last).
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

  const advanceAmount = Number(invoice.advanceAmount);
  const result = await applyDefault({ invoiceId: invoice.id, advanceAmount });

  const [updated] = await db
    .update(invoices)
    .set({ status: "defaulted" })
    .where(eq(invoices.id, invoiceId))
    .returning();

  await db.insert(statusEvents).values({
    invoiceId,
    status: "defaulted",
    note: `Default recorded: ${reason}. Recourse to SME first (not recorded as cash); first-loss reserve absorbed £${result.fromReserve.toFixed(2)}; investor pool capital absorbed £${result.fromPool.toFixed(2)}.`,
  });

  return NextResponse.json({ invoice: updated, waterfall: result });
}
