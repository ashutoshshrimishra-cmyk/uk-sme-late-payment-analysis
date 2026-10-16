"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  buyerAcceptanceToken: string | null;
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
  amountPaid: string;
  paypalMode: string;
  createdAt: string;
};

const EMPTY_FORM = {
  smeName: "",
  smeEmail: "",
  buyerName: "",
  buyerEmail: "",
  amount: "",
  dueDate: "",
  description: "",
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
    declined: "Declined",
  }[normalizedStatus] ?? normalizedStatus.replaceAll("_", " ");
  const tone = normalizedStatus === "paid"
    ? "bg-emerald-100 text-emerald-800"
    : ["accepted", "funded", "partially_paid"].includes(normalizedStatus)
      ? "bg-amber-100 text-amber-800"
      : ["defaulted", "declined"].includes(normalizedStatus)
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${tone}`}>{label}</span>;
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ error?: string; message?: string; buyerToken?: string } | null>(null);

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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setLastResult({ error: data.error ?? "Something went wrong" });
      } else {
        setLastResult({
          message: `Invoice ${data.invoice.invoiceNumber} created. AI score ${data.risk.score}/100 (${data.risk.label}).`,
          buyerToken: data.invoice.buyerAcceptanceToken,
        });
        setForm({ ...EMPTY_FORM });
        await loadInvoices();
      }
    } catch {
      setLastResult({ error: "Network error creating invoice" });
    } finally {
      setSubmitting(false);
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

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 h-11 w-full rounded-lg bg-[#0B1F3A] px-6 text-sm font-semibold text-white hover:bg-[#13315c] disabled:opacity-50"
            >
              {submitting ? "Scoring & sending via PayPal…" : "Create & send invoice"}
            </button>

            {lastResult?.error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{lastResult.error}</p>}
            {lastResult?.message && (
              <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p>{lastResult.message}</p>
                {lastResult.buyerToken && (
                  <Link
                    href={`/buyer/accept/${lastResult.buyerToken}`}
                    className="mt-2 inline-block font-semibold underline"
                  >
                    Share buyer acceptance link
                  </Link>
                )}
              </div>
            )}
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
                    <th className="px-4 py-3 font-semibold">Advance / Fee</th>
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
                  {invoices.map((inv) => (
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
                        {inv.advanceAmount ? money(inv.advanceAmount, inv.currency) : "-"}
                        <div className="text-xs text-slate-500">{inv.feeAmount ? `fee ${money(inv.feeAmount, inv.currency)}` : ""}</div>
                      </td>
                      <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        {inv.status === "uploaded" && inv.buyerAcceptanceToken ? (
                          <Link href={`/buyer/accept/${inv.buyerAcceptanceToken}`} className="text-xs font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-2">
                            Share link
                          </Link>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
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
