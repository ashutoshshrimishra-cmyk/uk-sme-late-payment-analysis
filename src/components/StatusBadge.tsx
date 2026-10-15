const STYLES: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700",
  accepted: "bg-sky-100 text-sky-700",
  funded: "bg-indigo-100 text-indigo-700",
  paid: "bg-emerald-100 text-emerald-700",
  partially_paid: "bg-amber-100 text-amber-800",
  defaulted: "bg-rose-100 text-rose-700",
  declined: "bg-rose-100 text-rose-700",
};

const LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  accepted: "Accepted",
  funded: "Funded",
  paid: "Paid",
  partially_paid: "Partially paid",
  defaulted: "Defaulted",
  declined: "Declined",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status] ?? "bg-slate-100 text-slate-700"}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
