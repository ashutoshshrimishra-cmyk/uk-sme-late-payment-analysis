import LoginForm from "@/components/LoginForm";
import { isRole } from "@/lib/roles";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; role?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      denied={params.denied === "1"}
      initialRole={isRole(params.role) ? params.role : "sme"}
    />
  );
}
