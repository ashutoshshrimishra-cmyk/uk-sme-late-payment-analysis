import { db } from "@/db";
import { poolState } from "@/db/schema";

export async function getOrCreatePoolState() {
  const existing = await db.select().from(poolState).limit(1);
  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(poolState)
    .values({
      balance: "0.00",
      totalDeployed: "0",
      reserveFund: "0",
      platformRevenue: "0",
      platformCosts: "0",
      investorReturns: "0",
    })
    .returning();
  return created;
}
