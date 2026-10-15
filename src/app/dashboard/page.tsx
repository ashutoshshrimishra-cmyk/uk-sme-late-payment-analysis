"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

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

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ error?: string; message?: string } | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", { cache: "no-store" });
      const data = await res.json();
      setInvoices(data.invoices ?? []);
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

  function fillDemoDefaults() {
    const due = new Date();
    due.setDate(due.getDate() + 45);
    setForm({
      smeName: "Riverside Joinery Ltd",
      smeEmail: "owner@riversidejoinery.example.com",
      buyerName: "Harlow Construction Group",
      buyerEmail: "accounts@harlowconstruction.example.com",
      amount: "10000",
      dueDate: due.toISOString().slice(0, 10),
      description: "Bespoke staircase and fitted joinery, phase 2",
    });
  }

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
          message: `Invoice ${data.invoice.invoiceNumber} created — AI score ${data.risk.score}/100 (${data.risk.label}). PayPal mode: ${data.paypal.mode}.`,
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
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">SME dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Upload an invoice, get scored, get paid</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            This submits a real invoice-financing request through the demo pipeline: AI risk
            scoring → PayPal Invoicing (sandbox, or simulated without credentials) → buyer
            confirmation → pool funding → repayment waterfall.
          </p>
        </div>
        <Link href="/pool" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          View investor pool →
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <form onSubmit={onSubmit} className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">New invoice</h2>
            <button type="button" onClick={fillDemoDefaults} className="text-xs font-semibold text-indigo-600 hover:underline">
              Fill demo data
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <Field label="Your business name">
              <input required value={form.smeName} onChange={(e) => setForm({ ...form, smeName: e.target.value })} className="input" placeholder="Riverside Joinery Ltd" />
            </Field>
            <Field label="Your email (for the payout)">
              <input required type="email" value={form.smeEmail} onChange={(e) => setForm({ ...form, smeEmail: e.target.value })} className="input" placeholder="owner@example.com" />
            </Field>
            <Field label="Buyer name">
              <input required value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} className="input" placeholder="Harlow Construction Group" />
            </Field>
            <Field label="Buyer email">
              <input required type="email" value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} className="input" placeholder="accounts@buyer.example.com" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice amount (£)">
                <input required type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" placeholder="10000" />
              </Field>
              <Field label="Due date">
                <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} placeholder="Goods / services supplied" />
            </Field>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? "Scoring & sending via PayPal…" : "Create & send invoice"}
          </button>

          {lastResult?.error && <p className="mt-3 text-sm text-rose-600">{lastResult.error}</p>}
          {lastResult?.message && <p className="mt-3 text-sm text-emerald-700">{lastResult.message}</p>}
        </form>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Invoices ({invoices.length})</h2>
            <button onClick={loadInvoices} className="text-xs font-semibold text-indigo-600 hover:underline">
              Refresh
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Buyer</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                  <th className="px-4 py-3 font-semibold">Advance / Fee</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      No invoices yet — create one on the left.
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${inv.id}`} className="font-semibold text-indigo-700 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                      <div className="text-xs text-slate-500">{inv.smeName}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.buyerName ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{money(inv.amount, inv.currency)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {inv.riskScore != null ? `${inv.riskScore}/100` : "—"}
                      <div className="text-xs text-slate-500">{inv.riskLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {inv.advanceAmount ? money(inv.advanceAmount, inv.currency) : "—"}
                      <div className="text-xs text-slate-500">{inv.feeAmount ? `fee ${money(inv.feeAmount, inv.currency)}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{inv.paypalMode}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`.input { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; } .input:focus { outline: 2px solid #6366f1; border-color: transparent; }`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
