import { redirect } from "next/navigation";
import { getSession } from "@/lib/guard";
import { ROLE_HOME } from "@/lib/roles";

export default async function LegacyPoolPage() {
  const role = await getSession();
  if (role === "financer") redirect("/financer/pool");
  if (role === "investor") redirect("/investor");
  redirect(role ? ROLE_HOME[role] : "/login?denied=1");
}
