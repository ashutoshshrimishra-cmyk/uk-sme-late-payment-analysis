import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayFlow Finance — Selective invoice financing for UK SMEs",
  description:
    "PayPal for invoicing and payout, AI for risk: selective financing of buyer-confirmed invoices for UK small businesses.",
};

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-bold text-white">
            PF
          </span>
          <span className="text-lg tracking-tight">PayFlow Finance</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
          <Link href="/" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            Pitch
          </Link>
          <Link href="/dashboard" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            SME Dashboard
          </Link>
          <Link href="/pool" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            Investor Pool
          </Link>
          <Link
            href="/dashboard"
            className="ml-2 rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
          >
            Launch demo
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <NavBar />
        {children}
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
          Demo scope: PayPal sandbox, simulated investor pool, no real money moves. Figures marked
          &ldquo;assumption&rdquo; or &ldquo;target&rdquo; are illustrative, see Appendix.
        </footer>
      </body>
    </html>
  );
}
