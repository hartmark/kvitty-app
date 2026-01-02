import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getSession();
    if (session) {
      redirect("/app");
    }
  } catch (error) {
    // If session validation fails (e.g., invalid cookie), allow access to auth pages
  }

  return <>{children}</>;
}

