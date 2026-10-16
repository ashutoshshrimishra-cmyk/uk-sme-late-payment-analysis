"use client";

import { useCallback, useEffect, useState } from "react";

type InvoiceSummary = {
  invoiceNumber: string;
  smeName: string;
  description: string | null;
  amount: string;
  currency: string;
  dueDate: string;
  status: string;
  buyerName: string;
};

function money(amount: string, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(amount) || 0);
}

export default function BuyerAcceptance({ token }: { token: string }) {
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [proof, setProof] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/buyer/accept/${encodeURIComponent(token)}`, { cache: "no-store" });
      const data: { invoice?: InvoiceSummary; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load the invoice.");
      setInvoice(data.invoice ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the invoice.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const run = async () => {
      await loadInvoice();
    };
    void run();
  }, [loadInvoice]);

  async function acceptInvoice() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/buyer/accept/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryProofNote: proof }),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not accept the invoice.");
      await loadInvoice();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept the invoice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-6 py-12 font-body text-slate-700">
      <section className="mx-auto max-w-2xl rounded-2xl border border-[#C9A227]/40 bg-white p-8 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A227]">Fast Finance UK · Buyer confirmation</p>
        <h1 className="font-royal mt-2 text-3xl font-semibold text-[#0B1F3A]">Confirm invoice acceptance</h1>
        {loading && <p role="status" className="mt-6 text-sm text-slate-500">Loading invoice…</p>}
        {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {invoice && !loading && (
          <>
            <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-slate-500">Invoice</dt><dd className="text-right font-semibold">{invoice.invoiceNumber}</dd>
              <dt className="text-slate-500">Supplier</dt><dd className="text-right">{invoice.smeName}</dd>
              <dt className="text-slate-500">Buyer</dt><dd className="text-right">{invoice.buyerName}</dd>
              <dt className="text-slate-500">Amount</dt><dd className="text-right font-semibold">{money(invoice.amount, invoice.currency)}</dd>
              <dt className="text-slate-500">Due date</dt><dd className="text-right">{new Date(invoice.dueDate).toLocaleDateString("en-GB")}</dd>
              <dt className="text-slate-500">Description</dt><dd className="text-right">{invoice.description || "-"}</dd>
              <dt className="text-slate-500">Status</dt><dd className="text-right capitalize">{invoice.status.replaceAll("_", " ")}</dd>
            </dl>
            {invoice.status === "uploaded" ? (
              <div className="mt-6 space-y-3">
                <label className="block text-sm font-medium">
                  Delivery note or purchase-order reference (optional)
                  <textarea value={proof} onChange={(event) => setProof(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
                </label>
                <button type="button" disabled={busy} onClick={() => void acceptInvoice()} className="w-full rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#13315c] disabled:opacity-50">
                  {busy ? "Confirming…" : "Confirm buyer acceptance"}
                </button>
              </div>
            ) : (
              <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                This invoice is already {invoice.status.replaceAll("_", " ")}.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
