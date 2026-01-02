import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountDetailClient } from "@/components/bank/account-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; accountNumber: string }>;
}): Promise<Metadata> {
  const { accountNumber } = await params;
  return {
    title: `Konto ${accountNumber} - Bankkonton — Kvitty`,
  };
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; accountNumber: string }>;
}) {
  const { workspaceSlug, accountNumber } = await params;
  const accountNumberInt = parseInt(accountNumber, 10);

  if (isNaN(accountNumberInt)) {
    notFound();
  }

  return <AccountDetailClient accountNumber={accountNumberInt} workspaceSlug={workspaceSlug} />;
}

