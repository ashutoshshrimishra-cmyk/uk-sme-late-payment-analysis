"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ROLE_HOME, ROLES, type Role } from "@/lib/roles";

const ROLE_LABELS: Record<Role, string> = {
  sme: "SME",
  financer: "Financer",
  investor: "Investor",
};

export default function LoginForm({
  denied,
  initialRole,
}: {
  denied: boolean;
  initialRole: Role;
}) {
  const [role, setRole] = useState(initialRole);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, passcode }),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to sign in.");
      window.location.assign(ROLE_HOME[role]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF7F0] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#C9A227]/35 bg-white p-8 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A227]">Fast Finance UK</p>
        <h1 className="font-royal mt-2 text-3xl font-semibold text-[#0B1F3A]">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Choose your portal and enter its passcode.</p>

        {denied && (
          <p role="alert" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Sign in with a role that can access that page.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Portal</legend>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={role === option}
                  onClick={() => {
                    setRole(option);
                    setError("");
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    role === option
                      ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                      : "border-slate-200 bg-white text-[#0B1F3A] hover:border-[#C9A227]"
                  }`}
                >
                  {ROLE_LABELS[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="passcode">
            Passcode
            <input
              id="passcode"
              type="password"
              autoComplete="current-password"
              required
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm normal-case text-slate-900 outline-none focus:border-[#0B1F3A]"
            />
          </label>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy || !passcode}
            className="w-full rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#13315c] disabled:opacity-50"
          >
            {busy ? "Signing in…" : `Enter ${ROLE_LABELS[role]} portal`}
          </button>
        </form>

        <Link href="/" className="mt-6 block text-center text-xs text-slate-500 hover:text-[#0B1F3A]">
          Back to home
        </Link>
      </section>
    </main>
  );
}
