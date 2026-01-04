import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { workspaceMembers, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata: Metadata = {
  title: "Välkommen — Kvitty",
};

export default async function OnboardingPage() {
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
    redirect(`/${memberships[0].workspace.slug}`);
  }

  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <OnboardingForm
        initialName={session.user.name ?? ""}
        email={session.user.email}
        initialPhone={userData?.phone ?? ""}
      />
    </div>
  );
}

