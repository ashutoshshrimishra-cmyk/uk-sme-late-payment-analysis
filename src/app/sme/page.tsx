"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { calculateInvoiceMoney } from "@/lib/pricing";

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  smeName: string;
  buyerName: string | null;
  buyerCompany: string | null;
  amount: string;
  currency: string;
  dueDate: string;
  status: string;
  riskScore: number | null;
  riskLabel: string | null;
  advancePct: string | null;
  feePct: string | null;
  advanceAmount: string | null;
  feeAmount: string | null;
  fundedAt: string | null;
  amountPaid: string;
  paypalMode: string;
  createdAt: string;
};

const EMPTY_FORM = {
  smeName: "",
  smeEmail: "",
  buyerName: "",
  buyerCompanyNumber: "",
  buyerEmail: "",
  amount: "",
  dueDate: "",
  description: "",
  supplierWarranty: false,
};

type ExtractedInvoice = {
  supplierName: string;
  buyerName: string;
  buyerEmail: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  description: string;
  confidence: number;
};

function money(v: string | number, currency = "GBP") {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n || 0);
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const label = {
    uploaded: "Draft",
    accepted: "Pending",
    funded: "Pending",
    partially_paid: "Pending",
    paid: "Paid",
    defaulted: "Defaulted",
    rejected: "Rejected",
  }[normalizedStatus] ?? normalizedStatus.replaceAll("_", " ");
  const tone = normalizedStatus === "paid"
    ? "bg-emerald-100 text-emerald-800"
    : ["accepted", "funded", "partially_paid"].includes(normalizedStatus)
      ? "bg-amber-100 text-amber-800"
      : ["defaulted", "rejected"].includes(normalizedStatus)
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${tone}`}>{label}</span>;
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ error?: string; message?: string } | null>(null);
  const [buyerLink, setBuyerLink] = useState<{ invoiceId: number; token: string } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedDocument, setExtractedDocument] = useState<{
    data: ExtractedInvoice;
    source: "gemini" | "mock";
  } | null>(null);
  const [docToken, setDocToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentMismatchDetails: string[] = [];
  if (extractedDocument) {
    const extracted = extractedDocument.data;
    const typedAmount = Number(form.amount);
    if (!Number.isFinite(typedAmount) || Math.abs(typedAmount - extracted.amount) / extracted.amount > 0.01) {
      documentMismatchDetails.push(`Amount differs from extracted ${extracted.currency} ${extracted.amount.toFixed(2)}.`);
    }
    if (form.buyerName.trim().toLocaleLowerCase() !== extracted.buyerName.trim().toLocaleLowerCase()) {
      documentMismatchDetails.push(`Buyer name differs from extracted “${extracted.buyerName}”.`);
    }
  }

  async function extractFile(file: File) {
    setExtracting(true);
    setLastResult(null);
    setDocToken(null);
    const upload = new FormData();
    upload.append("file", file);
    try {
      const response = await fetch("/api/extract", { method: "POST", body: upload });
      const result: { extracted?: ExtractedInvoice; source?: "gemini" | "mock"; docToken?: string; error?: string } =
        await response.json();
      if (!response.ok || !result.extracted || !result.source || !result.docToken) {
        setLastResult({ error: result.error ?? "Could not extract invoice details." });
        return;
      }

      const extracted = result.extracted;
      setExtractedDocument({ data: extracted, source: result.source });
      setDocToken(result.docToken);
      setForm((current) => ({
        ...current,
        smeName: extracted.supplierName,
        buyerName: extracted.buyerName,
        buyerEmail: extracted.buyerEmail,
        amount: String(extracted.amount),
        dueDate: extracted.dueDate,
        description: extracted.description,
      }));
    } catch {
      setLastResult({ error: "Network error extracting invoice details." });
    } finally {
      setExtracting(false);
    }
  }

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", { cache: "no-store" });
      const text = await res.text();
      let data: { invoices?: InvoiceRow[]; error?: string } = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: "Server returned an invalid response." };
        }
      }

      if (!res.ok) {
        setInvoices([]);
        setLastResult({ error: data.error ?? "Unable to load invoices." });
        return;
      }

      setInvoices(data.invoices ?? []);
    } catch {
      setInvoices([]);
      setLastResult({ error: "Network error while loading invoices." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadInvoices();
    };

    void run();
  }, [loadInvoices]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          docToken,
          ...(documentMismatchDetails.length > 0
            ? { documentCheck: { mismatch: true, details: documentMismatchDetails.join(" ") } }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLastResult({ error: data.error ?? "Something went wrong" });
      } else {
        setLastResult({
          message: `Invoice ${data.invoice.invoiceNumber} created. AI score ${data.risk.score}/100 (${data.risk.label}).`,
        });
        setBuyerLink(data.buyerToken ? { invoiceId: data.invoice.id, token: data.buyerToken } : null);
        setForm({ ...EMPTY_FORM });
        setExtractedDocument(null);
        setDocToken(null);
        await loadInvoices();
      }

    } catch {
      setLastResult({ error: "Network error creating invoice" });
    } finally {
      setSubmitting(false);
    }
  }

  async function regenerateBuyerLink(invoiceId: number) {
    setRegeneratingId(invoiceId);
    setCopyMessage("");
    setLastResult(null);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/buyer-link`, { method: "POST" });
      const data: { token?: string; error?: string } = await response.json();
      if (!response.ok || !data.token) throw new Error(data.error ?? "Could not create a buyer link.");
      setBuyerLink({ invoiceId, token: data.token });
      setLastResult({ message: "A new buyer link was generated. The previous link is no longer valid." });
    } catch (cause) {
      setLastResult({ error: cause instanceof Error ? cause.message : "Could not create a buyer link." });
    } finally {
      setRegeneratingId(null);
    }
  }

  async function copyBuyerLink(token: string) {
    try {
      const url = new URL(`/buyer/accept/${token}`, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopyMessage("Buyer link copied.");
    } catch {
      setCopyMessage("Could not copy the link. Check browser clipboard permissions.");
    }
  }

  return (
    <main className="dashboard-page min-h-screen bg-[#FAF7F0] px-6 py-10 font-body text-slate-600">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A227]">Invoice finance</p>
            <h1 className="font-royal mt-1 text-3xl font-semibold text-[#0B1F3A]">Turn invoices into cash</h1>
            <div className="mt-4 h-px bg-[#C9A227]/40" />
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
          <form onSubmit={onSubmit} className="h-fit rounded-xl border border-[#C9A227]/30 bg-white p-6 shadow-md">
            <h2 className="font-royal text-xl font-semibold text-[#0B1F3A]">New invoice</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void extractFile(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={extracting}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-lg border border-[#C9A227]/50 px-4 py-2 text-sm font-semibold text-[#0B1F3A] disabled:opacity-50"
            >
              {extracting ? "Extracting invoice…" : "Upload invoice (PDF/photo)"}
            </button>
            {extractedDocument && (
              <p role="status" className="mt-2 text-xs font-medium text-emerald-700">
                {extractedDocument.source === "gemini"
                  ? "AI extracted (gemini) - please check"
                  : "Mock data (no API key)"}
              </p>
            )}
            {documentMismatchDetails.length > 0 && (
              <div role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Mismatch with uploaded document</p>
                <ul className="mt-1 list-disc pl-5">
                  {documentMismatchDetails.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Your business name">
                <input required value={form.smeName} onChange={(e) => setForm({ ...form, smeName: e.target.value })} className="input" placeholder="Your business name" />
              </Field>
              <Field label="Your email">
                <input required type="email" value={form.smeEmail} onChange={(e) => setForm({ ...form, smeEmail: e.target.value })} className="input" placeholder="you@company.co.uk" />
              </Field>
              <Field label="Buyer name">
                <input required value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} className="input" placeholder="Buyer name" />
              </Field>
              <Field label="Buyer company number (optional; must match buyer name on invoice)">
                <input value={form.buyerCompanyNumber} onChange={(e) => setForm({ ...form, buyerCompanyNumber: e.target.value })} className="input" placeholder="Company number" />
              </Field>
              <Field label="Buyer email">
                <input required type="email" value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} className="input" placeholder="accounts@buyer.co.uk" />
              </Field>
              <Field label="Invoice amount (£)">
                <input required type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" placeholder="0.00" />
              </Field>
              <Field label="Due date">
                <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} placeholder="Goods / services supplied" />
              </Field>
            </div>

            <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
              <input
                required
                type="checkbox"
                checked={form.supplierWarranty}
                onChange={(e) => setForm({ ...form, supplierWarranty: e.target.checked })}
                className="mt-0.5"
              />
              <span>I confirm this invoice is genuine, the goods or services were delivered, and my customer has not disputed it.</span>
            </label>

            <button
              type="submit"
              disabled={submitting || !form.supplierWarranty}
              className="mt-5 h-11 w-full rounded-lg bg-[#0B1F3A] px-6 text-sm font-semibold text-white hover:bg-[#13315c] disabled:opacity-50"
            >
              {submitting ? "Scoring & sending via PayPal…" : "Create & send invoice"}
            </button>

            {lastResult?.error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{lastResult.error}</p>}
            {lastResult?.message && (
              <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p>{lastResult.message}</p>
                {buyerLink && <button type="button" onClick={() => void copyBuyerLink(buyerLink.token)} className="mt-2 inline-block font-semibold underline">Copy buyer link</button>}
              </div>
            )}
            {copyMessage && <p role="status" className="mt-2 text-xs text-emerald-700">{copyMessage}</p>}
          </form>

          <section className="rounded-xl border border-[#C9A227]/30 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="font-royal text-xl font-semibold text-[#0B1F3A]">Invoices ({invoices.length})</h2>
              <button type="button" onClick={loadInvoices} className="text-xs font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-4">
                Refresh
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#0B1F3A] text-xs uppercase text-white">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Buyer</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Risk</th>
                    <th className="px-4 py-3 font-semibold">You receive now / Total cost</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Buyer link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading invoices…</td>
                    </tr>
                  )}
                  {!loading && invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
                          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-[#C9A227]/15 text-lg font-semibold text-[#C9A227]">+</span>
                          <span>No invoices yet. Your first invoice will appear here.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {invoices.map((inv) => {
                    const moneyBreakdown = calculateInvoiceMoney({
                      amount: Number(inv.amount),
                      advancePct: Number(inv.advancePct ?? 0.8),
                      fundingDate: inv.fundedAt ?? new Date(),
                      dueDate: inv.dueDate,
                      ...(inv.fundedAt
                        ? {
                            storedAdvanceAmount: Number(inv.advanceAmount),
                            storedTotalCost: Number(inv.feeAmount ?? 0),
                          }
                        : {}),
                    });
                    return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-[#FAF7F0]">
                      <td className="px-4 py-3">
                        <Link href={`/sme/invoices/${inv.id}`} className="font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-2">
                          {inv.invoiceNumber}
                        </Link>
                        <div className="text-xs text-slate-500">{inv.smeName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{inv.buyerName ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{money(inv.amount, inv.currency)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {inv.riskScore != null ? `${inv.riskScore}/100` : "-"}
                        <div className="text-xs text-slate-500">{inv.riskLabel}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        You receive now {money(moneyBreakdown.advanceAmount, inv.currency)}
                        <div className="text-xs text-slate-500">You receive when the buyer pays {money(moneyBreakdown.supplierFinalPayment, inv.currency)}</div>
                        <div className="text-xs text-slate-500">Total cost {money(moneyBreakdown.totalCost, inv.currency)}</div>
                      </td>
                      <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        {inv.status === "uploaded" ? (
                          <div className="flex flex-col items-start gap-2">
                            {buyerLink?.invoiceId === inv.id && (
                              <button type="button" onClick={() => void copyBuyerLink(buyerLink.token)} className="text-xs font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-2">
                                Copy buyer link
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={regeneratingId === inv.id}
                              onClick={() => void regenerateBuyerLink(inv.id)}
                              className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 disabled:opacity-50"
                            >
                              {regeneratingId === inv.id ? "Generating…" : "Regenerate link"}
                            </button>
                          </div>
                        ) : "-"}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
    </label>
  );
}
