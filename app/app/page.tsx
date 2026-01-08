import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserCookieServer } from "@/lib/user-cookie.server";

export const metadata: Metadata = {
  title: "App — Kvitty",
};

export default async function AppPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, session.user.id),
    with: {
      workspace: true,
    },
  });

  if (memberships.length > 0) {
    // Try to get workspace from cookie
    const cookieData = await getUserCookieServer();

    if (cookieData?.slug) {
      // Check if user has access to the cookie workspace
      const cookieWorkspace = memberships.find(
        m => m.workspace.slug === cookieData.slug
      );

      if (cookieWorkspace) {
        redirect(`/${cookieWorkspace.workspace.slug}`);
      }
    }

    // Fallback to first workspace
    redirect(`/${memberships[0].workspace.slug}`);
  }

  redirect("/onboarding");
}


