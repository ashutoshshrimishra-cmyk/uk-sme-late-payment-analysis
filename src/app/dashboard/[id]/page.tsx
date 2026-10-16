import { redirect } from "next/navigation";
import { getSession } from "@/lib/guard";
import { ROLE_HOME } from "@/lib/roles";

export default async function LegacyInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const role = await getSession();
  if (!role) redirect("/login?denied=1");
  redirect(role === "financer" ? `/financer/invoices/${id}` : role === "sme" ? `/sme/invoices/${id}` : ROLE_HOME[role]);
}
