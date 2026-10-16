import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { assertSessionConfiguration, createSessionToken } from "@/lib/session";
import { isRole, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/roles";

function passcodeMatches(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return providedBytes.byteLength === expectedBytes.byteLength
    && timingSafeEqual(providedBytes, expectedBytes);
}

export async function POST(request: Request) {
  let body: { role?: unknown; passcode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRole(body.role) || typeof body.passcode !== "string") {
    return NextResponse.json({ error: "Choose a role and enter its passcode" }, { status: 400 });
  }

  try {
    assertSessionConfiguration();
  } catch {
    return NextResponse.json({ error: "Login is not configured correctly" }, { status: 500 });
  }

  const passcodeName = {
    sme: "SME_PASSCODE",
    financer: "FINANCER_PASSCODE",
    investor: "INVESTOR_PASSCODE",
  } satisfies Record<typeof body.role, string>;
  const expected = process.env[passcodeName[body.role]];
  if (!expected || !passcodeMatches(body.passcode, expected)) {
    return NextResponse.json({ error: "Invalid role or passcode" }, { status: 401 });
  }

  let token: string;
  try {
    token = await createSessionToken(body.role);
  } catch {
    return NextResponse.json({ error: "Login is not configured correctly" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, role: body.role });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
