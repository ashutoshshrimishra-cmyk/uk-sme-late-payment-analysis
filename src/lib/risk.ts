// Explainable, heuristic AI risk score.
// This is a PROPOSED / demo scoring model, not trained on real default data
// (see pitch deck, Slide 4: "AI default prediction: Proposed, no real default data").
//
// Score runs 0-100 (higher = lower risk). Every contributing factor is
// returned alongside its point impact so the UI can show a human-readable
// explanation and an ops user can override the result (Slide 5: "human override").

export type RiskFactor = {
  name: string;
  impact: number; // signed points contribution
  detail: string;
};

export const UNCONFIRMED_ADVANCE_RATE = 0.8;
export const CONFIRMED_ADVANCE_RATE = 0.9;

export function getAdvanceRate(buyerConfirmed: boolean): number {
  return buyerConfirmed ? CONFIRMED_ADVANCE_RATE : UNCONFIRMED_ADVANCE_RATE;
}

export type RiskAssessment = {
  score: number;
  label: "Low risk" | "Medium risk" | "High risk" | "Very high risk";
  factors: RiskFactor[];
  advancePct: number;
  feePct: number;
  lossRateAnnual: number;
  decision: "approved" | "declined";
};

export type FundingChance = "High chance" | "Fair chance" | "Low chance" | "Very low chance";

export function getFundingChance(label: string | null | undefined): FundingChance | "Unavailable" {
  switch (label) {
    case "Low risk": return "High chance";
    case "Medium risk": return "Fair chance";
    case "High risk": return "Low chance";
    case "Very high risk": return "Very low chance";
    default: return "Unavailable";
  }
}

export type BuyerProfile = {
  creditScore: number; // 0-100
  latePaymentRate: number; // 0-1
  totalInvoicesFinanced: number;
};

export function assessRisk(params: {
  buyer: BuyerProfile;
  amount: number;
  daysToDue: number;
  buyerConcentrationShare?: number; // 0-1 share of pool already exposed to this buyer
}): RiskAssessment {
  const { buyer, amount, daysToDue, buyerConcentrationShare = 0 } = params;
  const factors: RiskFactor[] = [];
  let score = 50;

  const creditImpact = Math.round((buyer.creditScore - 50) * 0.5);
  score += creditImpact;
  factors.push({
    name: "Buyer credit score",
    impact: creditImpact,
    detail: `Buyer credit score of ${buyer.creditScore}/100`,
  });

  const lateImpact = -Math.round(buyer.latePaymentRate * 100 * 0.45);
  score += lateImpact;
  factors.push({
    name: "Buyer late-payment history",
    impact: lateImpact,
    detail: `${Math.round(buyer.latePaymentRate * 100)}% of this buyer's past invoices were paid late`,
  });

  const historyImpact = Math.min(10, buyer.totalInvoicesFinanced) * 1.2;
  score += historyImpact;
  factors.push({
    name: "Track record on platform",
    impact: Math.round(historyImpact),
    detail: `${buyer.totalInvoicesFinanced} prior invoice(s) from this buyer financed and settled`,
  });

  let sizeImpact = 0;
  if (amount > 50000) sizeImpact = -8;
  else if (amount > 20000) sizeImpact = -4;
  else if (amount < 2000) sizeImpact = -2;
  score += sizeImpact;
  factors.push({
    name: "Invoice size",
    impact: sizeImpact,
    detail: `Invoice value £${amount.toLocaleString("en-GB")}`,
  });

  let termImpact = 0;
  if (daysToDue > 75) termImpact = -6;
  else if (daysToDue > 45) termImpact = -2;
  else if (daysToDue < 15) termImpact = 4;
  score += termImpact;
  factors.push({
    name: "Payment term length",
    impact: termImpact,
    detail: `${daysToDue} days until the invoice is due`,
  });

  const concentrationImpact = buyerConcentrationShare > 0.2 ? -10 : buyerConcentrationShare > 0.1 ? -4 : 0;
  score += concentrationImpact;
  factors.push({
    name: "Buyer concentration in pool",
    impact: concentrationImpact,
    detail: `Buyer already represents ${Math.round(buyerConcentrationShare * 100)}% of deployed pool capital (cap 20%)`,
  });

  score = Math.max(1, Math.min(99, Math.round(score)));

  let label: RiskAssessment["label"];
  let decision: RiskAssessment["decision"] = "approved";

  if (score >= 75) {
    label = "Low risk";
  } else if (score >= 55) {
    label = "Medium risk";
  } else if (score >= 35) {
    label = "High risk";
  } else {
    label = "Very high risk";
    decision = score < 20 ? "declined" : "approved";
  }

  // Loss rate scales inversely with score: ~1% at score 100, ~4% at score near 0.
  const lossRateAnnual = Math.max(0.01, Math.min(0.045, 0.01 + ((100 - score) / 100) * 0.035));

  return {
    score,
    label,
    factors,
    advancePct: UNCONFIRMED_ADVANCE_RATE,
    feePct: 0.005,
    lossRateAnnual,
    decision,
  };
}
