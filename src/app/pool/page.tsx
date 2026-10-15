"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PoolStateRow = {
  balance: string;
  totalDeployed: string;
  reserveFund: string;
  platformRevenue: string;
  platformCosts: string;
  investorReturns: string;
  updatedAt: string;
};

type LedgerRow = {
  id: number;
  invoiceId: number | null;
  invoiceNumber: string | null;
  type: string;
  amount: string;
  note: string | null;
  createdAt: string;
};

function money(v: string | number) {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
}

function dt(v: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

const TYPE_LABEL: Record<string, string> = {
  advance: "Advance to SME",
  investor_principal_returned: "Principal returned",
  investor_return: "Investor yield",
  loss_reserve: "Loss reserve top-up",
  platform_cost: "Platform cost",
  platform_margin: "Platform margin",
  sme_balance_payout: "Balance to SME",
  default_reserve_drawdown: "Default — reserve drawdown",
  default_pool_loss: "Default — pool loss",
};

export default function PoolPage() {
  const [state, setState] = useState<PoolStateRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pool", { cache: "no-store" });
      const data = await res.json();
      setState(data.state);
      setLedger(data.ledger ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await load();
    };

    void run();
  }, [load]);

  const deployed = state ? Number(state.totalDeployed) : 0;
  const balance = state ? Number(state.balance) : 0;
  const total = deployed + balance;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Simulated investor pool</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Pool ledger and health</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            No real money moves here (Appendix A5). Every advance, repayment, loss reserve and
            platform margin on the dashboard is logged below for transparency.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Refresh
          </button>
          <Link href="/dashboard" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Go to SME dashboard
          </Link>
        </div>
      </div>

      {loading && <p className="mt-8 text-slate-400">Loading…</p>}

      {state && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="Available pool balance" value={money(state.balance)} tone="indigo" />
            <Card label="Capital currently deployed" value={money(state.totalDeployed)} tone="sky" />
            <Card label="Total pool capital (balance + deployed)" value={money(total)} tone="slate" />
            <Card label="First-loss reserve fund" value={money(state.reserveFund)} tone="amber" />
            <Card label="Cumulative platform margin" value={money(state.platformRevenue)} tone="emerald" />
            <Card label="Cumulative investor yield" value={money(state.investorReturns)} tone="violet" />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Capital allocation</h2>
            <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${total > 0 ? Math.min(100, (deployed / total) * 100) : 0}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Deployed into invoices: {money(deployed)}</span>
              <span>Idle / available: {money(balance)}</span>
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <h2 className="font-semibold text-slate-900">Recent ledger entries</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No pool activity yet — fund an invoice from the SME dashboard.
                  </td>
                </tr>
              )}
              {ledger.map((row) => (
                <tr key={row.id} className="odd:bg-white even:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dt(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    {row.invoiceId ? (
                      <Link href={`/dashboard/${row.invoiceId}`} className="font-semibold text-indigo-700 hover:underline">
                        {row.invoiceNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{TYPE_LABEL[row.type] ?? row.type}</td>
                  <td className={`px-4 py-3 font-semibold ${Number(row.amount) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{money(row.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "indigo" | "sky" | "slate" | "amber" | "emerald" | "violet" }) {
  const tones: Record<string, string> = {
    indigo: "border-indigo-200 bg-indigo-50",
    sky: "border-sky-200 bg-sky-50",
    slate: "border-slate-200 bg-slate-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    violet: "border-violet-200 bg-violet-50",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  );
}
