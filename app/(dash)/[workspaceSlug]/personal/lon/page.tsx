import type { Metadata } from "next";
import { PayrollPageClient } from "@/components/payroll/payroll-page-client";

export const metadata: Metadata = {
  title: "Lönekörningar — Kvitty",
};

export default async function PayrollPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <PayrollPageClient workspaceSlug={workspaceSlug} />;
}
