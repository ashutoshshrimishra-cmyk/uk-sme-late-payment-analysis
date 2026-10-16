import { createHash, randomBytes } from "node:crypto";

export const BUYER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createBuyerToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashBuyerToken(token),
    expiresAt: new Date(Date.now() + BUYER_TOKEN_TTL_MS),
  };
}

export function hashBuyerToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isBuyerTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}
