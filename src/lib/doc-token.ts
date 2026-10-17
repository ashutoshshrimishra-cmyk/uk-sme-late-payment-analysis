import { createHmac, timingSafeEqual } from "node:crypto";

const DOC_TOKEN_TTL_MS = 60 * 60 * 1000;

export type DocTokenPayload = {
  buyerName: string;
  supplierName: string;
  amount: number;
  currency: string;
  dueDate: string;
  fileSha256: string;
  live: boolean;
};

export type VerifiedDocToken = DocTokenPayload & { expiresAt: number };
export type SubmittedDocFields = {
  buyerName: string;
  supplierName: string;
  amount: number;
  dueDate: Date;
};

function tokenSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Document token signing is not configured");
  return secret;
}

export function signDocToken(payload: DocTokenPayload): string {
  const tokenPayload: VerifiedDocToken = {
    ...payload,
    live: payload.live === true,
    expiresAt: Date.now() + DOC_TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  const signature = createHmac("sha256", tokenSecret())
    .update(`doc-token:${encodedPayload}`)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyDocToken(token: string): VerifiedDocToken | null {
  try {
    const [encodedPayload, suppliedSignature, ...extra] = token.split(".");
    if (!encodedPayload || !suppliedSignature || extra.length > 0 || !/^[A-Za-z0-9_-]{43}$/.test(suppliedSignature)) {
      return null;
    }

    const expectedSignature = createHmac("sha256", tokenSecret())
      .update(`doc-token:${encodedPayload}`)
      .digest();
    const actualSignature = Buffer.from(suppliedSignature, "base64url");
    if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
      return null;
    }

    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    const value = payload as Record<string, unknown>;
    if (
      typeof value.buyerName !== "string" ||
      typeof value.supplierName !== "string" ||
      typeof value.amount !== "number" || !Number.isFinite(value.amount) ||
      typeof value.currency !== "string" ||
      typeof value.dueDate !== "string" ||
      typeof value.fileSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(value.fileSha256) ||
      typeof value.live !== "boolean" ||
      typeof value.expiresAt !== "number" || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()
    ) {
      return null;
    }

    return value as VerifiedDocToken;
  } catch {
    return null;
  }
}

function normalizeName(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\blimited\b/g, "ltd")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDocumentMismatches(document: VerifiedDocToken, submitted: SubmittedDocFields): string[] {
  const mismatches: string[] = [];
  if (normalizeName(submitted.buyerName) !== normalizeName(document.buyerName)) mismatches.push("buyer name");
  if (normalizeName(submitted.supplierName) !== normalizeName(document.supplierName)) mismatches.push("supplier name");
  if (Math.abs(submitted.amount - document.amount) > 0.01) mismatches.push("amount");

  const documentDueTime = Date.parse(document.dueDate);
  const documentDueDay = Number.isFinite(documentDueTime)
    ? new Date(documentDueTime).toISOString().slice(0, 10)
    : null;
  if (submitted.dueDate.toISOString().slice(0, 10) !== documentDueDay) mismatches.push("due date");
  return mismatches;
}