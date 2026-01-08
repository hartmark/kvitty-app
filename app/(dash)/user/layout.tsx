import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaceMembers, fiscalPeriods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { getUserCookieServer } from "@/lib/user-cookie.server";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Get all user's workspaces
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, session.user.id),
    with: {
      workspace: true,
    },
  });

  if (memberships.length === 0) {
    redirect("/");
  }

  const userWorkspaces = memberships.map((m) => m.workspace);

  // Try to get workspace from cookie
  let currentWorkspace = userWorkspaces[0]; // Default fallback

  const cookieData = await getUserCookieServer();
  if (cookieData?.slug) {
    // Check if user has access to the cookie workspace
    const cookieWorkspace = userWorkspaces.find(
      w => w.slug === cookieData.slug
    );

    if (cookieWorkspace) {
      currentWorkspace = cookieWorkspace;
    }
  }

  // Get periods for the current workspace
  const periods = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.workspaceId, currentWorkspace.id),
    orderBy: (periods, { desc }) => [desc(periods.startDate)],
  });

  return (
    <WorkspaceProvider workspace={currentWorkspace} periods={periods}>
      <AppSidebar
        workspace={currentWorkspace}
        workspaces={userWorkspaces}
        periods={periods}
        user={session.user}
      />
      <SidebarInset>
        {children}
      </SidebarInset>
    </WorkspaceProvider>
  );
}
