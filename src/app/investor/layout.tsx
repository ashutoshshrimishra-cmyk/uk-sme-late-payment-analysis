import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import PortalNav from "@/components/PortalNav";
import { getSession } from "@/lib/guard";

export default async function InvestorLayout({ children }: { children: ReactNode }) {
  const role = await getSession();
  if (role !== "investor") redirect("/login?denied=1");

  return (
    <>
      <PortalNav role="investor" />
      {children}
    </>
  );
}
