import type { Metadata } from "next";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SIEImportSection } from "@/components/settings/sie-import-section";

export const metadata: Metadata = {
  title: "Import — Kvitty",
};

export default async function ImportSettingsPage({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import</h1>
        <p className="text-muted-foreground text-sm">
          Importera data från andra system
        </p>
      </div>
      <SIEImportSection workspaceId={workspace.id} workspaceSlug={workspaceSlug} />
    </div>
  );
}
