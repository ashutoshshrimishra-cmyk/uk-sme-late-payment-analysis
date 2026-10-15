import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Fast Finance | Selective invoice financing for UK SMEs",
  description:
    "PayPal for invoicing and payout, AI for risk: selective financing of buyer-confirmed invoices for UK small businesses.",
};

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-[#C9A227] bg-[#0B1F3A] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <span className="font-royal text-lg sm:text-xl">Fast Finance</span>
          <span className="rounded bg-[#C9A227] px-1.5 py-0.5 text-[10px] font-bold text-[#0B1F3A]">UK</span>
        </Link>
        <nav className="flex items-center gap-1 text-[10px] font-medium text-white/80 sm:gap-2 sm:text-sm">
          <Link href="/" className="hidden rounded-lg px-2 py-2 hover:text-[#C9A227] sm:inline-flex sm:px-3">
            Pitch
          </Link>
          <Link href="/dashboard" className="hidden rounded-lg px-2 py-2 hover:text-[#C9A227] sm:inline-flex sm:px-3">
            Dashboard
          </Link>
          <Link href="/pool" className="hidden rounded-lg px-2 py-2 hover:text-[#C9A227] md:inline-flex md:px-3">
            Investor Pool
          </Link>
          <Link
            href="/dashboard"
            className="ml-1 rounded-lg bg-[#C9A227] px-3 py-2 font-semibold text-[#0B1F3A] hover:bg-[#b38f1e] sm:ml-2 sm:px-4"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfairDisplay.variable}`}>
      <body className="bg-[#FAF7F0] text-slate-600 antialiased font-body">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
