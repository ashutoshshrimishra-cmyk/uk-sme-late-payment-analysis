import { redirect } from "next/navigation";
import { getSession } from "@/lib/guard";
import { ROLE_HOME } from "@/lib/roles";

export default async function LegacyDashboardPage() {
  const role = await getSession();
  redirect(role ? ROLE_HOME[role] : "/login?denied=1");
}
