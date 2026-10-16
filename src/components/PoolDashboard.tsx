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
  default_reserve_drawdown: "Default: reserve drawdown",
  default_pool_loss: "Default: pool loss",
};

export default function PoolDashboard({
  role,
}: {
  role: "financer" | "investor";
}) {
  const [state, setState] = useState<PoolStateRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pool", { cache: "no-store" });
      const text = await res.text();
      let data: { state?: PoolStateRow; ledger?: LedgerRow[]; error?: string } = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: "Server returned an invalid response." };
        }
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Unable to load pool information.");
      }

      setState(data.state ?? null);
      setLedger(data.ledger ?? []);
    } catch (cause) {
      setState(null);
      setLedger([]);
      setError(cause instanceof Error ? cause.message : "Unable to load pool information.");
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
    <main className="min-h-screen bg-[#FAF7F0] px-6 py-10 font-body text-slate-600">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A227]">
              {role === "investor" ? "Investor portfolio" : "Financer pool"}
            </p>
            <h1 className="font-royal mt-1 text-3xl font-semibold text-[#0B1F3A]">
              {role === "investor" ? "Portfolio performance" : "Pool ledger and health"}
            </h1>
            <div className="mt-4 h-px bg-[#C9A227]/40" />
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Ledger entries show advances, repayments, reserve allocations and platform margin.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="h-11 rounded-lg border border-[#C9A227]/50 bg-white px-5 text-sm font-semibold text-[#0B1F3A] hover:bg-[#FAF7F0]">
              Refresh
            </button>
            {role === "financer" && (
              <Link href="/financer" className="inline-flex h-11 items-center rounded-lg bg-[#0B1F3A] px-5 text-sm font-semibold text-white hover:bg-[#13315c]">
                Go to queue
              </Link>
            )}
          </div>
        </div>

        {loading && <p className="mt-8 text-sm text-slate-500">Loading…</p>}
        {error && <p role="alert" className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {state && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card label="Available pool balance" value={money(state.balance)} />
              <Card label="Capital currently deployed" value={money(state.totalDeployed)} />
              <Card label="Total pool capital (balance + deployed)" value={money(total)} />
              <Card label="First-loss reserve fund" value={money(state.reserveFund)} />
              <Card label="Cumulative platform margin" value={money(state.platformRevenue)} />
              <Card label="Cumulative investor yield" value={money(state.investorReturns)} />
            </div>

            <div className="mt-6 rounded-xl border border-[#C9A227]/30 bg-white p-6 shadow-md">
              <h2 className="font-royal text-lg font-semibold text-[#0B1F3A]">Capital allocation</h2>
              <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-[#0B1F3A]"
                  style={{ width: `${total > 0 ? Math.min(100, (deployed / total) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                <span>Deployed into invoices: {money(deployed)}</span>
                <span>Idle / available: {money(balance)}</span>
              </div>
            </div>
          </>
        )}

        <section className="mt-8 rounded-xl border border-[#C9A227]/30 bg-white p-6 shadow-md">
          <h2 className="font-royal text-xl font-semibold text-[#0B1F3A]">Recent ledger entries</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#0B1F3A] text-xs uppercase text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
                        <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-[#C9A227]/15 text-lg font-semibold text-[#C9A227]">£</span>
                        <span>Nothing to show yet. Funded invoices will be recorded here.</span>
                      </div>
                    </td>
                  </tr>
                )}
                {ledger.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-[#FAF7F0]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dt(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      {row.invoiceId && role === "financer" ? (
                        <Link href={`/financer/invoices/${row.invoiceId}`} className="font-semibold text-[#0B1F3A] underline decoration-[#C9A227] underline-offset-2">
                          {row.invoiceNumber}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{TYPE_LABEL[row.type] ?? row.type}</td>
                    <td className={`px-4 py-3 font-semibold ${Number(row.amount) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(row.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#C9A227]/30 bg-white p-6 shadow-md">
      <div className="font-royal text-2xl font-semibold text-[#0B1F3A]">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
    </div>
  );
}
