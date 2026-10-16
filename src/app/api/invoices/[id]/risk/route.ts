import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, statusEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/guard";

export const dynamic = "force-dynamic";

// Human override of the AI risk score - part of the "explainable score,
// human override, decision log" control in Slide 5.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("financer");
  if (!g.ok) return g.res;

  const { id } = await context.params;
  const invoiceId = Number(id);
  const body = await request.json().catch(() => null);

  if (!body || typeof body.score !== "number" || !body.note) {
    return NextResponse.json({ error: "score (number) and note (string) are required" }, { status: 400 });
  }

  const score = Math.max(0, Math.min(100, Math.round(body.score)));

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "uploaded") {
    return NextResponse.json({ error: "Risk score can only be overridden before buyer confirmation." }, { status: 409 });
  }

  const label = score >= 75 ? "Low risk" : score >= 55 ? "Medium risk" : score >= 35 ? "High risk" : "Very high risk";

  const [updated] = await db
    .update(invoices)
    .set({ riskScore: score, riskLabel: label, riskOverrideNote: String(body.note) })
    .where(eq(invoices.id, invoiceId))
    .returning();

  await db.insert(statusEvents).values({
    invoiceId,
    status: invoice.status,
    note: `Ops override: AI risk score changed to ${score}/100 (${label}). Reason: ${body.note}`,
  });

  return NextResponse.json({ invoice: updated });
}
