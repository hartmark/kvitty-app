import type { Metadata } from "next";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TaxSettingsForm } from "@/components/settings/tax-settings-form";

export const metadata: Metadata = {
  title: "Moms & skatt — Kvitty",
};

export default async function TaxSettingsPage({
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

  return <TaxSettingsForm workspace={workspace} />;
}
