import type { Metadata } from "next";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";

export const metadata: Metadata = {
  title: "Inställningar — Kvitty",
};

export default async function SettingsPage({
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

  return <GeneralSettingsForm workspace={workspace} />;
}

