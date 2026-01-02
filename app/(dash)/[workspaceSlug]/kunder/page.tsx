import type { Metadata } from "next";
import { CustomersPageClient } from "@/components/customers/customers-page-client";

export const metadata: Metadata = {
  title: "Kunder — Kvitty",
};

export default async function CustomersPage() {
  return <CustomersPageClient />;
}
