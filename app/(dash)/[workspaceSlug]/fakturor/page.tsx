import type { Metadata } from "next";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";

export const metadata: Metadata = {
  title: "Fakturor — Kvitty",
};

interface InvoicesPageProps {
  searchParams: Promise<{
    customerId?: string;
    newInvoice?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  return (
    <InvoicesPageClient
      initialCustomerId={params.customerId}
      initialCreateOpen={params.newInvoice === "true"}
    />
  );
}
