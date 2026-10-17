// Handles PayPal invoicing, external payments, and payouts with sandbox or simulated fallbacks.

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const BUSINESS_EMAIL = process.env.PAYPAL_BUSINESS_EMAIL || "sb-business@business.example.com";

export type PaypalMode = "sandbox" | "simulated";

async function getAccessToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) return null;

  try {
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

function simulatedId(prefix: string): string {
  return `SIM-${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export type CreateInvoiceParams = {
  invoiceNumber: string;
  currency: string;
  amount: number;
  description: string;
  buyerName: string;
  buyerEmail: string;
  dueDate: Date;
};

export type CreateInvoiceResult = {
  mode: PaypalMode;
  paypalInvoiceId: string;
  paypalInvoiceUrl: string | null;
  raw?: unknown;
  error?: string;
};

export async function createAndSendInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
  const token = await getAccessToken();
  if (!token) {
    return {
      mode: "simulated",
      paypalInvoiceId: simulatedId("INV"),
      paypalInvoiceUrl: null,
    };
  }

  try {
    const createRes = await fetch(`${PAYPAL_BASE}/v2/invoicing/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        detail: {
          invoice_number: params.invoiceNumber,
          currency_code: params.currency,
          note: "Financed via invoice-finance pool demo",
          terms_and_conditions: "Due on the agreed payment date.",
        },
        invoicer: { email_address: BUSINESS_EMAIL },
        primary_recipients: [
          {
            billing_info: {
              name: { given_name: params.buyerName },
              email_address: params.buyerEmail,
            },
          },
        ],
        items: [
          {
            name: params.description || "Goods / services supplied",
            quantity: "1",
            unit_amount: { currency_code: params.currency, value: params.amount.toFixed(2) },
          },
        ],
      }),
      cache: "no-store",
    });

    if (!createRes.ok) {
      const errBody = await safeJson(createRes);
      return {
        mode: "simulated",
        paypalInvoiceId: simulatedId("INV"),
        paypalInvoiceUrl: null,
        error: `create_invoice_failed: ${JSON.stringify(errBody).slice(0, 300)}`,
      };
    }

    const invoice = (await createRes.json()) as { id: string };
    const invoiceId = invoice.id;

    const sendRes = await fetch(`${PAYPAL_BASE}/v2/invoicing/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ send_to_invoicer: false, send_to_recipient: true }),
      cache: "no-store",
    });

    if (!sendRes.ok) {
      const errBody = await safeJson(sendRes);
      return {
        mode: "sandbox",
        paypalInvoiceId: invoiceId,
        paypalInvoiceUrl: `${PAYPAL_BASE.replace("api-m.", "www.")}/invoice/details/${invoiceId}`,
        error: `send_invoice_failed: ${JSON.stringify(errBody).slice(0, 300)}`,
      };
    }

    return {
      mode: "sandbox",
      paypalInvoiceId: invoiceId,
      paypalInvoiceUrl: `${PAYPAL_BASE.replace("api-m.", "www.")}/invoice/details/${invoiceId}`,
    };
  } catch (err) {
    return {
      mode: "simulated",
      paypalInvoiceId: simulatedId("INV"),
      paypalInvoiceUrl: null,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}

export type RecordPaymentParams = {
  paypalInvoiceId: string;
  currency: string;
  amount: number;
  method: "BANK_TRANSFER" | "PAYPAL" | "OTHER";
  paymentDate: Date;
  note?: string;
};

export type RecordPaymentResult = {
  mode: PaypalMode;
  transactionId: string;
  raw?: unknown;
  error?: string;
};

export async function recordExternalPayment(params: RecordPaymentParams): Promise<RecordPaymentResult> {
  if (params.paypalInvoiceId.startsWith("SIM-")) {
    return { mode: "simulated", transactionId: simulatedId("TXN") };
  }

  const token = await getAccessToken();
  if (!token) {
    return { mode: "simulated", transactionId: simulatedId("TXN") };
  }

  try {
    const res = await fetch(
      `${PAYPAL_BASE}/v2/invoicing/invoices/${params.paypalInvoiceId}/payments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: {
            type: "EXTERNAL",
            payment_date: params.paymentDate.toISOString().slice(0, 10),
            method: params.method,
            amount: { currency_code: params.currency, value: params.amount.toFixed(2) },
            note: params.note || "Recorded by invoice-finance pool demo",
          },
        }),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const errBody = await safeJson(res);
      return {
        mode: "simulated",
        transactionId: simulatedId("TXN"),
        error: `record_payment_failed: ${JSON.stringify(errBody).slice(0, 300)}`,
      };
    }

    const data = (await safeJson(res)) as { transaction_id?: string } | null;
    return { mode: "sandbox", transactionId: data?.transaction_id ?? simulatedId("TXN") };
  } catch (err) {
    return {
      mode: "simulated",
      transactionId: simulatedId("TXN"),
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}

export type PayoutParams = {
  receiverEmail: string;
  amount: number;
  currency: string;
  note: string;
  senderItemId: string;
};

export type PayoutResult = {
  mode: PaypalMode;
  payoutBatchId: string;
  raw?: unknown;
  error?: string;
};

export async function createPayout(params: PayoutParams): Promise<PayoutResult> {
  const token = await getAccessToken();
  if (!token) {
    return { mode: "simulated", payoutBatchId: simulatedId("PAYOUT") };
  }

  try {
    const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: params.senderItemId,
          email_subject: "Your invoice advance has been sent",
          email_message: params.note,
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: { value: params.amount.toFixed(2), currency: params.currency },
            note: params.note,
            sender_item_id: params.senderItemId,
            receiver: params.receiverEmail,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errBody = await safeJson(res);
      return {
        mode: "simulated",
        payoutBatchId: simulatedId("PAYOUT"),
        error: `payout_failed: ${JSON.stringify(errBody).slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as { batch_header?: { payout_batch_id?: string } };
    return { mode: "sandbox", payoutBatchId: data.batch_header?.payout_batch_id ?? simulatedId("PAYOUT") };
  } catch (err) {
    return {
      mode: "simulated",
      payoutBatchId: simulatedId("PAYOUT"),
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function isPaypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}
