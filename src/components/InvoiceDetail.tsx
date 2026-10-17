"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  calculateInvoiceMoney,
  FINANCIER_INTEREST_APR,
  round2,
} from "@/lib/pricing";

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
  fundingChance?: string;
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
  approvedBy: string | null;
  approvedAt: string | null;
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
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});

  const [payAmount, setPayAmount] = useState("");
  const [payLate, setPayLate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { cache: "no-store" });
      const text = await res.text();
      let data: {
        invoice?: Invoice;
        buyer?: Buyer | null;
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
        setPayAmount((Number(data.invoice.amount) - Number(data.invoice.amountPaid)).toFixed(2));
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
    return <main className="mx-auto max-w-5xl px-6 py-12 text-sm leading-[1.5] text-slate-600">Loading…</main>;
  }
  if (!invoice) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p role="alert" className="text-sm leading-[1.5] text-slate-700">
          {message?.text ?? "Invoice not found."}
        </p>
        <Link href={homeHref} className="mt-4 inline-block text-sm font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]">
          ← Back to {showActions ? "queue" : "dashboard"}
        </Link>
      </main>
    );
  }

  const currency = invoice.currency;
  const isFunded = invoice.fundedAt !== null;
  const moneyBreakdown = calculateInvoiceMoney({
    amount: Number(invoice.amount),
    advancePct: Number(invoice.advancePct ?? 0.8),
    fundingDate: invoice.fundedAt ?? new Date(),
    dueDate: invoice.dueDate,
    ...(isFunded
      ? {
          storedAdvanceAmount: Number(invoice.advanceAmount),
          storedTotalCost: Number(invoice.feeAmount ?? 0),
        }
      : {}),
  });
  const effectiveAdvancePct = Number(invoice.amount) > 0
    ? moneyBreakdown.advanceAmount / Number(invoice.amount) * 100
    : 0;
  const riskScore = Math.max(0, Math.min(100, Number(invoice.riskScore) || 0));
  const riskBandStyles: Record<string, string> = {
    "Low risk": "border-[var(--invoice-risk-low-border)] bg-[var(--invoice-risk-low-bg)] text-[var(--invoice-risk-low)]",
    "Medium risk": "border-[var(--invoice-risk-medium-border)] bg-[var(--invoice-risk-medium-bg)] text-[var(--invoice-risk-medium)]",
    "High risk": "border-[var(--invoice-risk-high-border)] bg-[var(--invoice-risk-high-bg)] text-[var(--invoice-risk-high)]",
    "Very high risk": "border-[var(--invoice-risk-very-high-border)] bg-[var(--invoice-risk-very-high-bg)] text-[var(--invoice-risk-very-high)]",
  };

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-8 font-body text-sm leading-[1.5] text-slate-700 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
      <Link href={homeHref} className="text-sm font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9A227]">
        ← Back to {showActions ? "queue" : "dashboard"}
      </Link>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-royal text-3xl font-semibold text-[#0B1F3A]">{invoice.invoiceNumber}</h1>
          <p className="mt-1 text-sm leading-[1.5] text-slate-700">
            {invoice.smeName} → {buyer?.name} ({buyer?.email})
          </p>
        </div>
        <InvoiceStatusPill status={invoice.status} />
      </div>

      {message && (
        <div className="mt-5 rounded-xl border border-[#D9C99E] bg-white px-4 py-3 text-sm leading-[1.5] text-slate-700">
          {message.text}
        </div>
      )}

      {showActions && (
        <FinancerWorkspace
          invoice={invoice}
          currency={currency}
          effectiveAdvancePct={effectiveAdvancePct}
          defaultDaysToDue={moneyBreakdown.daysToDue}
        />
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {/* Core details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[#E7DFCF] bg-white p-6 shadow-sm">
            <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">Invoice</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <dt className="font-semibold text-[#0B1F3A]">Amount</dt>
              <dd className="text-right tabular-nums text-slate-700">{money(invoice.amount, currency)}</dd>
              <dt className="font-semibold text-[#0B1F3A]">Amount paid so far</dt>
              <dd className="text-right tabular-nums text-slate-700">{money(invoice.amountPaid, currency)}</dd>
              <dt className="font-semibold text-[#0B1F3A]">Issue date</dt>
              <dd className="text-right text-slate-700">{dt(invoice.issueDate)}</dd>
              <dt className="font-semibold text-[#0B1F3A]">Due date</dt>
              <dd className="text-right text-slate-700">{dt(invoice.dueDate)}</dd>
              <dt className="font-semibold text-[#0B1F3A]">Description</dt>
              <dd className="text-right text-slate-700">{invoice.description || "-"}</dd>
              <dt className="font-semibold text-[#0B1F3A]">PayPal invoice ID</dt>
              <dd className="text-right font-mono text-xs text-slate-700">{invoice.paypalInvoiceId}</dd>
              {invoice.paypalPayoutBatchId && (
                <>
                  <dt className="font-semibold text-[#0B1F3A]">Payout batch ID</dt>
                  <dd className="text-right tabular-nums text-slate-700">{invoice.paypalPayoutBatchId}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-[#E7DFCF] bg-white p-6 shadow-sm">
            <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">{showActions ? "Buyer risk" : "Funding chances"}</h2>
            {showActions ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-5xl font-semibold tabular-nums leading-none text-[#0B1F3A]">{invoice.riskScore}</span>
                  <span
                    title="In production this score uses Companies House, credit-bureau and payment-history data."
                    className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                  >
                    Simulated data (prototype)
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskBandStyles[invoice.riskLabel ?? ""] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    {invoice.riskLabel ?? "Unrated"}
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label="Buyer risk score"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={riskScore}
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#F1EBDD]"
                >
                  <div className="h-full rounded-full bg-[#C9A227]" style={{ width: `${riskScore}%` }} />
                </div>
                <p className="mt-2 text-[13px] text-slate-500">Score from 0 to 100</p>
                {invoice.riskOverrideNote && (
                  <p className="mt-3 rounded-lg border border-[#E7DFCF] bg-[#FAF7F0] px-3 py-2 text-sm leading-[1.5] text-slate-700">Human override: {invoice.riskOverrideNote}</p>
                )}
                <ul className="mt-4 space-y-1.5 text-sm">
                  {invoice.riskFactors?.map((f) => (
                    <li key={f.name} className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
                      <span className="leading-[1.5] text-slate-700">{f.name}: {f.detail}</span>
                      <span
                        className="shrink-0 font-semibold tabular-nums"
                        style={{ color: f.impact > 0 ? "var(--invoice-risk-low)" : f.impact < 0 ? "var(--invoice-risk-very-high)" : "#64748B" }}
                      >
                        {f.impact > 0 ? `+${f.impact}` : f.impact}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-lg font-semibold leading-[1.5] text-[#0B1F3A]">{invoice.fundingChance ?? "Unavailable"}</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#E7DFCF] bg-white p-6 shadow-sm">
            <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">Status timeline</h2>
            <ol className="mt-5 space-y-6 border-l border-slate-200 pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#C9A227] ring-1 ring-[#D9C99E]" />
                  <div className="flex flex-wrap items-center gap-2">
                    <InvoiceStatusPill status={e.status} />
                    <span className="text-[13px] text-slate-500">{dt(e.createdAt)}</span>
                  </div>
                  {e.note && (() => {
                    const isLong = e.note.length > 220;
                    const isExpanded = expandedEvents[e.id] ?? false;
                    return (
                      <>
                        <p className={`mt-2 text-sm leading-[1.5] text-slate-700 ${isLong && !isExpanded ? "line-clamp-2" : ""}`}>
                          {e.note}
                        </p>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => setExpandedEvents((current) => ({ ...current, [e.id]: !isExpanded }))}
                            className="mt-1 text-[13px] font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </li>
              ))}
            </ol>
          </div>

          {ledger.length > 0 && (
            <div className="rounded-2xl border border-[#E7DFCF] bg-white p-6 shadow-sm">
              <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">Waterfall ledger for this invoice</h2>
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
                        <td className="border-b border-slate-100 py-2 pr-3 text-right tabular-nums text-slate-700">
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
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E7DFCF] bg-white p-6 shadow-sm">
            <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">Pricing</h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {invoice.confirmedAt ? "Confirmed terms: 90% advance" : "Standard terms: 80% advance"}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="You receive now" value={money(moneyBreakdown.advanceAmount, currency)} emphasis />
              <Row label="Interest" value={money(moneyBreakdown.interestAmount, currency)} />
              <Row label="PayPal fee" value={money(moneyBreakdown.paypalFeeAmount, currency)} />
              <Row label="Platform fee" value={money(moneyBreakdown.platformFeeAmount, currency)} />
              <Row label="Total cost" value={money(moneyBreakdown.totalCost, currency)} subtotal />
              <Row label="You receive when the buyer pays" value={money(moneyBreakdown.supplierFinalPayment, currency)} />
            </dl>
          </div>

          {showActions && (
            <div className="rounded-2xl border border-[#E7DFCF] bg-white p-6 shadow-sm">
              <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">Actions</h2>

              {(invoice.status === "accepted" || invoice.status === "uploaded") && (
                <div className="mt-4 space-y-4">
                  <p className="text-[13px] leading-[1.5] text-slate-600">
                    You receive {money(moneyBreakdown.advanceAmount, currency)} now through the configured payout connection.
                  </p>
                  {!invoice.approvedAt ? (
                    <button disabled={busy} onClick={() => act("approve")} className="w-full rounded-xl border border-[#C9A227] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] hover:bg-[#FAF7F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50">
                      Approve advance
                    </button>
                  ) : (
                    <p className="text-sm font-semibold text-emerald-700">
                      Advance approved by {invoice.approvedBy ?? "Financier"}
                    </p>
                  )}
                  <button disabled={busy || !invoice.approvedAt} onClick={() => act("fund")} className="w-full rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C9A227] hover:text-[#0B1F3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50">
                    Fund from pool
                  </button>
                </div>
              )}

              {(invoice.status === "funded" || invoice.status === "partially_paid") && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-slate-500">Record the buyer&apos;s payment (bank transfer by default) against the invoice.</p>
                  <label className="block text-sm font-semibold text-[#0B1F3A]">
                    Amount paid
                    <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" step="0.01" className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm tabular-nums text-right text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A227]" />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#0B1F3A]">
                    <input type="checkbox" checked={payLate} onChange={(e) => setPayLate(e.target.checked)} className="accent-[#0B1F3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]" />
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
                    className="w-full rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C9A227] hover:text-[#0B1F3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50"
                  >
                    Record payment
                  </button>
                  {invoice.status === "funded" && (
                    <button disabled={busy} onClick={() => act("default", { reason: "Buyer insolvency" })} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] hover:bg-[#FAF7F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] disabled:opacity-50">
                      Record default
                    </button>
                  )}
                </div>
              )}

              {["paid", "partially_paid", "defaulted", "rejected"].includes(invoice.status) && (
                <p className="mt-3 text-sm leading-[1.5] text-slate-600">This invoice has reached a final or near-final state. See the timeline and ledger for the full outcome.</p>
              )}
            </div>
          )}

          {showActions && buyer && (
            <div className="rounded-2xl border border-[#E7DFCF] bg-white p-6 shadow-sm">
              <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">Buyer profile</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Credit score" value={`${buyer.creditScore}/100`} />
                <Row label="Late-payment rate" value={`${Math.round(Number(buyer.latePaymentRate) * 100)}%`} />
                <Row label="Invoices financed before" value={String(buyer.totalInvoicesFinanced)} />
              </dl>
            </div>
          )}
        </div>
      </div>

      </div>
    </main>
  );
}

function FinancerWorkspace({
  invoice,
  currency,
  effectiveAdvancePct,
  defaultDaysToDue,
}: {
  invoice: Invoice;
  currency: string;
  effectiveAdvancePct: number;
  defaultDaysToDue: number;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"calculator" | "notes">("calculator");
  const [advancePct, setAdvancePct] = useState(effectiveAdvancePct.toFixed(1));
  const [daysToDue, setDaysToDue] = useState(String(defaultDaysToDue));
  const noteKey = `financer-note:${invoice.id}`;
  const [noteLoadedFor, setNoteLoadedFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(true);

  useEffect(() => {
    try {
      setNote(window.localStorage.getItem(noteKey) ?? "");
    } catch {
      setNote("");
    }
    setNoteLoadedFor(noteKey);
  }, [noteKey]);

  useEffect(() => {
    if (noteLoadedFor !== noteKey) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(noteKey, note);
        setNoteSaved(true);
      } catch {
        setNoteSaved(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [note, noteKey, noteLoadedFor]);

  const days = Math.max(1, Math.round(Number(daysToDue) || 1));
  const anchorFundingDate = new Date(Date.UTC(2026, 0, 1));
  const whatIf = calculateInvoiceMoney({
    amount: Number(invoice.amount),
    advancePct: Math.max(0, Math.min(100, Number(advancePct) || 0)) / 100,
    fundingDate: anchorFundingDate,
    dueDate: new Date(anchorFundingDate.getTime() + days * 86400000),
  });
  const investorReturn = whatIf.advanceAmount > 0
    ? `${round2((whatIf.interestAmount / whatIf.advanceAmount) * 100).toFixed(2)}%`
    : "N/A";

  function resetCalculator() {
    setAdvancePct(effectiveAdvancePct.toFixed(1));
    setDaysToDue(String(defaultDaysToDue));
  }

  function clearNote() {
    setNote("");
    setNoteSaved(true);
    try {
      window.localStorage.removeItem(noteKey);
    } catch {
      setNoteSaved(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D9C99E] bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-[#0B1F3A] hover:bg-[#FCF9F1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C9A227]"
      >
        <span>Workspace</span>
        <span aria-hidden="true" className="text-lg text-[#9A7620]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-[#E7DFCF] p-6">
          <div role="tablist" aria-label="Financer workspace" className="flex gap-2 border-b border-[#E7DFCF]">
            {(["calculator", "notes"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227] ${tab === item ? "border-[#C9A227] text-[#0B1F3A]" : "border-transparent text-slate-500 hover:text-[#0B1F3A]"}`}
              >
                {item === "calculator" ? "Calculator" : "Notes"}
              </button>
            ))}
          </div>

          {tab === "calculator" ? (
            <div role="tabpanel" className="pt-5">
              <div className="grid gap-4 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-[#0B1F3A]">
                  Advance %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={advancePct}
                    onChange={(event) => setAdvancePct(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A227]"
                  />
                </label>
                    <label className="text-sm font-semibold text-[#0B1F3A]">
                  Days to due
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={daysToDue}
                    onChange={(event) => setDaysToDue(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A227]"
                  />
                </label>
                    <label className="text-sm font-semibold text-[#0B1F3A]">
                  Financier APR
                  <input
                    readOnly
                    value={`${(FINANCIER_INTEREST_APR * 100).toFixed(1)}%`}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 tabular-nums text-slate-600"
                  />
                </label>
              </div>

              <dl className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <MoneyRow label="Advance" value={money(whatIf.advanceAmount, currency)} />
                <MoneyRow label="Interest" value={money(whatIf.interestAmount, currency)} />
                <MoneyRow label="PayPal fee" value={money(whatIf.paypalFeeAmount, currency)} />
                <MoneyRow label="Platform fee" value={money(whatIf.platformFeeAmount, currency)} />
                <MoneyRow label="Total cost" value={money(whatIf.totalCost, currency)} subtotal />
                <MoneyRow label="Supplier receives at settlement" value={money(whatIf.supplierFinalPayment, currency)} emphasis />
                <MoneyRow label="Investor return on advance" value={investorReturn} />
              </dl>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm leading-[1.5] text-slate-600">What-if only. This does not change the invoice.</p>
                <button
                  type="button"
                  onClick={resetCalculator}
                  className="rounded-lg border border-[#D9C99E] px-3 py-2 text-sm font-semibold text-[#0B1F3A] hover:bg-[#FCF9F1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div role="tabpanel" className="pt-5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`financer-note-${invoice.id}`} className="text-sm font-semibold text-[#0B1F3A]">Private note</label>
                <span role="status" className="text-[13px] text-slate-500">{noteSaved ? "Saved" : "Saving…"}</span>
              </div>
              <textarea
                id={`financer-note-${invoice.id}`}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setNoteSaved(false);
                }}
                rows={5}
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm leading-[1.5] text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A227]"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={clearNote}
                  className="rounded-lg border border-[#D9C99E] px-3 py-2 text-sm font-semibold text-[#0B1F3A] hover:bg-[#FCF9F1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function pct(v: string | null) {
  if (!v) return "-";
  return `${Math.round(Number(v) * 100)}%`;
}

function Row({ label, value, emphasis = false, subtotal = false }: { label: string; value: string; emphasis?: boolean; subtotal?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${subtotal ? "mt-2 border-t border-[#E7DFCF] pt-3" : ""}`}>
      <dt className="font-semibold text-[#0B1F3A]">{label}</dt>
      <dd className={`text-right tabular-nums ${emphasis ? "text-lg font-semibold text-[#0B1F3A]" : subtotal ? "font-semibold text-slate-700" : "font-normal text-slate-700"}`}>{value}</dd>
    </div>
  );
}

function MoneyRow({ label, value, emphasis = false, subtotal = false }: { label: string; value: string; emphasis?: boolean; subtotal?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${subtotal ? "border-t border-[#E7DFCF] pt-3" : ""}`}>
      <dt className="font-semibold text-[#0B1F3A]">{label}</dt>
      <dd className={`text-right tabular-nums ${emphasis ? "font-semibold text-[#0B1F3A]" : subtotal ? "font-semibold text-slate-700" : "font-normal text-slate-700"}`}>{value}</dd>
    </div>
  );
}

function InvoiceStatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = {
    uploaded: "Uploaded",
    accepted: "Accepted",
    funded: "Funded",
    partially_paid: "Partially paid",
    paid: "Paid",
    defaulted: "Defaulted",
    rejected: "Rejected",
  };
  const backgrounds: Record<string, string> = {
    paid: "bg-[var(--invoice-risk-low-bg)]",
    accepted: "bg-[#F1EBDD]",
    funded: "bg-[#F7F1DF]",
    partially_paid: "bg-[#F8EEE6]",
    defaulted: "bg-[#F4F1EB]",
    rejected: "bg-[#F4F1EB]",
    uploaded: "bg-slate-100",
  };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-slate-700 ${backgrounds[status] ?? "bg-slate-100"}`}>
      {labels[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}
