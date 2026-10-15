import Link from "next/link";

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
      {children}
    </p>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-7xl px-6 py-16 ${className}`}>
      {children}
    </section>
  );
}

function StatCard({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{label}</div>
      {note && <div className="mt-2 text-xs text-slate-500">{note}</div>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            {head.map((h) => (
              <th key={h} className="border-b border-slate-200 px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50/60">
              {row.map((cell, j) => (
                <td key={j} className="border-b border-slate-100 px-4 py-3 align-top text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "amber" | "emerald" | "rose" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    emerald: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-700",
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-indigo-50 via-white to-white">
        <Section className="py-20">
          <Kicker>Slide 1 · Problem</Kicker>
          <h1 className="max-w-4xl text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-slate-950">
            Profitable UK small firms fail because customers pay late, and invoice finance reaches
            very few of them.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600">
            A working PayPal-sandbox demo: AI-scored, buyer-confirmed invoices, funded from a
            simulated investor pool, in 24–48 hours instead of 30–90 days.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Try the live SME demo
            </Link>
            <Link href="/pool" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              View investor pool
            </Link>
          </div>
        </Section>
      </div>

      {/* SLIDE 1 - DATA */}
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value="≈£11bn/yr" label="Cost of late payment to the UK economy" note="Modelled estimate, not a headcount" />
          <StatCard value="~14,000" label="Business closures/yr linked to late payment" note="≈38 a day · ~1 in 20 of ~280k 2024 closures" />
          <StatCard value="28%" label="of UK businesses affected each year" note="Over 1.5 million firms; SMEs hit harder (49% vs 36%)" />
          <StatCard value="17.48m" label="Overdue invoices, Q1 2026" note="+3% YoY · 1.57m businesses with overdue bills" />
          <StatCard value="62.6%" label="of SME invoices paid late in the last year" note="43.1% of owners wrote off money owed" />
          <StatCard value="~45,000" label="UK businesses use invoice finance today" note="≈3% of the 1.57m with overdue bills" />
          <StatCard value="£50K–£500K" label="Typical minimum turnover to qualify" note="Entry barrier for the smallest firms" />
          <StatCard value="3–5%" label="Typical cost of single-invoice finance" note="Plus minimum charges & termination fees" />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Why profitable firms still close</h2>
            <p className="mt-3 text-slate-600">
              Wages, suppliers and VAT fall due on fixed dates, but customer cash arrives 30–90 days
              later. A firm can be profitable on paper and still run out of cash.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">The existing gap</h2>
            <div className="mt-3">
              <Table
                head={["Gap", "Evidence"]}
                rows={[
                  ["Low reach", "~45,000 UK businesses use invoice finance vs 1.57m with overdue bills (~3%, rough calc)"],
                  ["Entry barriers", "Minimum turnover £50K–£500K depending on provider"],
                  ["Costly for one-off use", "Single-invoice finance typically 3–5% of invoice value"],
                  ["Lock-ins", "Minimum monthly charges & termination fees, often 3–6 months' service charge"],
                  ["Law not in force yet", "Bill caps terms at 60 days (30 public bodies), expected no earlier than 2027"],
                  ["Data gap", "Government holds no data on average amount owed to SMEs in overdue invoices"],
                ]}
              />
            </div>
          </div>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Sources: DBT/OSBC–London Economics (Jul 2025), R3 Q1 2026, FreeAgent, UK Finance, Spark
          Finance, Hansard WQ 7647.
        </p>
      </Section>

      {/* SLIDE 2 - SOLUTION */}
      <Section className="border-t border-slate-200 bg-slate-50/60">
        <Kicker>Slide 2 · Solution</Kicker>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950">
          Selective financing of buyer-confirmed invoices: PayPal for invoicing and payout, AI for
          risk.
        </h2>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ol className="grid min-w-[840px] grid-cols-5 gap-3 text-sm">
            {[
              ["SME", "Uploads invoice details"],
              ["Our App + AI", "Extracts data, checks duplicate/fraud, scores risk"],
              ["PayPal", "Creates & sends the invoice to the buyer"],
              ["Buyer", "Confirms in-app + delivery proof (not a PayPal feature)"],
              ["Pool (simulated)", "Prices it and advances 70–85% to the SME"],
            ].map(([who, what], i) => (
              <li key={who} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-indigo-600">Step {i + 1}</div>
                <div className="mt-1 font-semibold text-slate-900">{who}</div>
                <div className="mt-1 text-xs text-slate-600">{what}</div>
              </li>
            ))}
          </ol>
          <div className="mt-4 grid min-w-[840px] grid-cols-3 gap-3 text-sm">
            {[
              ["6", "Payout via PayPal Payouts (sandbox) reaches the SME"],
              ["7", "Buyer pays the balance by bank transfer on the due date"],
              ["8–9", "Payment recorded on the invoice; waterfall splits principal, investor return and SME balance"],
            ].map(([n, what]) => (
              <div key={n} className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
                <div className="text-xs font-semibold text-indigo-600">Step {n}</div>
                <div className="mt-1 text-xs text-slate-700">{what}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Table
            head={["Status", "Event", "Money"]}
            rows={[
              ["Uploaded", "Invoice created in PayPal", "None"],
              ["Accepted", "Buyer confirms in our app (not a PayPal feature)", "None"],
              ["Funded", "Pool advances 70–85%", "Pool → SME"],
              ["Paid", "Bank payment received and recorded on invoice", "Buyer → Pool, balance to SME"],
            ]}
          />
        </div>
      </Section>

      {/* SLIDE 3 */}
      <Section>
        <Kicker>Slide 3 · How the solution closes the gap</Kicker>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950">
          Each gap maps to one feature, and PayPal supplies the invoice and payout rails.
        </h2>
        <div className="mt-8">
          <Table
            head={["Gap", "Our fix", "PayPal's utility"]}
            rows={[
              ["Entry barriers, lock-ins", "Per-invoice funding, no contract, no minimum fee", "Developer sandbox, no bank integration to start"],
              ["Slow cash", "Advance after buyer confirmation (target: 24–48 hrs)", "Payouts sends the advance"],
              ["No trusted invoice record", "Real invoice with ID, buyer confirmation, delivery proof", "Invoicing creates, sends and reminds"],
              ["Status opacity", "One status trail", "Recording a payment marks the invoice PAID, or PARTIALLY PAID if some amount remains"],
              ["Collection cost", "Buyer pays by bank transfer", "API accepts BANK_TRANSFER as a recorded payment method, avoiding the % card fee"],
            ]}
          />
        </div>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <strong>Closures, honest framing:</strong> We cannot prove closures will fall. We can say
          the cash gap on a financed invoice shrinks from up to 60 days to a target of 1–2 days.
          Even 1% of 14,000 closures is 140 firms a year — a <strong>sensitivity example, not a forecast</strong>.
        </div>
      </Section>

      {/* SLIDE 4 */}
      <Section className="border-t border-slate-200 bg-slate-50/60">
        <Kicker>Slide 4 · Innovation and feasibility</Kicker>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950">
          Simple to build in 29 days, novel in how proof, risk and cash are linked.
        </h2>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Innovation</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Buyer confirmation plus delivery proof as the evidence layer — no blockchain.</li>
              <li>AI invoice extraction, duplicate/fraud checks and an explainable risk score.</li>
              <li>Pricing agent that sets fee and advance % per invoice, and chases the buyer (Agentic Commerce angle).</li>
              <li>
                Late-interest design: the Bill sets statutory interest at 8% above base rate, which
                the pool can share <em>once enacted</em>.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Desirability · Feasibility · Viability</h3>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl bg-indigo-50 p-4">
                <div className="font-semibold text-indigo-700">Desirability</div>
                <div className="mt-1 text-slate-600">1.57m firms with overdue bills</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="font-semibold text-emerald-700">Feasibility</div>
                <div className="mt-1 text-slate-600">PayPal sandbox + AI API, no bank needed</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <div className="font-semibold text-amber-700">Viability</div>
                <div className="mt-1 text-slate-600">Fee 1.83%–3% covers cost (Slide 6)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Table
            head={["Claim", "Label"]}
            rows={[
              ["Status tracking, external payment recording", <Pill tone="emerald" key="a">Demonstrated in sandbox</Pill>],
              ["24–48 hr advance", <Pill tone="amber" key="b">Target</Pill>],
              ["AI default prediction", <Pill tone="rose" key="c">Proposed — no real default data, heuristic score</Pill>],
              ["Investor 10% return", <Pill tone="rose" key="d">Assumption — sources are 2015–17</Pill>],
            ]}
          />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {["Week 1 — Invoicing + Payouts flow", "Week 2 — AI risk layer", "Week 3 — Waterfall & dashboard", "Week 4 — Repo, licence, README, 3-min video"].map((s) => (
            <div key={s} className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
              {s}
            </div>
          ))}
        </div>
      </Section>

      {/* SLIDE 5 */}
      <Section>
        <Kicker>Slide 5 · Risk mitigation and strategy</Kicker>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950">
          Buyer acceptance is evidence, not a guarantee, so risk is controlled in layers.
        </h2>
        <div className="mt-8">
          <Table
            head={["Risk", "Control"]}
            rows={[
              ["Dispute or delivery problem", "Delivery/PO proof, dispute window, buyer dispute history"],
              ["Buyer late or insolvent", "Buyer credit check, advance 70–85% by score, concentration cap (max 20% of pool per buyer, assumption)"],
              ["Fake or duplicate invoice", "Invoice hash check, no funding without confirmation, per-SME limit"],
              ["\u201cPaid\u201d status wrong", "Bank-side confirmation (simulated in sandbox)"],
              ["Card fee kills margin", "Leg 2 by bank transfer, recorded via API"],
              ["Regulation (FCA, pooling, PayPal lending policy)", "Unverified. Simulated pool now, authorised partner later"],
              ["AI error or bias", "Explainable score, human override, decision log"],
            ]}
          />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Default loss waterfall (proposed)</h3>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Recourse to SME</li>
              <li>First-loss reserve of platform / financer partner</li>
              <li>Senior investor last</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Strategy</h3>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li><strong>Phase 1</strong> — sandbox demo</li>
              <li><strong>Phase 2</strong> — pilot with one licensed financer, 20–50 invoices</li>
              <li><strong>Phase 3</strong> — institutional pool once loss data exists</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* SLIDE 6 */}
      <Section className="border-t border-slate-200 bg-slate-50/60">
        <Kicker>Slide 6 · Stakeholders and business model</Kicker>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950">
          The fee must cover investor return, loss and cost: minimum 1.83%, assumed 3%.
        </h2>

        <p className="mt-4 max-w-3xl text-slate-600">
          Market check: total invoice-factoring charges are typically 1–5% of invoice value, with
          70–90% advanced. Older sources cite investor gross yields of 8–15% with 1–3% annual
          losses.
        </p>

        <h3 className="mt-8 font-semibold text-slate-900">
          Unit economics: £10,000 invoice, 60 days, 85% advance (£8,500). All assumptions.
        </h3>
        <div className="mt-3">
          <Table
            head={["Item", "Calculation", "£"]}
            rows={[
              ["SME fee", "3% of £10,000", "300.00"],
              ["Investor return Y", "10% × £8,500 × 60/365", "139.73"],
              ["Expected loss D", "2% × £8,500 × 60/365", "27.95"],
              ["Cost F", "payout 0.75 + credit data 4 + AI/compute 5 + ops 5", "15.00"],
              ["Margin M", "", "117.32"],
            ]}
          />
        </div>

        <div className="mt-6">
          <Table
            head={["Scenario", "Margin"]}
            rows={[
              ["Buyer pays on time by bank transfer", "+£117.32"],
              ["Buyer pays via PayPal at ~2.9% + £0.30 (third-party figure, verify)", "−£172.98"],
              ["Buyer 30 days late, platform absorbs extra investor accrual", "+£47.46"],
              ["Buyer defaults", "See default waterfall, Slide 5"],
            ]}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          <strong>Key numbers:</strong> Break-even fee is 1.83% (zero margin) and 2.33% for £50
          margin. Effective cost is about 21% annualised, so target firms that cannot get a
          facility. The expected-loss reserve covers only 0.33% of principal, so diversification is
          essential. If the platform alone bore all loss, break-even default rate is about 1.7% of
          invoices.
          <p className="mt-3 text-xs text-slate-500">
            Investor return is not promised. It is the invoice discount minus losses. Legal
            structure (receivable purchase or loan notes) needs an FCA-authorised partner.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link href="/dashboard" className="inline-block rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500">
            Run this pricing engine on a live demo invoice →
          </Link>
        </div>
      </Section>

      {/* SLIDE 7 - APPENDIX */}
      <Section>
        <Kicker>Slide 7 · Appendix</Kicker>
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950">Pricing rule, API status, assumptions and sources.</h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">A1. Pricing rule</h3>
            <p className="mt-2 font-mono text-sm text-indigo-700">X ≥ Y + F + D + M</p>
            <p className="mt-2 text-xs text-slate-500">X = SME fee, Y = investor return, F = platform cost, D = expected loss, M = margin.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">A2. PayPal API status</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li><Pill tone="emerald">Verified</Pill> create/send/remind invoice, record external payment, partial-paid status</li>
              <li className="mt-2"><Pill tone="amber">Documented, not fully checked</Pill> Payouts, GBP/UK recipient support, webhooks</li>
              <li className="mt-2"><Pill tone="rose">Unverified</Pill> invoicing webhook event names, UK fee schedule, lending-flow permission</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">A3. Assumptions to replace with partner quotes</h3>
            <p className="mt-2 text-sm text-slate-700">3% fee, 10% investor yield, 2% loss, £15 cost, 85% advance, 20% concentration cap.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">A5. Demo scope</h3>
            <p className="mt-2 text-sm text-slate-700">PayPal sandbox, simulated pool, no real money.</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-xs text-slate-500">
          <strong>A4. Sources:</strong> DBT/OSBC London Economics (Jul 2025), R3 Q1 2026,
          FreeAgent, Spark Finance, law-firm summaries of the Commercial Payments Bill, PayPal
          developer docs and fee schedule.
        </div>
      </Section>

      <Section className="border-t border-slate-200">
        <div className="rounded-3xl bg-slate-900 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold">See the whole flow end to end</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Create an invoice, score it with the explainable AI model, confirm it as the buyer,
            fund it from the simulated pool, and record the repayment — all in the live demo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Open SME dashboard
            </Link>
            <Link href="/pool" className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Open investor pool
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
