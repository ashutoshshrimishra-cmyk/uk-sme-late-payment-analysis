"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type InvoiceSummary = {
  smeName: string;
  description: string | null;
  amount: string;
  currency: string;
  dueDate: string;
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
  const [invalid, setInvalid] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/buyer/accept/${encodeURIComponent(token)}`, { cache: "no-store" });
      const data: { invoice?: InvoiceSummary; error?: string } = await response.json();
      if (response.status === 404) {
        setInvalid(true);
        setInvoice(null);
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "Could not load this invoice.");
      setInvoice(data.invoice ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this invoice.");
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

  async function acceptInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reference = proof.trim();
    if (!reference || reference.length > 100) {
      setError("Enter a delivery / PO reference of 100 characters or fewer.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/buyer/accept/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryProofNote: reference }),
      });
      const data: { error?: string } = await response.json();
      if (response.status === 404) {
        setInvalid(true);
        setInvoice(null);
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "Could not accept this invoice.");
      setAccepted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept this invoice.");
    } finally {
      setBusy(false);
    }
  }

  if (invalid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F0] px-6 py-12 font-body text-slate-700">
        <section className="w-full max-w-lg rounded-2xl border border-[#C9A227]/40 bg-white p-8 text-center shadow-md">
          <h1 className="font-royal text-3xl font-semibold text-[#0B1F3A]">This link is not valid</h1>
        </section>
      </main>
    );
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
              <dt className="text-slate-500">Amount</dt><dd className="text-right font-semibold">{money(invoice.amount, invoice.currency)}</dd>
              <dt className="text-slate-500">SME business</dt><dd className="text-right">{invoice.smeName}</dd>
              <dt className="text-slate-500">Description</dt><dd className="text-right">{invoice.description || "-"}</dd>
              <dt className="text-slate-500">Due date</dt><dd className="text-right">{new Date(invoice.dueDate).toLocaleDateString("en-GB")}</dd>
            </dl>
            {accepted ? (
              <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Invoice acceptance recorded.
              </p>
            ) : (
              <form onSubmit={(event) => void acceptInvoice(event)} className="mt-6 space-y-3">
                <label className="block text-sm font-medium" htmlFor="delivery-reference">
                  Delivery / PO reference <span aria-hidden="true">*</span>
                  <input
                    id="delivery-reference"
                    name="deliveryReference"
                    type="text"
                    required
                    maxLength={100}
                    value={proof}
                    onChange={(event) => setProof(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || proof.trim().length === 0 || proof.trim().length > 100}
                  className="w-full rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#13315c] disabled:opacity-50"
                >
                  {busy ? "Accepting…" : "Accept invoice"}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
