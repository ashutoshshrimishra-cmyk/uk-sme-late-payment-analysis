import Link from "next/link";
import type { Role } from "@/lib/roles";

const OPTIONS: { role: Role; title: string; description: string }[] = [
  { role: "sme", title: "SME portal", description: "Submit invoices and track funding." },
  { role: "financer", title: "Financier portal", description: "Review risk scores, approve advances and record settlement." },
];

export default function PortalCards() {
  return (
    <section aria-labelledby="portal-heading" className="w-full">
      <h2 id="portal-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
        Choose your portal
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ role, title, description }) => (
          <Link
            key={role}
            href={`/login?role=${role}`}
            className="rounded-xl border border-white/35 bg-white/10 p-4 text-left text-white backdrop-blur-sm transition hover:border-[#C9A227] hover:bg-white/20"
          >
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-white/75">{description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
