import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";

export const metadata: Metadata = {
  title: "Ny arbetsyta — Kvitty",
};

export default async function NewWorkspacePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <CreateWorkspaceForm />
    </div>
  );
}
