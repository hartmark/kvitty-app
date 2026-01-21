import type { Metadata } from "next";
import { PersonalPageClient } from "@/components/employees/personal-page-client";

export const metadata: Metadata = {
  title: "Personal — Kvitty",
};

export default async function PersonalPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <PersonalPageClient workspaceSlug={workspaceSlug} />;
}
