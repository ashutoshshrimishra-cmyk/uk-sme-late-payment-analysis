import Link from "next/link";

const figures = [
    { value: "£11bn", label: "Late-payment cost to the UK economy", note: "Modelled estimate" },
    { value: "28%", label: "of UK businesses affected each year", note: "1.5m+ firms" },
    { value: "17.48m", label: "Overdue invoices in Q1 2026", note: "+3% YoY" },
    { value: "24–48", unit: "h", label: "Target advance time", note: "vs 30–90 day payment" },
];

export default function HomePage() {
    return (
        <div className="pitch-page relative isolate flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-emerald-700/70 via-teal-700/60 to-sky-800/60 text-white">
            <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
            <nav className="relative z-20 w-full px-6 pb-4 pt-8 md:px-12 xl:px-20">
                <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black text-white">
                    <span>Fast</span>
                    <span className="font-bold text-white/80">Finance</span>
                    <span className="ml-1 rounded-md bg-white px-2 py-1 text-xs font-bold text-blue-700">UK</span>
                </Link>
            </nav>

            <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center gap-12 px-6 pb-16 pt-8 md:px-12 lg:flex-row lg:items-start lg:gap-8 lg:pt-10 xl:px-20">
                <section className="hero relative z-10 flex w-full flex-col justify-center pt-4 lg:w-3/5 lg:pt-8">
                    <h1 className="font-display mb-6 max-w-3xl select-none text-4xl font-bold uppercase leading-tight tracking-normal text-white sm:text-5xl lg:text-6xl">
                        SME Working<br />Capital
                    </h1>

                    <p className="mb-10 max-w-xl select-none text-base font-medium text-white/90 sm:text-lg">
                        Faster cash for SMEs when buyers pay late.
                    </p>

                    <div className="relative z-20 mb-10 flex flex-col gap-3 items-center sm:flex-row">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-semibold uppercase tracking-wide text-white bg-white/15 border border-white/60 backdrop-blur-sm hover:bg-white/25 transition-colors duration-200"
                        >
                            Open SME dashboard
                        </Link>
                        <Link
                            href="/pool"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-semibold uppercase tracking-wide text-white bg-white/15 border border-white/60 backdrop-blur-sm hover:bg-white/25 transition-colors duration-200"
                        >
                            View investor pool
                        </Link>
                    </div>

                    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[560px] lg:mx-0">
                        <div className="relative aspect-[16/10] w-full rounded-t-2xl bg-gray-900 p-2">
                            <div className="relative h-full w-full overflow-hidden rounded-sm bg-slate-200">
                                <div className="absolute left-0 top-0 h-full w-0 animate-[sweep_6s_ease-in-out_forwards] overflow-hidden motion-reduce:w-full">
                                    <div className="absolute inset-y-0 left-0 w-[calc(100%/var(--p,1))]" />
                                    <div className="relative h-full w-[324px] overflow-hidden bg-slate-50 p-2 text-slate-800 sm:w-[544px] sm:p-4">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 sm:pb-2">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="grid h-4 w-4 place-items-center rounded bg-emerald-700 text-[7px] font-bold text-white sm:h-7 sm:w-7 sm:text-xs">F</div>
                                                <div>
                                                    <p className="text-[5px] font-semibold uppercase text-slate-500 sm:text-[8px]">Fast Finance</p>
                                                    <p className="text-[8px] font-semibold sm:text-sm">Account overview</p>
                                                </div>
                                            </div>
                                            <div className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[5px] text-slate-500 sm:px-2 sm:text-[8px]">15 Oct 2026 · GBP</div>
                                        </div>

                                        <div className="mt-1.5 grid grid-cols-3 gap-1 sm:mt-3 sm:gap-2">
                                            <div className="rounded border border-slate-200 bg-white p-1 sm:p-2">
                                                <p className="text-[5px] text-slate-500 sm:text-[8px]">Available balance</p>
                                                <p className="mt-0.5 text-[8px] font-bold sm:text-sm">£24,680</p>
                                                <p className="text-[5px] text-emerald-700 sm:text-[8px]">+8.4% this month</p>
                                            </div>
                                            <div className="rounded border border-slate-200 bg-white p-1 sm:p-2">
                                                <p className="text-[5px] text-slate-500 sm:text-[8px]">Outstanding</p>
                                                <p className="mt-0.5 text-[8px] font-bold sm:text-sm">£12,450</p>
                                                <p className="text-[5px] text-slate-500 sm:text-[8px]">6 invoices</p>
                                            </div>
                                            <div className="rounded border border-slate-200 bg-white p-1 sm:p-2">
                                                <p className="text-[5px] text-slate-500 sm:text-[8px]">Due this week</p>
                                                <p className="mt-0.5 text-[8px] font-bold sm:text-sm">£6,800</p>
                                                <p className="text-[5px] text-amber-700 sm:text-[8px]">3 invoices</p>
                                            </div>
                                        </div>

                                        <div className="mt-1.5 grid h-[70px] grid-cols-[1.6fr_1fr] gap-1 sm:mt-2 sm:h-[120px] sm:gap-2">
                                            <div className="rounded border border-slate-200 bg-white p-1 sm:p-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[6px] font-semibold sm:text-[10px]">Cash flow</p>
                                                    <p className="text-[5px] text-slate-400 sm:text-[8px]">Last 30 days</p>
                                                </div>
                                                <div className="mt-1 flex h-[35px] items-end gap-1 sm:h-[72px]">
                                                    {[35, 48, 42, 62, 55, 72, 58, 82, 68, 92, 76, 100].map((height, index) => (
                                                        <div key={index} className="flex-1 rounded-t-[1px] bg-emerald-600" style={{ height: `${height}%` }} />
                                                    ))}
                                                </div>
                                                <div className="mt-0.5 flex justify-between text-[5px] text-slate-400 sm:text-[7px]">
                                                    <span>16 Sep</span><span>30 Sep</span><span>15 Oct</span>
                                                </div>
                                            </div>
                                            <div className="rounded border border-slate-200 bg-white p-1 sm:p-2">
                                                <p className="text-[6px] font-semibold sm:text-[10px]">Invoice status</p>
                                                <div className="mt-1 space-y-1 text-[5px] sm:mt-2 sm:space-y-2 sm:text-[8px]">
                                                    <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-semibold text-emerald-700">12</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Pending</span><span className="font-semibold text-amber-700">6</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Overdue</span><span className="font-semibold text-rose-700">2</span></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-1.5 rounded border border-slate-200 bg-white p-1 sm:mt-2 sm:p-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[6px] font-semibold sm:text-[10px]">Recent invoices</p>
                                                <p className="text-[5px] text-emerald-700 sm:text-[8px]">View all</p>
                                            </div>
                                            <div className="mt-1 flex justify-between border-t border-slate-100 pt-1 text-[5px] sm:text-[8px]">
                                                <span className="text-slate-600">Riverside Joinery</span><span className="font-semibold">£4,200</span><span className="text-emerald-700">Paid</span>
                                            </div>
                                            <div className="mt-0.5 flex justify-between text-[5px] sm:text-[8px]">
                                                <span className="text-slate-600">Northstar Supplies</span><span className="font-semibold">£2,600</span><span className="text-amber-700">Pending</span>
                                            </div>
                                        </div>
                                        <div className="group absolute right-0 top-0 z-10 h-full w-[120px] animate-[fadeOut_0.8s_ease-in_6s_forwards] sm:w-[160px]">
                                            <div className="absolute inset-y-0 left-0 right-0 overflow-hidden rounded-l-md bg-slate-50 px-1.5 pb-4 pt-5 text-slate-800 sm:px-2 sm:pt-6">
                                                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="grid h-3 w-3 place-items-center rounded-sm bg-emerald-700 text-[5px] font-bold text-white sm:h-4 sm:w-4 sm:text-[7px]">F</span>
                                                        <span className="text-[6px] font-semibold sm:text-[8px]">Overview</span>
                                                    </div>
                                                    <span className="h-1 w-1 rounded-full bg-emerald-600" />
                                                </div>

                                                <div className="mt-1.5">
                                                    <p className="text-[5px] text-slate-500 sm:text-[7px]">Available balance</p>
                                                    <p className="text-[11px] font-bold sm:text-sm">£24,680</p>
                                                    <p className="text-[5px] font-medium text-emerald-700 sm:text-[7px]">+8.4% this month</p>
                                                </div>

                                                <div className="mt-1.5 rounded border border-slate-200 bg-white p-1 sm:mt-2 sm:p-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[5px] font-semibold sm:text-[7px]">Cash flow</span>
                                                        <span className="text-[4px] text-slate-400 sm:text-[6px]">30 days</span>
                                                    </div>
                                                    <div className="mt-1 flex h-7 items-end gap-0.5 sm:h-10 sm:gap-1">
                                                        {[35, 48, 42, 62, 55, 72, 58, 82, 68, 92, 76, 100].map((height, index) => (
                                                            <div key={index} className="flex-1 rounded-t-[1px] bg-emerald-600" style={{ height: `${height}%` }} />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="mt-1.5 rounded border border-slate-200 bg-white p-1 sm:mt-2 sm:p-1.5">
                                                    <div className="flex items-center justify-between text-[5px] sm:text-[7px]">
                                                        <span className="text-slate-500">Due this week</span>
                                                        <span className="font-semibold text-slate-800">£6,800</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-[5px] sm:text-[7px]">
                                                        <span className="text-slate-500">Open invoices</span>
                                                        <span className="font-semibold text-slate-800">6</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 rounded-l-lg rounded-r-none border-[3px] border-r-0 border-gray-900 transition-colors duration-200 group-hover:border-[#C9A227] group-hover:shadow-[0_0_20px_rgba(201,162,39,0.35)]" />
                                            <div className="absolute left-1/2 top-1.5 h-3 w-10 -translate-x-1/2 rounded-full bg-gray-900" />
                                            <div className="absolute bottom-1.5 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-gray-900/70" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative mx-auto h-3 w-full rounded-b-2xl bg-gray-800 shadow-xl">
                            <div className="absolute left-1/2 top-0 h-1 w-20 -translate-x-1/2 rounded-b bg-gray-600" />
                        </div>
                    </div>
                </section>

                <section className="relative z-30 flex w-full justify-center lg:w-2/5 lg:justify-end lg:pt-12">
                    <div className="w-full max-w-md select-none space-y-5 rounded-2xl border border-slate-200/60 bg-white p-5 text-slate-900 shadow-lg sm:p-6">
                        <section className="space-y-5">
                            <h2 className="font-display text-lg font-semibold tracking-normal text-slate-900 sm:text-xl">Why this matters</h2>
                            <p className="text-sm leading-relaxed text-slate-600">
                                Don&apos;t wait 90 days to be paid. Unlock cash from unpaid invoices, with no lock-ins or minimum fees.
                            </p>
                        </section>

                        <hr className="border-slate-100" />

                        <section className="space-y-5">
                            <h2 className="font-display text-lg font-semibold tracking-normal text-slate-900 sm:text-xl">How the app works</h2>
                            <ol className="space-y-3">
                                {[
                                    "Upload an invoice",
                                    "Get an AI risk score",
                                    "Buyer confirms acceptance",
                                    "Receive funds from the pool",
                                    "Track repayment",
                                ].map((step, index) => (
                                    <li key={step} className="flex items-start gap-3">
                                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-medium text-slate-700">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    </div>
                </section>
            </main>

            <section aria-label="Late-payment figures" className="relative z-20 mt-auto border-t border-white/10 bg-black/20 backdrop-blur-md">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-8 md:grid-cols-4 md:px-12 xl:px-20">
                    {figures.map((figure) => (
                        <div key={figure.label} className="border-l border-white/10 px-4 first:border-l-0 first:pl-0">
                            <div className="font-display mb-1 text-3xl font-bold text-white sm:text-4xl">
                                {figure.value}
                                {figure.unit && <span className="text-xl">{figure.unit}</span>}
                            </div>
                            <div className="text-xs font-medium leading-tight text-white/80 sm:text-sm">
                                {figure.label}
                            </div>
                            <div className="mt-1 text-[10px] uppercase text-white/50">{figure.note}</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}