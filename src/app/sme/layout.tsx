import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import PortalNav from "@/components/PortalNav";
import { getSession } from "@/lib/guard";

export default async function SmeLayout({ children }: { children: ReactNode }) {
  const role = await getSession();
  if (role !== "sme") redirect("/login?denied=1");

  return (
    <>
      <PortalNav role="sme" />
      {children}
    </>
  );
}
