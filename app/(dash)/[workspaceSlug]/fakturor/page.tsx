import type { Metadata } from "next";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";

export const metadata: Metadata = {
  title: "Fakturor — Kvitty",
};

export default async function InvoicesPage() {
  return <InvoicesPageClient />;
}
