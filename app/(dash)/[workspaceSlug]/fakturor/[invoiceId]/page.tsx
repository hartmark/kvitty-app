import type { Metadata } from "next";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

export const metadata: Metadata = {
  title: "Faktura — Kvitty",
};

interface InvoiceDetailPageProps {
  params: Promise<{ workspaceSlug: string; invoiceId: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { invoiceId } = await params;
  return <InvoiceDetailClient invoiceId={invoiceId} />;
}
