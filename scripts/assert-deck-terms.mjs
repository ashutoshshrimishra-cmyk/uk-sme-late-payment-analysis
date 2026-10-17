import assert from "node:assert/strict";
import { computeDeckTerms } from "../src/lib/pricing.ts";

assert.deepEqual(computeDeckTerms({
  amount: 10_000,
  daysToDue: 90,
  buyerConfirmed: false,
}), {
  advancePct: 0.8,
  financierRatePa: 0.18,
  advanceAmount: 8_000,
  financierInterest: 355.07,
  paypalFee: 290,
  platformFee: 50,
  returnedToSupplier: 1_304.93,
});

assert.deepEqual(computeDeckTerms({
  amount: 10_000,
  daysToDue: 90,
  buyerConfirmed: true,
}), {
  advancePct: 0.9,
  financierRatePa: 0.15,
  advanceAmount: 9_000,
  financierInterest: 332.88,
  paypalFee: 290,
  platformFee: 50,
  returnedToSupplier: 327.12,
});

console.log("Deck pricing terms assertions passed.");
