import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { requireRole } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("financer");
  if (!g.ok) return g.res;

  const { id } = await context.params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const [invoice] = await db
    .select({ id: invoices.id, status: invoices.status })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "uploaded" && invoice.status !== "accepted") {
    return NextResponse.json({ error: "Advance approval is only available before funding" }, { status: 409 });
  }

  const approvedAt = new Date();
  const [approved] = await db
    .update(invoices)
    .set({ approvedBy: "Financier", approvedAt })
    .where(and(
      eq(invoices.id, invoiceId),
      inArray(invoices.status, ["uploaded", "accepted"]),
    ))
    .returning({ id: invoices.id });

  if (!approved) {
    return NextResponse.json({ error: "Invoice status changed; approval was not recorded" }, { status: 409 });
  }

  await db.insert(statusEvents).values({
    invoiceId,
    status: invoice.status,
    note: "Advance approved by Financier.",
  });

  return NextResponse.json({ approvedBy: "Financier", approvedAt });
}
