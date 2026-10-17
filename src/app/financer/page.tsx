"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  smeName: string;
  buyerName: string | null;
  amount: string;
  currency: string;
  dueDate: string;
  status: string;
};

const FILTERS = ["all", "uploaded", "accepted", "funded", "partially_paid", "paid", "defaulted", "rejected"];

function money(value: string, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value) || 0);
}

function InvoiceTable({ rows, loading }: { rows: InvoiceRow[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-left text-sm">
        <thead className="bg-[#0B1F3A] text-xs uppercase text-white">
          <tr>
            <th className="px-4 py-3 font-semibold">Invoice</th>
            <th className="px-4 py-3 font-semibold">SME</th>
            <th className="px-4 py-3 font-semibold">Buyer</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Due</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-[#FAF7F0]">
              <td className="px-4 py-3">
                <Link href={`/financer/invoices/${invoice.id}`} className="font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-2">
                  {invoice.invoiceNumber}
                </Link>
              </td>
              <td className="px-4 py-3">{invoice.smeName}</td>
              <td className="px-4 py-3">{invoice.buyerName ?? "-"}</td>
              <td className="px-4 py-3">{money(invoice.amount, invoice.currency)}</td>
              <td className="px-4 py-3">{new Date(invoice.dueDate).toLocaleDateString("en-GB")}</td>
              <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No invoices in this view.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function FinancerQueuePage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/invoices", { cache: "no-store" });
      const data: { invoices?: InvoiceRow[]; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load invoices.");
      setInvoices(data.invoices ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load invoices.");
      setInvoices([]);
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

  const needsAction = invoices.filter((invoice) => invoice.status === "accepted" || invoice.status === "uploaded");
  const filteredInvoices = filter === "all" ? invoices : invoices.filter((invoice) => invoice.status === filter);

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-6 py-10 font-body text-slate-600">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A227]">Financer portal</p>
            <h1 className="font-royal mt-1 text-3xl font-semibold text-[#0B1F3A]">Invoice queue</h1>
          </div>
          <button type="button" onClick={() => void loadInvoices()} className="rounded-lg border border-[#C9A227]/50 bg-white px-5 py-3 text-sm font-semibold text-[#0B1F3A] hover:bg-[#FAF7F0]">
            Refresh
          </button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading && <p role="status" className="text-sm text-slate-500">Loading invoices…</p>}

        <section className="rounded-xl border border-[#C9A227]/30 bg-white p-6 shadow-md">
          <h2 className="font-royal text-xl font-semibold text-[#0B1F3A]">Needs action ({needsAction.length})</h2>
          <p className="mt-1 text-sm text-slate-500">Buyer confirmation is optional; uploaded and accepted invoices are ready for funding review.</p>
          <div className="mt-4">
            <InvoiceTable rows={needsAction} loading={loading} />
          </div>
        </section>

        <section className="rounded-xl border border-[#C9A227]/30 bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-royal text-xl font-semibold text-[#0B1F3A]">All invoices ({filteredInvoices.length})</h2>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Status
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2">
                {FILTERS.map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4">
            <InvoiceTable rows={filteredInvoices} loading={loading} />
          </div>
        </section>
      </div>
    </main>
  );
}
