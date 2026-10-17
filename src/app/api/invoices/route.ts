import { NextResponse } from "next/server";
import { db } from "@/db";
import { buyers, invoices, statusEvents } from "@/db/schema";
import { and, desc, eq, gte, lt, notInArray, sql } from "drizzle-orm";
import { assessRisk } from "@/lib/risk";
import { calculateInvoiceMoney } from "@/lib/pricing";
import { createAndSendInvoice } from "@/lib/paypal";
import { getOrCreatePoolState } from "@/lib/pool";
import { askGemini, assessBuyerRisk } from "@/lib/gemini";
import {
  calculateBuyerCreditScore,
  lookupBuyer,
  SIMULATED_BUYER_LATE_PAYMENT_RATE,
} from "@/lib/companies-house";
import { requireRole } from "@/lib/guard";
import { createBuyerToken } from "@/lib/buyer-token";
import { getDocumentMismatches, verifyDocToken } from "@/lib/doc-token";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireRole("sme", "financer");
  if (!g.ok) return g.res;

  try {
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
        fundedAt: invoices.fundedAt,
        createdAt: invoices.createdAt,
        buyerName: buyers.name,
        buyerCompany: buyers.company,
      })
      .from(invoices)
      .leftJoin(buyers, eq(invoices.buyerId, buyers.id))
      .orderBy(desc(invoices.createdAt));

    return NextResponse.json({ invoices: rows });
  } catch (error) {
    return NextResponse.json(
      {
        invoices: [],
        error: error instanceof Error ? error.message : "Database unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const g = await requireRole("sme");
  if (!g.ok) return g.res;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.supplierWarranty !== true) {
    return NextResponse.json({ error: "Please confirm the invoice is genuine and undisputed" }, { status: 400 });
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

  const document = verifyDocToken(typeof body.docToken === "string" ? body.docToken : "");
  if (!document) {
    return NextResponse.json({ error: "Upload and verify an invoice document before creating the invoice." }, { status: 400 });
  }
  if (document.live) {
    const mismatches = getDocumentMismatches(document, {
      buyerName: String(buyerName),
      supplierName: String(smeName),
      amount: amountNum,
      dueDate: due,
    });
    if (mismatches.length > 0) {
      return NextResponse.json({ error: `Invoice ${mismatches.join(", ")} does not match the uploaded document.` }, { status: 400 });
    }
  }

  const dueDayStart = new Date(due);
  dueDayStart.setUTCHours(0, 0, 0, 0);
  const dueDayEnd = new Date(dueDayStart.getTime() + 24 * 60 * 60 * 1000);
  const [duplicate] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .innerJoin(buyers, eq(invoices.buyerId, buyers.id))
    .where(and(
      sql`lower(${buyers.email}) = lower(${String(buyerEmail).trim()})`,
      eq(invoices.amount, amountNum.toFixed(2)),
      gte(invoices.dueDate, dueDayStart),
      lt(invoices.dueDate, dueDayEnd),
      notInArray(invoices.status, ["rejected", "defaulted"]),
    ))
    .limit(1);

  if (duplicate) {
    return NextResponse.json(
      { error: `This looks like a duplicate of ${duplicate.invoiceNumber}. If it is a different invoice, change the amount or due date.` },
      { status: 409 },
    );
  }

  // Find or create the buyer.
  const formCompanyNumber = typeof body.buyerCompanyNumber === "string" ? body.buyerCompanyNumber.trim() : "";
  const demoCompanyNumber = process.env.DEMO_BUYER_COMPANY_NUMBER?.trim() ?? "";
  let buyerData;
  const buyerNameForLookup = document.live ? document.buyerName : String(buyerName);
  if (!formCompanyNumber && demoCompanyNumber) {
    buyerData = await lookupBuyer({ name: buyerNameForLookup, companyNumber: demoCompanyNumber });
  } else {
    buyerData = await lookupBuyer({
      name: buyerNameForLookup,
      companyNumber: formCompanyNumber || undefined,
    });
  }
  const ruleScore = calculateBuyerCreditScore(buyerData);
  const latePaymentRate = SIMULATED_BUYER_LATE_PAYMENT_RATE.toFixed(4);
  const buyerRisk = await assessBuyerRisk({
    company: buyerData,
    ruleScore,
    latePaymentRate: { value: SIMULATED_BUYER_LATE_PAYMENT_RATE, simulated: true },
    invoice: {
      amount: amountNum,
      currency: "GBP",
      issueDate: new Date().toISOString(),
      dueDate: due.toISOString(),
      supplierName: String(smeName),
      buyerName: String(buyerName),
      description: String(description || "").slice(0, 300),
    },
  });
  const finalCreditScore = Math.max(0, Math.min(100, ruleScore + buyerRisk.adjustment));

  let buyer = (await db.select().from(buyers).where(eq(buyers.email, String(buyerEmail))))[0];
  if (!buyer) {
    [buyer] = await db
      .insert(buyers)
      .values({
        name: String(buyerName),
        email: String(buyerEmail),
        creditScore: finalCreditScore,
        latePaymentRate,
        totalInvoicesFinanced: 0,
      })
      .returning();
  } else {
    [buyer] = await db
      .update(buyers)
      .set({ name: String(buyerName), creditScore: finalCreditScore, latePaymentRate })
      .where(eq(buyers.id, buyer.id))
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

  const estimatedMoney = calculateInvoiceMoney({
    amount: amountNum,
    advancePct: risk.advancePct,
    fundingDate: new Date(),
    dueDate: due,
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

  const buyerDataLabel = buyerData.source === "companies_house" && buyerData.found
    ? "Buyer data: Companies House"
    : "Buyer data: simulated (no match found)";
  const buyerFacts = buyerData.signals.length > 0
    ? buyerData.signals.join("; ")
    : "No public filing signals were available";
  const documentVerificationNote = document.live ? "" : "Invoice document was not machine-verified.";
  const numberRejectedSentence = buyerData.numberRejected
    ? "Company number provided did not match the buyer named on the invoice and was ignored."
    : "";
  const aiNote = await askGemini(
    `Explain only these four things to a small business owner in plain English, with no markdown: (a) what the SME receives now, (b) what the SME receives when the buyer pays, (c) the total cost, and (d) one short sentence about these buyer facts: ${buyerFacts}. ` +
      `The SME receives GBP ${estimatedMoney.advanceAmount.toFixed(2)} now, GBP ${estimatedMoney.supplierFinalPayment.toFixed(2)} when the buyer pays, and the total cost is GBP ${estimatedMoney.totalCost.toFixed(2)}. ` +
      `Do not say buyer risk or late payments changed the advance rate or price. End exactly with: ${buyerDataLabel}`,
  );
  const adjustmentLabel = buyerRisk.adjustment >= 0 ? `+${buyerRisk.adjustment}` : String(buyerRisk.adjustment);
  const buyerScoreExplanation = `Rule score ${ruleScore}, AI adjustment ${adjustmentLabel} = ${finalCreditScore}. ${buyerRisk.reason} (simulated demo score, not a credit rating).`;
  const explanationWithoutSource = (aiNote ??
    `The SME receives GBP ${estimatedMoney.advanceAmount.toFixed(2)} now and GBP ${estimatedMoney.supplierFinalPayment.toFixed(2)} when the buyer pays; total cost is GBP ${estimatedMoney.totalCost.toFixed(2)}. Buyer facts: ${buyerFacts}.`)
    .replace(/\s*Buyer data: (?:Companies House|simulated \(no match found\))\.?\s*$/, "");
  const explanation = [explanationWithoutSource, numberRejectedSentence, documentVerificationNote, buyerScoreExplanation, buyerDataLabel]
    .filter(Boolean)
    .join(" ");

  const status = risk.decision === "declined" ? "rejected" : "uploaded";
  const buyerToken = status === "uploaded" ? createBuyerToken() : null;

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      buyerAcceptanceTokenHash: buyerToken?.tokenHash ?? null,
      buyerAcceptanceTokenExpiresAt: buyerToken?.expiresAt ?? null,
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
      advanceAmount: estimatedMoney.advanceAmount.toFixed(2),
      feeAmount: null,
      paypalInvoiceId: paypalResult.paypalInvoiceId,
      paypalInvoiceUrl: paypalResult.paypalInvoiceUrl,
      paypalMode: paypalResult.mode,
    })
    .returning();

  await db.insert(statusEvents).values({
    invoiceId: invoice.id,
    status,
    note:
      (status === "rejected"
        ? `AI risk score ${risk.score}/100 (${risk.label}): below minimum threshold, funding declined.`
        : `Invoice created and sent via PayPal Invoicing (${paypalResult.mode}). AI risk score ${risk.score}/100 (${risk.label}).`) +
      ` AI explanation: ${explanation}` +
      (body.documentCheck?.mismatch === true && typeof body.documentCheck.details === "string"
        ? ` Document mismatch: ${body.documentCheck.details}`
        : "") +
      " Supplier confirmed the invoice is genuine and undisputed." +
      (buyerData.source === "companies_house" && buyerData.found
        ? ` Buyer data source: Companies House (${buyerData.companyNumber ?? "number unavailable"}).`
        : " Buyer data source: simulated."),
  });

  const {
    buyerAcceptanceTokenHash: _buyerAcceptanceTokenHash,
    buyerAcceptanceTokenExpiresAt: _buyerAcceptanceTokenExpiresAt,
    ...safeInvoice
  } = invoice;
  return NextResponse.json({
    invoice: safeInvoice,
    buyerToken: buyerToken?.token ?? null,
    risk,
    pricing: estimatedMoney,
    paypal: paypalResult,
  }, { status: 201 });
}