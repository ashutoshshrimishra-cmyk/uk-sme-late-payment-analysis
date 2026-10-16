import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/roles";
import { readSessionToken } from "@/lib/session";

const ROUTE_ROLES = [
  { prefix: "/sme", role: "sme" },
  { prefix: "/financer", role: "financer" },
  { prefix: "/investor", role: "investor" },
] as const;

export async function proxy(request: NextRequest) {
  const route = ROUTE_ROLES.find(({ prefix }) =>
    request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
  );
  if (!route) return NextResponse.next();

  const role = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (role === route.role) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("denied", "1");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/sme/:path*", "/financer/:path*", "/investor/:path*"],
};
