import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { extractInvoiceFromFile } from "@/lib/gemini";
import { signDocToken } from "@/lib/doc-token";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export async function POST(request: Request) {
  const guard = await requireRole("sme");
  if (!guard.ok) return guard.res;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Request must use multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a file in the 'file' field." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return NextResponse.json({ error: "Only PDF, PNG, and JPG files are supported." }, { status: 415 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "The uploaded file must be 5 MB or smaller." }, { status: 413 });
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const result = await extractInvoiceFromFile(fileBuffer, file.type.toLowerCase());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

    let docToken: string;
    try {
      docToken = signDocToken({
        buyerName: result.data.buyerName,
        supplierName: result.data.supplierName,
        amount: result.data.amount,
        currency: result.data.currency,
        dueDate: result.data.dueDate,
        fileSha256: createHash("sha256").update(fileBuffer).digest("hex"),
        live: result.source === "gemini",
      });
    } catch {
      return NextResponse.json({ error: "Document verification is unavailable." }, { status: 503 });
    }

    return NextResponse.json({ extracted: result.data, source: result.source, docToken });
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded file." }, { status: 400 });
  }
}