// Pricing and waterfall engine implementing the rule from the pitch deck
// Appendix A1: X >= Y + F + D + M
//   X = SME fee, Y = investor return, F = platform cost, D = expected-loss
//   reserve, M = platform margin.
//
// All rates below are ASSUMPTIONS to be replaced with partner quotes
// (see Appendix A3): investor yield 10% p.a., platform cost £15 flat.

export const INVESTOR_ANNUAL_YIELD = 0.1; // assumption
export const PLATFORM_FIXED_COST = 15.0; // payout 0.75 + credit data 4 + AI/compute 5 + ops 5.25 (rounded)
export const CONCENTRATION_CAP = 0.2; // max 20% of pool per buyer, assumption

export type PricingTerms = {
  amount: number;
  advancePct: number;
  feePct: number;
  lossRateAnnual: number;
  daysToDue: number;
};

export type PricingPreview = {
  advanceAmount: number;
  feeAmount: number;
  balanceToSmeIfOnTime: number;
  investorReturn: number;
  expectedLoss: number;
  cost: number;
  margin: number;
};

export function previewPricing(terms: PricingTerms): PricingPreview {
  const advanceAmount = round2(terms.amount * terms.advancePct);
  const feeAmount = round2(terms.amount * terms.feePct);
  const investorReturn = round2(
    INVESTOR_ANNUAL_YIELD * advanceAmount * (terms.daysToDue / 365),
  );
  const expectedLoss = round2(
    terms.lossRateAnnual * advanceAmount * (terms.daysToDue / 365),
  );
  const cost = PLATFORM_FIXED_COST;
  const margin = round2(feeAmount - investorReturn - expectedLoss - cost);
  const balanceToSmeIfOnTime = round2(terms.amount - advanceAmount - feeAmount);

  return { advanceAmount, feeAmount, balanceToSmeIfOnTime, investorReturn, expectedLoss, cost, margin };
}

export type WaterfallResult = {
  investorPrincipal: number;
  investorReturn: number;
  expectedLossReserve: number;
  platformCost: number;
  platformMargin: number;
  balanceToSme: number;
  shortfall: number; // if amountPaid doesn't cover advance+fee
  extraDaysLate: number;
  extraAccrual: number;
};

export function computeRepaymentWaterfall(params: {
  amount: number;
  amountPaid: number;
  advanceAmount: number;
  feeAmount: number;
  originalDays: number;
  actualDays: number;
  lossRateAnnual: number;
}): WaterfallResult {
  const { amount, amountPaid, advanceAmount, feeAmount, originalDays, actualDays, lossRateAnnual } = params;

  const baseInvestorReturn = round2(
    INVESTOR_ANNUAL_YIELD * advanceAmount * (originalDays / 365),
  );
  const expectedLossReserve = round2(
    lossRateAnnual * advanceAmount * (originalDays / 365),
  );
  const platformCost = PLATFORM_FIXED_COST;
  const baseMargin = round2(feeAmount - baseInvestorReturn - expectedLossReserve - platformCost);

  const extraDaysLate = Math.max(0, actualDays - originalDays);
  const extraAccrual = round2(
    INVESTOR_ANNUAL_YIELD * advanceAmount * (extraDaysLate / 365),
  );

  // Platform absorbs the extra investor accrual caused by late payment
  // (Slide 6: "Buyer 30 days late, platform absorbs extra investor accrual").
  const investorReturn = round2(baseInvestorReturn + extraAccrual);
  const platformMargin = round2(baseMargin - extraAccrual);

  const balanceToSmeRaw = round2(amountPaid - advanceAmount - feeAmount);
  const balanceToSme = Math.max(0, balanceToSmeRaw);
  const shortfall = balanceToSmeRaw < 0 ? round2(Math.abs(balanceToSmeRaw)) : 0;

  return {
    investorPrincipal: advanceAmount,
    investorReturn,
    expectedLossReserve,
    platformCost,
    platformMargin,
    balanceToSme,
    shortfall,
    extraDaysLate,
    extraAccrual,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
