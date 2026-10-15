import { NextResponse } from "next/server";
import { db } from "@/db";
import { buyers, invoices, statusEvents, poolLedger } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(invoices)
    .leftJoin(buyers, eq(invoices.buyerId, buyers.id))
    .where(eq(invoices.id, invoiceId));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const events = await db
    .select()
    .from(statusEvents)
    .where(eq(statusEvents.invoiceId, invoiceId))
    .orderBy(asc(statusEvents.createdAt));

  const ledger = await db
    .select()
    .from(poolLedger)
    .where(eq(poolLedger.invoiceId, invoiceId))
    .orderBy(asc(poolLedger.createdAt));

  return NextResponse.json({
    invoice: rows[0].invoices,
    buyer: rows[0].buyers,
    events,
    ledger,
  });
}
