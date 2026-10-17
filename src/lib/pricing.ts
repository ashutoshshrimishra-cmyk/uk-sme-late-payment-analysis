export const CONCENTRATION_CAP = 0.2; // max 20% of pool per buyer, assumption
export const FINANCIER_INTEREST_APR = 0.18;
export const PAYPAL_PROCESSING_FEE_RATE = 0.029; // TODO: verify against the real UK PayPal rate
export const PLATFORM_FEE_GBP = 50;

export type InvoiceMoneyTerms = {
  amount: number;
  advancePct: number;
  fundingDate: Date | string;
  dueDate: Date | string;
  amountPaid?: number;
  storedAdvanceAmount?: number;
  storedTotalCost?: number;
};

export type InvoiceMoneyBreakdown = {
  daysToDue: number;
  advanceAmount: number;
  interestAmount: number;
  paypalFeeAmount: number;
  platformFeeAmount: number;
  totalCost: number;
  supplierFinalPayment: number;
  supplierSettlementPayment: number;
};

export function calculateInvoiceMoney(terms: InvoiceMoneyTerms): InvoiceMoneyBreakdown {
  const fundingTime = new Date(terms.fundingDate).getTime();
  const dueTime = new Date(terms.dueDate).getTime();
  const daysToDue = Math.max(1, Math.round((dueTime - fundingTime) / 86400000));

  const paypalFeeAmount = round2(terms.amount * PAYPAL_PROCESSING_FEE_RATE);
  const platformFeeAmount = PLATFORM_FEE_GBP;

  // Fixed at due date; extra interest for late payment is not modelled.
  const interestFor = (advance: number) =>
    round2(advance * FINANCIER_INTEREST_APR * daysToDue / 365);
  const costFor = (advance: number) =>
    round2(interestFor(advance) + paypalFeeAmount + platformFeeAmount);

  // The advance is capped so that advance + total cost never exceeds the invoice amount.
  // Without this cap, a high advance % (e.g. 90%) on a small invoice makes the supplier
  // owe money at settlement ("You receive when the buyer pays" goes negative).
  let advanceAmount: number;
  if (terms.storedAdvanceAmount !== undefined && terms.storedAdvanceAmount !== null) {
    advanceAmount = terms.storedAdvanceAmount;
  } else {
    const requestedAdvance = round2(terms.amount * terms.advancePct);
    const interestFactor = (FINANCIER_INTEREST_APR * daysToDue) / 365;
    const maxAdvance = round2(
      Math.floor(
        ((terms.amount - paypalFeeAmount - platformFeeAmount) / (1 + interestFactor)) * 100,
      ) / 100,
    );
    advanceAmount = Math.max(0, Math.min(requestedAdvance, maxAdvance));
    // Safety net for rounding of the interest amount.
    while (advanceAmount > 0 && round2(terms.amount - advanceAmount - costFor(advanceAmount)) < 0) {
      advanceAmount = round2(advanceAmount - 0.01);
    }
  }

  const interestAmount = interestFor(advanceAmount);
  const calculatedTotalCost = round2(interestAmount + paypalFeeAmount + platformFeeAmount);
  const totalCost = terms.storedTotalCost ?? calculatedTotalCost;
  const supplierFinalPayment = round2(terms.amount - advanceAmount - totalCost);
  const supplierSettlementPayment = round2((terms.amountPaid ?? terms.amount) - advanceAmount - totalCost);

  return {
    daysToDue,
    advanceAmount,
    interestAmount,
    paypalFeeAmount,
    platformFeeAmount,
    totalCost,
    supplierFinalPayment,
    supplierSettlementPayment,
  };
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
  advanceAmount: number;
  interestAmount: number;
  paypalFeeAmount: number;
  platformFeeAmount: number;
  supplierSettlementPayment: number;
}): WaterfallResult {
  const balanceToSme = Math.max(0, params.supplierSettlementPayment);
  const shortfall = params.supplierSettlementPayment < 0
    ? round2(Math.abs(params.supplierSettlementPayment))
    : 0;

  return {
    investorPrincipal: params.advanceAmount,
    investorReturn: params.interestAmount,
    expectedLossReserve: 0,
    platformCost: params.paypalFeeAmount,
    platformMargin: params.platformFeeAmount,
    balanceToSme,
    shortfall,
    extraDaysLate: 0,
    extraAccrual: 0,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}