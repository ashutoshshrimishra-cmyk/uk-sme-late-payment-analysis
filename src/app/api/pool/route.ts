import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, poolLedger } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getOrCreatePoolState } from "@/lib/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getOrCreatePoolState();
    const ledger = await db
      .select({
        id: poolLedger.id,
        invoiceId: poolLedger.invoiceId,
        type: poolLedger.type,
        amount: poolLedger.amount,
        note: poolLedger.note,
        createdAt: poolLedger.createdAt,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(poolLedger)
      .leftJoin(invoices, eq(poolLedger.invoiceId, invoices.id))
      .orderBy(desc(poolLedger.createdAt))
      .limit(100);

    return NextResponse.json({ state, ledger });
  } catch (error) {
    return NextResponse.json(
      {
        state: null,
        ledger: [],
        error: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 503 },
    );
  }
}
