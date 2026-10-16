import InvoiceDetail from "@/components/InvoiceDetail";

export default async function FinancerInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetail invoiceId={id} showActions />;
}
