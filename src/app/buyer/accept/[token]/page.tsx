import BuyerAcceptance from "@/components/BuyerAcceptance";

export default async function BuyerAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <BuyerAcceptance token={token} />;
}
