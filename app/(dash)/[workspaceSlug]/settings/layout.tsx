import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsSidebarNav } from "@/components/settings/settings-sidebar-nav";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { workspaceSlug } = await params;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, workspaceSlug),
  });

  if (!workspace) {
    notFound();
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspace.id),
      eq(workspaceMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        currentPage="Inställningar"
      />
      <div className="flex flex-1 flex-col lg:flex-row gap-6 p-4 pt-0">
        <aside className="lg:w-56 shrink-0">
          <SettingsSidebarNav workspaceSlug={workspaceSlug} />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </>
  );
}
