import type { Metadata } from "next";
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client";

export const metadata: Metadata = {
  title: "Transaktioner — Kvitty",
};

export default async function TransactionsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  return <TransactionsPageClient workspaceSlug={workspaceSlug} />;
}
