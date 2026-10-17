export type BuyerCompanyLookup = {
  source: "companies_house" | "simulated";
  found: boolean;
  companyName: string | null;
  companyNumber: string | null;
  status: string | null;
  ageYears: number | null;
  signals: string[];
};

type CompanyRecord = Record<string, unknown>;

const API_BASE = "https://api.company-information.service.gov.uk";

export const BUYER_CREDIT_SCORE_BASE = 60;
export const BUYER_CREDIT_AGE_5_YEARS_BONUS = 10;
export const BUYER_CREDIT_AGE_10_YEARS_BONUS = 5;
export const BUYER_CREDIT_ACCOUNTS_OVERDUE_PENALTY = 20;
export const BUYER_CREDIT_CONFIRMATION_OVERDUE_PENALTY = 10;
export const BUYER_CREDIT_INSOLVENCY_PENALTY = 30;
export const BUYER_CREDIT_NON_ACTIVE_PENALTY = 40;
export const SIMULATED_BUYER_CREDIT_SCORE = 50;
export const SIMULATED_BUYER_LATE_PAYMENT_RATE = 0.2; // simulated bureau data - no payment-history source in the prototype

const ACCOUNTS_OVERDUE_SIGNAL = "Accounts are overdue";
const CONFIRMATION_OVERDUE_SIGNAL = "Confirmation statement is overdue";
const INSOLVENCY_SIGNAL = "Insolvency history is recorded";

function record(value: unknown): CompanyRecord {
  return value && typeof value === "object" ? value as CompanyRecord : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isTrue(value: unknown): boolean {
  return value === true;
}

function calculateAgeYears(dateOfCreation: unknown): number | null {
  const creationDate = text(dateOfCreation);
  if (!creationDate) return null;
  const parsed = new Date(`${creationDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  let years = today.getUTCFullYear() - parsed.getUTCFullYear();
  if (
    today.getUTCMonth() < parsed.getUTCMonth() ||
    (today.getUTCMonth() === parsed.getUTCMonth() && today.getUTCDate() < parsed.getUTCDate())
  ) {
    years -= 1;
  }
  return Math.max(0, years);
}

function simulatedResult(): BuyerCompanyLookup {
  return {
    source: "simulated",
    found: false,
    companyName: null,
    companyNumber: null,
    status: null,
    ageYears: null,
    signals: [],
  };
}

export async function lookupBuyer(params: { name: string; companyNumber?: string }): Promise<BuyerCompanyLookup> {
  const key = process.env.COMPANIES_HOUSE_API_KEY?.trim();
  if (!key) return simulatedResult();

  try {
    const companyNumber = params.companyNumber?.trim();
    const url = companyNumber
      ? `${API_BASE}/company/${encodeURIComponent(companyNumber)}`
      : `${API_BASE}/search/companies?q=${encodeURIComponent(params.name)}&items_per_page=5`;
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return simulatedResult();

    const responseBody: unknown = await response.json();
    let company: CompanyRecord;
    if (companyNumber) {
      company = record(responseBody);
    } else {
      const items = record(responseBody).items;
      if (!Array.isArray(items)) return simulatedResult();
      const exactMatch = items.find((item) =>
        text(record(item).title)?.toLocaleLowerCase() === params.name.trim().toLocaleLowerCase()
      );
      if (!exactMatch) return simulatedResult();
      company = record(exactMatch);
    }

    const accountsOverdue = isTrue(record(company.accounts).overdue);
    const confirmationOverdue = isTrue(record(company.confirmation_statement).overdue);
    const hasInsolvencyHistory = isTrue(company.has_insolvency_history);
    const status = text(company.company_status);
    const ageYears = calculateAgeYears(company.date_of_creation);
    const signals: string[] = [];

    if (status?.toLocaleLowerCase() === "active") {
      signals.push(ageYears === null ? "Active company" : `Active company, ${ageYears} years old`);
    } else if (status) {
      signals.push(`Company status: ${status}`);
    }
    if (accountsOverdue) signals.push(ACCOUNTS_OVERDUE_SIGNAL);
    if (confirmationOverdue) signals.push(CONFIRMATION_OVERDUE_SIGNAL);
    if (hasInsolvencyHistory) signals.push(INSOLVENCY_SIGNAL);

    return {
      source: "companies_house",
      found: true,
      companyName: text(company.company_name) ?? text(company.title) ?? params.name.trim(),
      companyNumber: text(company.company_number) ?? companyNumber ?? null,
      status,
      ageYears,
      signals,
    };
  } catch {
    return simulatedResult();
  }
}

// Rule-based proxy from public filings, not a bureau credit score.
export function calculateBuyerCreditScore(company: BuyerCompanyLookup): number {
  if (!company.found || company.source === "simulated") return SIMULATED_BUYER_CREDIT_SCORE;

  let score = BUYER_CREDIT_SCORE_BASE;
  if (company.ageYears !== null && company.ageYears >= 5) score += BUYER_CREDIT_AGE_5_YEARS_BONUS;
  if (company.ageYears !== null && company.ageYears >= 10) score += BUYER_CREDIT_AGE_10_YEARS_BONUS;
  if (company.signals.includes(ACCOUNTS_OVERDUE_SIGNAL)) score -= BUYER_CREDIT_ACCOUNTS_OVERDUE_PENALTY;
  if (company.signals.includes(CONFIRMATION_OVERDUE_SIGNAL)) score -= BUYER_CREDIT_CONFIRMATION_OVERDUE_PENALTY;
  if (company.signals.includes(INSOLVENCY_SIGNAL)) score -= BUYER_CREDIT_INSOLVENCY_PENALTY;
  if (company.status?.toLocaleLowerCase() !== "active") score -= BUYER_CREDIT_NON_ACTIVE_PENALTY;

  return Math.max(0, Math.min(100, score));
}