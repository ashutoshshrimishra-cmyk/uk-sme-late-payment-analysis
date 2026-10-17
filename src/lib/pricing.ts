// Calculates advance terms, financing costs, and supplier settlement amounts.
export const CONFIRMED_FINANCIER_INTEREST_APR = 0.15;
export const FINANCIER_INTEREST_APR = 0.18;
export const PAYPAL_PROCESSING_FEE_RATE = 0.029;
export const PLATFORM_FEE_RATE = 0.005;

export type DeckTerms = {
  advancePct: number;
  financierRatePa: number;
  advanceAmount: number;
  financierInterest: number;
  paypalFee: number;
  platformFee: number;
  returnedToSupplier: number;
};

export function computeDeckTerms(params: {
  amount: number;
  daysToDue: number;
  buyerConfirmed: boolean;
}): DeckTerms {
  const advancePct = params.buyerConfirmed ? 0.9 : 0.8;
  const financierRatePa = params.buyerConfirmed
    ? CONFIRMED_FINANCIER_INTEREST_APR
    : FINANCIER_INTEREST_APR;
  const advanceAmount = round2(params.amount * advancePct);
  const financierInterest = round2(
    advanceAmount * financierRatePa * params.daysToDue / 365,
  );
  const paypalFee = round2(params.amount * PAYPAL_PROCESSING_FEE_RATE);
  const platformFee = round2(params.amount * PLATFORM_FEE_RATE);
  const returnedToSupplier = round2(
    params.amount - paypalFee - advanceAmount - financierInterest - platformFee,
  );

  return {
    advancePct: round2(advancePct),
    financierRatePa: round2(financierRatePa),
    advanceAmount: round2(advanceAmount),
    financierInterest: round2(financierInterest),
    paypalFee: round2(paypalFee),
    platformFee: round2(platformFee),
    returnedToSupplier: round2(returnedToSupplier),
  };
}

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
  const deckTerms = computeDeckTerms({
    amount: terms.amount,
    daysToDue,
    buyerConfirmed: terms.advancePct >= 0.9,
  });
  const advanceAmount = round2(
    terms.storedAdvanceAmount ?? terms.amount * terms.advancePct,
  );
  const interestAmount = round2(
    advanceAmount * deckTerms.financierRatePa * daysToDue / 365,
  );
  const paypalFeeAmount = deckTerms.paypalFee;
  const platformFeeAmount = deckTerms.platformFee;
  const totalCost = round2(interestAmount + paypalFeeAmount + platformFeeAmount);
  const supplierFinalPayment = round2(
    terms.amount - advanceAmount - interestAmount - paypalFeeAmount - platformFeeAmount,
  );
  const supplierSettlementPayment = round2(
    (terms.amountPaid ?? terms.amount) -
      advanceAmount - interestAmount - paypalFeeAmount - platformFeeAmount,
  );

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

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
