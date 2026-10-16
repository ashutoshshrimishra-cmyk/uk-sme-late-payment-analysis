"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

type Invoice = {
  id: number;
  invoiceNumber: string;
  smeName: string;
  smeEmail: string;
  description: string | null;
  amount: string;
  currency: string;
  dueDate: string;
  issueDate: string;
  status: string;
  riskScore: number | null;
  riskLabel: string | null;
  riskFactors: { name: string; impact: number; detail: string }[] | null;
  riskOverrideNote: string | null;
  advancePct: string | null;
  feePct: string | null;
  advanceAmount: string | null;
  feeAmount: string | null;
  amountPaid: string;
  paypalInvoiceId: string | null;
  paypalInvoiceUrl: string | null;
  paypalPayoutBatchId: string | null;
  paypalMode: string;
  deliveryProofNote: string | null;
  confirmedAt: string | null;
  fundedAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

type Buyer = { id: number; name: string; email: string; creditScore: number; latePaymentRate: string; totalInvoicesFinanced: number };
type EventRow = { id: number; status: string; note: string | null; createdAt: string };
type LedgerRow = { id: number; type: string; amount: string; note: string | null; createdAt: string };

function money(v: string | number | null | undefined, currency = "GBP") {
  const n = typeof v === "string" ? Number(v) : v;
  if (n == null || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
}

function dt(v: string | null) {
  if (!v) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

export default function InvoiceDetail({
  invoiceId,
  showActions,
}: {
  invoiceId: string;
  showActions: boolean;
}) {
  const id = invoiceId;
  const homeHref = showActions ? "/financer" : "/sme";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [proofNote, setProofNote] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payLate, setPayLate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { cache: "no-store" });
      const text = await res.text();
      let data: {
        invoice?: Invoice;
        buyer?: Buyer;
        events?: EventRow[];
        ledger?: LedgerRow[];
        error?: string;
      } = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: "Server returned an invalid response." };
        }
      }

      if (!res.ok) {
        setInvoice(null);
        setBuyer(null);
        setEvents([]);
        setLedger([]);
        setMessage({ type: "error", text: data.error ?? "Unable to load invoice." });
        return;
      }

      setInvoice(data.invoice ?? null);
      setBuyer(data.buyer ?? null);
      setEvents(data.events ?? []);
      setLedger(data.ledger ?? []);
      if (data.invoice) {
        setPayAmount(data.invoice.amount);
      }
    } catch {
      setInvoice(null);
      setBuyer(null);
      setEvents([]);
      setLedger([]);
      setMessage({ type: "error", text: "Network error while loading invoice." });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const run = async () => {
      await load();
    };

    void run();
  }, [load]);

  async function act(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${id}/${path}`, {
        method: path === "risk" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Action failed" });
      } else {
        setMessage({ type: "success", text: "Done." });
        await load();
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-12 text-slate-500">Loading…</main>;
  }
  if (!invoice) {
    return <main className="mx-auto max-w-5xl px-6 py-12 text-rose-600">Invoice not found.</main>;
  }

  const currency = invoice.currency;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={homeHref} className="text-xs font-semibold text-indigo-600 hover:underline">
        ← Back to {showActions ? "queue" : "dashboard"}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-slate-600">
            {invoice.smeName} → {buyer?.name} ({buyer?.email})
          </p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      {message && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message.text}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Core details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Invoice</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-right font-semibold text-slate-900">{money(invoice.amount, currency)}</dd>
              <dt className="text-slate-500">Amount paid so far</dt>
              <dd className="text-right text-slate-800">{money(invoice.amountPaid, currency)}</dd>
              <dt className="text-slate-500">Issue date</dt>
              <dd className="text-right text-slate-800">{dt(invoice.issueDate)}</dd>
              <dt className="text-slate-500">Due date</dt>
              <dd className="text-right text-slate-800">{dt(invoice.dueDate)}</dd>
              <dt className="text-slate-500">Description</dt>
              <dd className="text-right text-slate-800">{invoice.description || "-"}</dd>
              <dt className="text-slate-500">PayPal invoice ID</dt>
              <dd className="text-right font-mono text-xs text-slate-700">{invoice.paypalInvoiceId}</dd>
              {invoice.paypalPayoutBatchId && (
                <>
                  <dt className="text-slate-500">Payout batch ID</dt>
                  <dd className="text-right font-mono text-xs text-slate-700">{invoice.paypalPayoutBatchId}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Explainable AI risk score</h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="text-4xl font-bold text-slate-900">{invoice.riskScore}</div>
              <div>
                <div className="font-semibold text-slate-800">{invoice.riskLabel}</div>
                <div className="text-xs text-slate-500">Advance {pct(invoice.advancePct)} · Fee {pct(invoice.feePct)}</div>
              </div>
            </div>
            {invoice.riskOverrideNote && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Human override: {invoice.riskOverrideNote}</p>
            )}
            <ul className="mt-4 space-y-1.5 text-sm">
              {invoice.riskFactors?.map((f) => (
                <li key={f.name} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0">
                  <span className="text-slate-600">{f.name}: <span className="text-slate-400">{f.detail}</span></span>
                  <span className={`font-semibold ${f.impact > 0 ? "text-emerald-600" : f.impact < 0 ? "text-rose-600" : "text-slate-400"}`}>
                    {f.impact > 0 ? `+${f.impact}` : f.impact}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Status timeline</h2>
            <ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <div className="flex items-center gap-2">
                    <StatusBadge status={e.status} />
                    <span className="text-xs text-slate-400">{dt(e.createdAt)}</span>
                  </div>
                  {e.note && <p className="mt-1 text-sm text-slate-600">{e.note}</p>}
                </li>
              ))}
            </ol>
          </div>

          {ledger.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">Waterfall ledger for this invoice</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 py-2 pr-3 font-medium">Type</th>
                      <th className="border-b border-slate-200 py-2 pr-3 font-medium">Amount</th>
                      <th className="border-b border-slate-200 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id}>
                        <td className="border-b border-slate-100 py-2 pr-3 capitalize text-slate-700">{l.type.replace(/_/g, " ")}</td>
                        <td className={`border-b border-slate-100 py-2 pr-3 font-semibold ${Number(l.amount) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {money(l.amount, currency)}
                        </td>
                        <td className="border-b border-slate-100 py-2 text-xs text-slate-500">{l.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Pricing</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Advance" value={money(invoice.advanceAmount, currency)} />
              <Row label="SME fee" value={money(invoice.feeAmount, currency)} />
              <Row label="Est. balance to SME on repayment" value={money(Number(invoice.amount) - Number(invoice.advanceAmount) - Number(invoice.feeAmount), currency)} />
            </dl>
          </div>

          {showActions && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">Actions</h2>

              {invoice.status === "uploaded" && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-slate-500">Simulate the buyer confirming the invoice and delivery proof.</p>
                  <textarea
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder="Delivery note / PO reference (optional)"
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                    rows={2}
                  />
                  <button disabled={busy} onClick={() => act("confirm", { deliveryProofNote: proofNote })} className="btn-primary">
                    Simulate buyer step
                  </button>
                </div>
              )}

              {invoice.status === "accepted" && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-slate-500">
                    Advance {money(invoice.advanceAmount, currency)} is queued through the configured payout connection.
                  </p>
                  <button disabled={busy} onClick={() => act("fund")} className="btn-primary">
                    Fund from pool
                  </button>
                </div>
              )}

              {invoice.status === "funded" && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-slate-500">Record the buyer&apos;s payment (bank transfer by default) against the invoice.</p>
                  <label className="block text-xs font-medium text-slate-600">
                    Amount paid
                    <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={payLate} onChange={(e) => setPayLate(e.target.checked)} />
                    Record payment 30 days late
                  </label>
                  <button
                    disabled={busy}
                    onClick={() =>
                      act("pay", {
                        amountPaid: Number(payAmount),
                        paymentDate: payLate
                          ? new Date(new Date(invoice.dueDate).getTime() + 30 * 86400000).toISOString()
                          : invoice.dueDate,
                      })
                    }
                    className="btn-primary"
                  >
                    Record payment
                  </button>
                  <button disabled={busy} onClick={() => act("default", { reason: "Buyer insolvency" })} className="btn-secondary w-full">
                    Record default
                  </button>
                </div>
              )}

              {["paid", "partially_paid", "defaulted", "declined"].includes(invoice.status) && (
                <p className="mt-3 text-sm text-slate-500">This invoice has reached a final or near-final state. See the timeline and ledger for the full outcome.</p>
              )}
            </div>
          )}

          {buyer && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">Buyer profile</h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row label="Credit score" value={`${buyer.creditScore}/100`} />
                <Row label="Late-payment rate" value={`${Math.round(Number(buyer.latePaymentRate) * 100)}%`} />
                <Row label="Invoices financed before" value={String(buyer.totalInvoicesFinanced)} />
              </dl>
            </div>
          )}
        </div>
      </div>

      <style>{`.btn-primary { width: 100%; border-radius: 9999px; background: #0f172a; color: white; padding: 0.6rem 1rem; font-size: 0.875rem; font-weight: 600; } .btn-primary:disabled { opacity: 0.5; } .btn-secondary { border-radius: 9999px; border: 1px solid #fecdd3; color: #be123c; padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 600; background: white; }`}</style>
    </main>
  );
}

function pct(v: string | null) {
  if (!v) return "-";
  return `${Math.round(Number(v) * 100)}%`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
