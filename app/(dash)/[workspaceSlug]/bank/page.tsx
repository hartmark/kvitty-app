import type { Metadata } from "next";
import { BankPageClient } from "@/components/bank/bank-page-client";

export const metadata: Metadata = {
  title: "Bankkonton — Kvitty",
};

export default async function BankPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <BankPageClient workspaceSlug={workspaceSlug} />;
}
