import { NextResponse } from "next/server";
import { db } from "@/db";
import { buyers, invoices, statusEvents, poolState } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { assessRisk } from "@/lib/risk";
import { previewPricing } from "@/lib/pricing";
import { createAndSendInvoice } from "@/lib/paypal";
import { getOrCreatePoolState } from "@/lib/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      smeName: invoices.smeName,
      smeEmail: invoices.smeEmail,
      amount: invoices.amount,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      status: invoices.status,
      riskScore: invoices.riskScore,
      riskLabel: invoices.riskLabel,
      advancePct: invoices.advancePct,
      feePct: invoices.feePct,
      advanceAmount: invoices.advanceAmount,
      feeAmount: invoices.feeAmount,
      amountPaid: invoices.amountPaid,
      paypalMode: invoices.paypalMode,
      createdAt: invoices.createdAt,
      buyerName: buyers.name,
      buyerCompany: buyers.company,
    })
    .from(invoices)
    .leftJoin(buyers, eq(invoices.buyerId, buyers.id))
    .orderBy(desc(invoices.createdAt));

  return NextResponse.json({ invoices: rows });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { smeName, smeEmail, buyerName, buyerEmail, amount, dueDate, description } = body as Record<
    string,
    string | number
  >;

  if (!smeName || !smeEmail || !buyerName || !buyerEmail || !amount || !dueDate) {
    return NextResponse.json(
      { error: "smeName, smeEmail, buyerName, buyerEmail, amount and dueDate are required" },
      { status: 400 },
    );
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return NextResponse.json({ error: "dueDate is invalid" }, { status: 400 });
  }

  // Find or create the buyer.
  let buyer = (await db.select().from(buyers).where(eq(buyers.email, String(buyerEmail))))[0];
  if (!buyer) {
    [buyer] = await db
      .insert(buyers)
      .values({
        name: String(buyerName),
        email: String(buyerEmail),
        creditScore: 55 + Math.floor(Math.random() * 35),
        latePaymentRate: (0.05 + Math.random() * 0.3).toFixed(4),
        totalInvoicesFinanced: 0,
      })
      .returning();
  }

  const pool = await getOrCreatePoolState();
  const buyerExposure = await db
    .select({ advanceAmount: invoices.advanceAmount })
    .from(invoices)
    .where(eq(invoices.buyerId, buyer.id));
  const deployedToBuyer = buyerExposure.reduce((sum, r) => sum + (r.advanceAmount ? Number(r.advanceAmount) : 0), 0);
  const totalDeployed = Number(pool.totalDeployed) || 1;
  const concentration = totalDeployed > 0 ? deployedToBuyer / Math.max(totalDeployed, deployedToBuyer || 1) : 0;

  const daysToDue = Math.max(1, Math.round((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const risk = assessRisk({
    buyer: {
      creditScore: buyer.creditScore,
      latePaymentRate: Number(buyer.latePaymentRate),
      totalInvoicesFinanced: buyer.totalInvoicesFinanced,
    },
    amount: amountNum,
    daysToDue,
    buyerConcentrationShare: concentration,
  });

  const pricing = previewPricing({
    amount: amountNum,
    advancePct: risk.advancePct,
    feePct: risk.feePct,
    lossRateAnnual: risk.lossRateAnnual,
    daysToDue,
  });

  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;

  const paypalResult = await createAndSendInvoice({
    invoiceNumber,
    currency: "GBP",
    amount: amountNum,
    description: String(description || "Goods / services supplied"),
    buyerName: String(buyerName),
    buyerEmail: String(buyerEmail),
    dueDate: due,
  });

  const status = risk.decision === "declined" ? "declined" : "uploaded";

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      smeName: String(smeName),
      smeEmail: String(smeEmail),
      buyerId: buyer.id,
      description: String(description || ""),
      amount: amountNum.toFixed(2),
      currency: "GBP",
      dueDate: due,
      status,
      riskScore: risk.score,
      riskLabel: risk.label,
      riskFactors: risk.factors,
      advancePct: risk.advancePct.toFixed(4),
      feePct: risk.feePct.toFixed(4),
      advanceAmount: pricing.advanceAmount.toFixed(2),
      feeAmount: pricing.feeAmount.toFixed(2),
      paypalInvoiceId: paypalResult.paypalInvoiceId,
      paypalInvoiceUrl: paypalResult.paypalInvoiceUrl,
      paypalMode: paypalResult.mode,
    })
    .returning();

  await db.insert(statusEvents).values({
    invoiceId: invoice.id,
    status,
    note:
      status === "declined"
        ? `AI risk score ${risk.score}/100 (${risk.label}) — below minimum threshold, funding declined.`
        : `Invoice created and sent via PayPal Invoicing (${paypalResult.mode}). AI risk score ${risk.score}/100 (${risk.label}).`,
  });

  return NextResponse.json({ invoice, risk, pricing, paypal: paypalResult }, { status: 201 });
}
