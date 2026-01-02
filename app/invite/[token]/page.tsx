import type { Metadata } from "next";
import { InvitePageClient } from "@/components/invite/invite-page-client";

export const metadata: Metadata = {
  title: "Inbjudan — Kvitty",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InvitePageClient token={token} />;
}
