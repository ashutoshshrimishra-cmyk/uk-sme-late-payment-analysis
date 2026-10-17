import { NextResponse } from "next/server";
import { db } from "@/db";
import { buyers, invoices, statusEvents, poolLedger } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/guard";
import { getFundingChance } from "@/lib/risk";

export const dynamic = "force-dynamic";

function hideRiskText(note: string | null): string | null {
  if (!note) return note;
  return note
    .replace(/Ops override: AI risk score.*?(?=Buyer data source:|$)/g, "Human review completed.")
    .replace(/AI risk score \d+\/100 \([^)]+\)(?:: [^.]+)?\./g, "")
    .replace(/AI explanation:[\s\S]*?(?=Document mismatch:|Supplier confirmed|Buyer data source:|$)/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("sme", "financer");
  if (!g.ok) return g.res;

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

  const {
    buyerAcceptanceTokenHash: _buyerAcceptanceTokenHash,
    buyerAcceptanceTokenExpiresAt: _buyerAcceptanceTokenExpiresAt,
    ...safeInvoice
  } = rows[0].invoices;

  const invoice = g.role === "sme"
    ? {
        ...safeInvoice,
        riskScore: null,
        riskLabel: null,
        riskFactors: null,
        riskOverrideNote: null,
        fundingChance: getFundingChance(safeInvoice.riskLabel),
      }
    : safeInvoice;
  const safeEvents = g.role === "sme"
    ? events.map((event) => ({ ...event, note: hideRiskText(event.note) }))
    : events;

  return NextResponse.json({
    invoice,
    buyer: g.role === "sme" ? null : rows[0].buyers,
    events: safeEvents,
    ledger,
  });
}
