import type { Metadata } from "next";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PaymentSettingsForm } from "@/components/settings/payment-settings-form";

export const metadata: Metadata = {
  title: "Betalningsinställningar — Kvitty",
};

export default async function PaymentSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, workspaceSlug),
  });

  if (!workspace) {
    return null;
  }

  return <PaymentSettingsForm workspace={workspace} />;
}
