"use client";

import Link from "next/link";
import { useState } from "react";
import { ROLE_HOME, type Role } from "@/lib/roles";

const ROLE_LABELS: Record<Role, string> = {
  sme: "SME",
  financer: "Financer",
  investor: "Investor",
};

const ROLE_LINKS: Record<Role, { label: string; href: string }[]> = {
  sme: [{ label: "Dashboard", href: "/sme" }],
  financer: [
    { label: "Queue", href: "/financer" },
    { label: "Pool & ledger", href: "/financer/pool" },
  ],
  investor: [{ label: "Portfolio", href: "/investor" }],
};

export default function PortalNav({ role }: { role: Role }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out.");
      window.location.assign("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[#C9A227] bg-[#0B1F3A] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href={ROLE_HOME[role]} className="font-royal text-lg font-semibold text-white sm:text-xl">
          Fast Finance <span className="text-[#C9A227]">UK</span>
        </Link>
        <nav aria-label={`${ROLE_LABELS[role]} portal`} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            {ROLE_LABELS[role]} portal
          </span>
          {ROLE_LINKS[role].map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10 hover:text-white">
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => void signOut()}
            className="rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold text-white hover:border-[#C9A227] disabled:opacity-50"
          >
            Sign out
          </button>
        </nav>
      </div>
      {error && <p role="alert" className="mx-auto max-w-7xl px-6 pb-3 text-xs text-rose-200">{error}</p>}
    </header>
  );
}
