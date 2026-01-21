import type { Metadata } from "next";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { RulesList } from "@/components/categorization-rules/rules-list";

export const metadata: Metadata = {
  title: "Kategoriseringsregler — Kvitty",
};

export default async function CategorizationRulesPage({
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
        <h1 className="text-2xl font-bold">Kategoriseringsregler</h1>
        <p className="text-muted-foreground text-sm">
          Skapa regler för att automatiskt kategorisera banktransaktioner
        </p>
      </div>
      <RulesList workspaceId={workspace.id} />
    </div>
  );
}
