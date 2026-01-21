import type { Metadata } from "next";
import { PayrollRunPageClient } from "@/components/payroll/payroll-run-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; runId: string }>;
}): Promise<Metadata> {
  return {
    title: "Lönekörning — Kvitty",
  };
}

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; runId: string }>;
}) {
  const { workspaceSlug, runId } = await params;
  return <PayrollRunPageClient runId={runId} workspaceSlug={workspaceSlug} />;
}
