import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireRole } from "@/lib/guard";
import { createBuyerToken } from "@/lib/buyer-token";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("sme");
  if (!g.ok) return g.res;

  const { id } = await context.params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const token = createBuyerToken();
  const [updated] = await db
    .update(invoices)
    .set({
      buyerAcceptanceTokenHash: token.tokenHash,
      buyerAcceptanceTokenExpiresAt: token.expiresAt,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "uploaded")))
    .returning({ id: invoices.id });

  if (!updated) {
    return NextResponse.json({ error: "Only uploaded invoices can have a new buyer link" }, { status: 409 });
  }

  return NextResponse.json({ token: token.token, expiresAt: token.expiresAt.toISOString() });
}
