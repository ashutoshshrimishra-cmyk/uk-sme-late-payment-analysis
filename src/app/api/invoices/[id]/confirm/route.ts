import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, _context: { params: Promise<{ id: string }> }) {
  const g = await requireRole("financer");
  if (!g.ok) return g.res;

  return NextResponse.json(
    { error: "Buyer acceptance must be completed using the invoice acceptance link." },
    { status: 410 },
  );
}
