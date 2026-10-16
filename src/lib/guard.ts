import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, type Role } from "@/lib/roles";
import { readSessionToken } from "@/lib/session";

export async function getSession(): Promise<Role | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireRole(...roles: Role[]) {
  const role = await getSession();
  if (!role) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
    };
  }
  if (!roles.includes(role)) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Not allowed for your role" }, { status: 403 }),
    };
  }
  return { ok: true as const, role };
}
