import { db } from "@/db";
import { poolLedger, poolState } from "@/db/schema";
import { eq } from "drizzle-orm";
import { round2 } from "./pricing";

export async function getOrCreatePoolState() {
  const existing = await db.select().from(poolState).limit(1);
  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(poolState)
    .values({
      balance: "50000.00",
      totalDeployed: "0",
      reserveFund: "0",
      platformRevenue: "0",
      platformCosts: "0",
      investorReturns: "0",
    })
    .returning();
  return created;
}

export async function recordLedgerEntry(params: {
  invoiceId: number | null;
  type: string;
  amount: number;
  note?: string;
}) {
  await db.insert(poolLedger).values({
    invoiceId: params.invoiceId,
    type: params.type,
    amount: params.amount.toFixed(2),
    note: params.note,
  });
}

export async function applyAdvance(params: { invoiceId: number; advanceAmount: number; note: string }) {
  const state = await getOrCreatePoolState();
  const newBalance = round2(Number(state.balance) - params.advanceAmount);
  const newDeployed = round2(Number(state.totalDeployed) + params.advanceAmount);

  await db
    .update(poolState)
    .set({ balance: newBalance.toFixed(2), totalDeployed: newDeployed.toFixed(2), updatedAt: new Date() })
    .where(eq(poolState.id, state.id));

  await recordLedgerEntry({
    invoiceId: params.invoiceId,
    type: "advance",
    amount: -params.advanceAmount,
    note: params.note,
  });
}

export async function applyRepaymentWaterfall(params: {
  invoiceId: number;
  advanceAmount: number;
  investorReturn: number;
  expectedLossReserve: number;
  platformCost: number;
  platformMargin: number;
  balanceToSme: number;
}) {
  const state = await getOrCreatePoolState();

  const newBalance = round2(
    Number(state.balance) + params.advanceAmount + params.investorReturn - params.balanceToSme,
  );
  const newDeployed = round2(Number(state.totalDeployed) - params.advanceAmount);
  const newReserve = round2(Number(state.reserveFund) + params.expectedLossReserve);
  const newRevenue = round2(Number(state.platformRevenue) + params.platformMargin);
  const newCosts = round2(Number(state.platformCosts) + params.platformCost);
  const newInvestorReturns = round2(Number(state.investorReturns) + params.investorReturn);

  await db
    .update(poolState)
    .set({
      balance: newBalance.toFixed(2),
      totalDeployed: newDeployed.toFixed(2),
      reserveFund: newReserve.toFixed(2),
      platformRevenue: newRevenue.toFixed(2),
      platformCosts: newCosts.toFixed(2),
      investorReturns: newInvestorReturns.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(poolState.id, state.id));

  await recordLedgerEntry({
    invoiceId: params.invoiceId,
    type: "investor_principal_returned",
    amount: params.advanceAmount,
    note: "Principal returned to pool",
  });
  await recordLedgerEntry({
    invoiceId: params.invoiceId,
    type: "investor_return",
    amount: params.investorReturn,
    note: "Investor yield accrued and reinvested",
  });
  await recordLedgerEntry({
    invoiceId: params.invoiceId,
    type: "loss_reserve",
    amount: params.expectedLossReserve,
    note: "Expected-loss reserve top-up",
  });
  await recordLedgerEntry({
    invoiceId: params.invoiceId,
    type: "platform_cost",
    amount: -params.platformCost,
    note: "PayPal fee",
  });
  await recordLedgerEntry({
    invoiceId: params.invoiceId,
    type: "platform_margin",
    amount: params.platformMargin,
    note: "Platform margin",
  });
  await recordLedgerEntry({
    invoiceId: params.invoiceId,
    type: "sme_balance_payout",
    amount: -params.balanceToSme,
    note: "Remaining balance released to SME",
  });
}

export async function applyDefault(params: { invoiceId: number; advanceAmount: number }) {
  const state = await getOrCreatePoolState();
  const fromReserve = Math.min(Number(state.reserveFund), params.advanceAmount);
  const fromPool = round2(params.advanceAmount - fromReserve);

  const newReserve = round2(Number(state.reserveFund) - fromReserve);
  const newDeployed = round2(Number(state.totalDeployed) - params.advanceAmount);
  const newBalance = round2(Number(state.balance) - fromPool);

  await db
    .update(poolState)
    .set({
      reserveFund: newReserve.toFixed(2),
      totalDeployed: newDeployed.toFixed(2),
      balance: newBalance.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(poolState.id, state.id));

  if (fromReserve > 0) {
    await recordLedgerEntry({
      invoiceId: params.invoiceId,
      type: "default_reserve_drawdown",
      amount: -fromReserve,
      note: "First-loss reserve absorbs default",
    });
  }
  if (fromPool > 0) {
    await recordLedgerEntry({
      invoiceId: params.invoiceId,
      type: "default_pool_loss",
      amount: -fromPool,
      note: "Loss absorbed by investor pool capital (reserve exhausted)",
    });
  }

  return { fromReserve: round2(fromReserve), fromPool };
}
